const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
// Həm public qovluğunu, həm də əsas qovluğu dəstəkləyir
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ==========================================
// 1. İSTİFADƏÇİ VƏ QEYDİYYAT SİSTEMİ (AUTH DB)
// ==========================================
const USERS_FILE = path.join(__dirname, 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading users.json:', e);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving users.json:', e);
  }
}

let usersDB = loadUsers();

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// 1.1 Yeni Hesab Qeydiyyatı (Register)
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, avatar } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'İstifadəçi adı və şifrə mütləqdir.' });
  }

  const cleanUsername = username.trim();
  const exists = usersDB.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Bu adda istifadəçi artıq mövcuddur.' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const newUser = {
    id: 'u_' + Date.now(),
    username: cleanUsername,
    email: email ? email.trim() : '',
    salt,
    passwordHash,
    avatar: avatar || '🍿',
    createdAt: new Date().toISOString()
  };

  usersDB.push(newUser);
  saveUsers(usersDB);

  res.json({
    success: true,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      avatar: newUser.avatar
    }
  });
});

// 1.2 Daxil Ol (Login)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'İstifadəçi adı və şifrə daxil edin.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const user = usersDB.find(u => u.username.toLowerCase() === cleanUsername || (u.email && u.email.toLowerCase() === cleanUsername));
  if (!user) {
    return res.status(400).json({ error: 'İstifadəçi tapılmadı. Zəhmət olmasa qeydiyyatdan keçin.' });
  }

  if (!user.salt || !user.passwordHash) {
    return res.status(400).json({ error: 'Bu hesab Google ilə yaradılıb. Zəhmət olmasa Google ilə daxil olun.' });
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return res.status(400).json({ error: 'Daxil edilmiş şifrə yanlışdır.' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar
    }
  });
});

// 1.3 Google Hesabı ilə Daxil Ol (Google GIS OAuth)
app.post('/api/auth/google', (req, res) => {
  const { email, name, picture, sub } = req.body;
  if (!email && !name) {
    return res.status(400).json({ error: 'Google hesab məlumatları tələb olunur.' });
  }

  const userEmail = (email || '').toLowerCase();
  let user = usersDB.find(u => (u.email && u.email.toLowerCase() === userEmail) || (u.googleId && u.googleId === sub));

  if (!user) {
    user = {
      id: 'g_' + Date.now(),
      username: name || email.split('@')[0],
      email: userEmail,
      googleId: sub || 'g_' + Date.now(),
      avatar: picture || '🍿',
      createdAt: new Date().toISOString()
    };
    usersDB.push(user);
    saveUsers(usersDB);
  } else {
    if (picture) user.avatar = picture;
    if (name) user.username = name;
    saveUsers(usersDB);
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isGoogle: true
    }
  });
});

app.get('/', (req, res) => {
  const p1 = path.join(__dirname, 'public', 'index.html');
  const p2 = path.join(__dirname, 'index.html');
  if (fs.existsSync(p1)) return res.sendFile(p1);
  if (fs.existsSync(p2)) return res.sendFile(p2);
  res.send('<h1>Kino Otağı Serveri İşləyir</h1>');
});

// ==========================================
// 2. OTAQLAR VƏ REAL-VAXT SİXRONİZASİYASI
// ==========================================
const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUsername = null;
  let currentUserAvatar = '🍿';
  let currentUserId = null;

  // Otağa qoşulma
  socket.on('join-room', ({ roomId, username, avatar, authUserId }) => {
    // Əgər otaq mövcuddursa və kilidlənibsə, icazə yoxla
    if (rooms[roomId] && rooms[roomId].isLocked) {
      const isAllowed = rooms[roomId].allowedUsers && (rooms[roomId].allowedUsers[socket.id] || rooms[roomId].allowedUsers[authUserId]);
      if (!isAllowed) {
        socket.emit('room-locked-denied', {
          message: '🔒 Bu otaq rəhbər tərəfindən kilidlənib. Yalnız otaq sahibinin icazəsi ilə daxil olmaq olar.'
        });
        return;
      }
    }

    currentRoom = roomId;
    currentUsername = username || 'Qonaq';
    currentUserAvatar = avatar || '🍿';
    currentUserId = authUserId || ('guest_' + socket.id);
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: {},
        isLocked: false,
        hostSocketId: socket.id,
        allowedUsers: {},
        videoState: {
          type: 'empty',
          url: '',
          isPlaying: false,
          time: 0,
          lastUpdate: Date.now()
        },
        watchlist: [],
        history: []
      };
    }

    const isHost = Object.keys(rooms[roomId].users).length === 0;
    if (isHost) rooms[roomId].hostSocketId = socket.id;

    // Cari istifadəçini icazəlilərə əlavə et
    if (!rooms[roomId].allowedUsers) rooms[roomId].allowedUsers = {};
    rooms[roomId].allowedUsers[socket.id] = true;
    if (authUserId) rooms[roomId].allowedUsers[authUserId] = true;

    rooms[roomId].users[socket.id] = {
      username: currentUsername,
      avatar: currentUserAvatar,
      isHost: isHost
    };

    // İstifadəçiyə mövcud otaq vəziyyətini göndər
    socket.emit('room-joined', {
      roomId,
      isHost,
      isLocked: rooms[roomId].isLocked,
      users: rooms[roomId].users,
      videoState: rooms[roomId].videoState,
      watchlist: rooms[roomId].watchlist || [],
      history: rooms[roomId].history || []
    });

    // Otaqdakı digər istifadəçilərə xəbər ver
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      username: currentUsername,
      avatar: currentUserAvatar,
      isHost,
      users: rooms[roomId].users
    });

    console.log(`[+] ${currentUsername} (${currentUserAvatar}) joined: ${roomId} (Host: ${isHost})`);
  });

  // 2.1 Otağın Kilidlənməsi / Açılması (Host üçün)
  socket.on('toggle-room-lock', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const user = rooms[currentRoom].users[socket.id];
    if (!user || !user.isHost) return;

    rooms[currentRoom].isLocked = !rooms[currentRoom].isLocked;
    io.to(currentRoom).emit('room-lock-status', {
      isLocked: rooms[currentRoom].isLocked,
      by: user.username
    });
    console.log(`[Lock] Room ${currentRoom} lock changed to: ${rooms[currentRoom].isLocked}`);
  });

  // 2.2 Səsli Danışıq: Kim Danışır (Discord Voice Halo)
  socket.on('user-speaking', ({ isSpeaking }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('peer-speaking', {
      socketId: socket.id,
      isSpeaking
    });
  });

  // 2.3 Video dəyişdirilməsi
  socket.on('change-video', ({ type, url }) => {
    if (!currentRoom || !rooms[currentRoom]) return;

    rooms[currentRoom].videoState = {
      type,
      url,
      isPlaying: true,
      time: 0,
      lastUpdate: Date.now()
    };

    io.to(currentRoom).emit('video-changed', rooms[currentRoom].videoState);
    console.log(`[Video] Room ${currentRoom} switched to ${type}: ${url}`);
  });

  // 2.4 Video hərəkətləri (Play, Pause, Seek)
  socket.on('video-action', ({ action, time }) => {
    if (!currentRoom || !rooms[currentRoom]) return;

    const state = rooms[currentRoom].videoState;
    state.time = time;
    state.lastUpdate = Date.now();
    state.isPlaying = (action === 'play');

    socket.to(currentRoom).emit('video-action', {
      action,
      time,
      sender: currentUsername
    });
  });

  // Sinxronizasiya sorğusu
  socket.on('sync-ping', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    socket.emit('sync-pong', rooms[currentRoom].videoState);
  });

  // Çat mesajı
  socket.on('send-message', ({ text }) => {
    if (!currentRoom || !text) return;
    const msg = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      sender: currentUsername,
      avatar: currentUserAvatar,
      text,
      time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    };
    io.to(currentRoom).emit('receive-message', msg);
  });

  // Uçan reaksiyalar (🍿, 😂, 🔥 və s.)
  socket.on('send-reaction', ({ reaction }) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('receive-reaction', {
      reaction,
      sender: currentUsername
    });
  });

  // Watchlist (Nəyə Baxaq? Püşkatma)
  socket.on('watchlist-add', ({ title }) => {
    if (!currentRoom || !rooms[currentRoom] || !title) return;
    const item = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      addedBy: currentUsername,
      avatar: currentUserAvatar
    };
    rooms[currentRoom].watchlist.push(item);
    io.to(currentRoom).emit('watchlist-updated', rooms[currentRoom].watchlist);
  });

  socket.on('watchlist-remove', ({ id }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].watchlist = rooms[currentRoom].watchlist.filter(i => i.id !== id);
    io.to(currentRoom).emit('watchlist-updated', rooms[currentRoom].watchlist);
  });

  socket.on('watchlist-spin', () => {
    if (!currentRoom || !rooms[currentRoom] || rooms[currentRoom].watchlist.length === 0) return;
    const list = rooms[currentRoom].watchlist;
    const winner = list[Math.floor(Math.random() * list.length)];
    io.to(currentRoom).emit('watchlist-winner', { winner, spinner: currentUsername });
  });

  // History / Xatirə Arxivi & Seans Sonu Qiymətləndirmə
  socket.on('history-add', (entry) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const record = {
      id: Date.now(),
      title: entry.title,
      rating: entry.rating || 10,
      note: entry.note || '',
      date: new Date().toLocaleDateString('az-AZ', { day: 'numeric', month: 'short' }),
      addedBy: currentUsername,
      avatar: currentUserAvatar
    };
    rooms[currentRoom].history.unshift(record);
    io.to(currentRoom).emit('history-updated', rooms[currentRoom].history);
    io.to(currentRoom).emit('movie-review-celebrated', record);
  });

  // WebRTC Siqnalları (Tab / Ekran Paylaşımı üçün)
  socket.on('stream-ready', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('stream-ready', { broadcaster: socket.id });
  });

  socket.on('request-stream', ({ target }) => {
    io.to(target).emit('request-stream', { requester: socket.id });
  });

  socket.on('webrtc-offer', ({ target, sdp }) => {
    io.to(target).emit('webrtc-offer', {
      sender: socket.id,
      sdp
    });
  });

  socket.on('webrtc-answer', ({ target, sdp }) => {
    io.to(target).emit('webrtc-answer', {
      sender: socket.id,
      sdp
    });
  });

  socket.on('webrtc-ice', ({ target, candidate }) => {
    io.to(target).emit('webrtc-ice', {
      sender: socket.id,
      candidate
    });
  });

  // WebRTC Səsli Zəng (Mikrofon) Siqnalları
  socket.on('voice-peer-ready', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('voice-peer-ready', { sender: socket.id, username: currentUsername });
  });

  socket.on('voice-peer-left', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('voice-peer-left', { peerId: socket.id, username: currentUsername });
  });

  socket.on('voice-offer', ({ target, sdp }) => {
    io.to(target).emit('voice-offer', { sender: socket.id, sdp, username: currentUsername });
  });

  socket.on('voice-answer', ({ target, sdp }) => {
    io.to(target).emit('voice-answer', { sender: socket.id, sdp });
  });

  socket.on('voice-ice', ({ target, candidate }) => {
    io.to(target).emit('voice-ice', { sender: socket.id, candidate });
  });

  // Əlaqə kəsildikdə
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      delete rooms[currentRoom].users[socket.id];
      const remainingUsers = Object.keys(rooms[currentRoom].users);

      if (remainingUsers.length === 0) {
        delete rooms[currentRoom];
        console.log(`[-] Room ${currentRoom} deleted (empty)`);
      } else {
        const nextHostId = remainingUsers[0];
        rooms[currentRoom].users[nextHostId].isHost = true;
        rooms[currentRoom].hostSocketId = nextHostId;

        io.to(currentRoom).emit('user-left', {
          socketId: socket.id,
          username: currentUsername,
          users: rooms[currentRoom].users
        });
        console.log(`[-] ${currentUsername} left room: ${currentRoom}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Watch Party server işə düşdü: http://localhost:${PORT}`);
});
