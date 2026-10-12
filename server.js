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
// Əsas qovluq birinci gəlir (GitHub-a birbaşa atılan fayllar dərhal aktiv olsun)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

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

// 1. Otağın Mövcudluğunu Yoxlamaq (API)
app.get('/api/rooms/check/:roomId', (req, res) => {
  const rId = (req.params.roomId || '').toLowerCase();
  res.json({ exists: !!rooms[rId] });
});

// 1.3 Google Hesabı ilə Daxil Ol (Google GIS OAuth)
app.post('/api/auth/google', (req, res) => {
  let { email, name, picture, sub, credential } = req.body;

  // Əgər credential (JWT) göndərilibsə amma email/name yoxdursa, JWT payload-dan çıxar
  if (credential && (!email || !name)) {
    try {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.email) email = payload.email;
        if (payload.name) name = payload.name;
        if (payload.picture) picture = payload.picture;
        if (payload.sub) sub = payload.sub;
      }
    } catch (e) {
      console.warn('JWT oxunma xətası:', e);
    }
  }

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
  const pRoot = path.join(__dirname, 'index.html');
  const pPublic = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(pRoot)) return res.sendFile(pRoot);
  if (fs.existsSync(pPublic)) return res.sendFile(pPublic);
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

  // Otağın mövcudluğunu yoxla (Socket callback)
  socket.on('check-room', ({ roomId }, callback) => {
    const rId = (roomId || '').toLowerCase();
    if (typeof callback === 'function') {
      callback({ exists: !!rooms[rId] });
    }
  });

  // Otağa qoşulma
  socket.on('join-room', ({ roomId, username, avatar, authUserId, isGoogleAuth, initialTheme }) => {
    const rId = (roomId || '').toLowerCase();
    const roomExists = !!rooms[rId];

    // Qayda: Qeydiyyatsız istifadəçilər (Google ilə daxil olmayanlar) YENİ OTAQ YARADA BİLMƏZ!
    // Yalnız mövcud otaqlara qoşula bilərlər.
    if (!roomExists) {
      if (!isGoogleAuth && !authUserId) {
        socket.emit('room-create-denied', {
          message: 'Yeni kino otağı yaratmaq üçün Google hesabı ilə daxil olmalısınız! Qeydiyyatsız yalnız mövcud otaqlara qoşula bilərsiniz.'
        });
        return;
      }
    }

    // Əgər otaq mövcuddursa və kilidlənibsə, icazə yoxla
    if (roomExists && rooms[rId].isLocked) {
      const isAllowed = rooms[rId].allowedUsers && (rooms[rId].allowedUsers[socket.id] || rooms[rId].allowedUsers[authUserId]);
      if (!isAllowed) {
        socket.emit('room-locked-denied', {
          message: '🔒 Bu otaq rəhbər tərəfindən kilidlənib. Yalnız otaq sahibinin icazəsi ilə daxil olmaq olar.'
        });
        return;
      }
    }

    currentRoom = rId;
    currentUsername = username || 'Qonaq';
    currentUserAvatar = avatar || '🍿';
    currentUserId = authUserId || ('guest_' + socket.id);
    socket.join(rId);

    if (!rooms[rId]) {
      rooms[rId] = {
        users: {},
        isLocked: false,
        lightsDimmed: false,
        theme: initialTheme || 'theme-netflix',
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

    const isHost = Object.keys(rooms[rId].users).length === 0;
    if (isHost) rooms[rId].hostSocketId = socket.id;

    // Cari istifadəçini icazəlilərə əlavə et
    if (!rooms[rId].allowedUsers) rooms[rId].allowedUsers = {};
    rooms[rId].allowedUsers[socket.id] = true;
    if (authUserId) rooms[rId].allowedUsers[authUserId] = true;

    rooms[rId].users[socket.id] = {
      username: currentUsername,
      avatar: currentUserAvatar,
      isHost: isHost,
      isVoiceActive: false
    };

    // İstifadəçiyə mövcud otaq vəziyyətini göndər
    socket.emit('room-joined', {
      roomId: rId,
      isHost,
      isLocked: rooms[rId].isLocked,
      lightsDimmed: !!rooms[rId].lightsDimmed,
      theme: rooms[rId].theme || 'theme-netflix',
      users: rooms[rId].users,
      videoState: rooms[rId].videoState,
      watchlist: rooms[rId].watchlist || [],
      history: rooms[rId].history || []
    });

    // Otaqdakı digər istifadəçilərə xəbər ver
    socket.to(rId).emit('user-joined', {
      socketId: socket.id,
      username: currentUsername,
      avatar: currentUserAvatar,
      users: rooms[rId].users
    });

    // Bütün otağa ən son iştirakçı siyahısını göndər (Hər kəsin ekranında siyahı dərhal yenilənsin)
    io.to(rId).emit('update-users', rooms[rId].users);

    console.log(`[+] ${currentUsername} (${currentUserAvatar}) joined: ${rId} (Host: ${isHost})`);
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

  // 2.15 Kinoteatr İşıqları (Dim Lights) Sinxronizasiyası
  socket.on('toggle-room-lights', ({ dimmed }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].lightsDimmed = !!dimmed;
    io.to(currentRoom).emit('room-lights-changed', {
      dimmed: rooms[currentRoom].lightsDimmed,
      by: currentUsername
    });
    console.log(`[Lights] Room ${currentRoom} lights dimmed: ${rooms[currentRoom].lightsDimmed} by ${currentUsername}`);
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

  // Otaq Mövzusunun Sinxronlaşdırılması (Theme Sync)
  socket.on('change-room-theme', ({ theme }) => {
    if (!currentRoom || !rooms[currentRoom] || !theme) return;
    rooms[currentRoom].theme = theme;
    socket.to(currentRoom).emit('room-theme-changed', {
      theme,
      changedBy: currentUsername
    });
    console.log(`[Theme] Room ${currentRoom} theme changed to: ${theme} by ${currentUsername}`);
  });

  // WebRTC Səsli Zəng (Mikrofon) Siqnalları
  socket.on('voice-user-state', ({ isVoiceActive }) => {
    if (!currentRoom || !rooms[currentRoom] || !rooms[currentRoom].users[socket.id]) return;
    rooms[currentRoom].users[socket.id].isVoiceActive = !!isVoiceActive;
    io.to(currentRoom).emit('voice-users-updated', rooms[currentRoom].users);
    io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
  });

  socket.on('voice-peer-ready', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('voice-peer-ready', { sender: socket.id, username: currentUsername });
  });

  socket.on('voice-peer-left', () => {
    if (!currentRoom) return;
    if (rooms[currentRoom] && rooms[currentRoom].users[socket.id]) {
      rooms[currentRoom].users[socket.id].isVoiceActive = false;
      io.to(currentRoom).emit('voice-users-updated', rooms[currentRoom].users);
      io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
    }
    socket.to(currentRoom).emit('voice-peer-left', { peerId: socket.id, username: currentUsername });
  });

  socket.on('voice-offer', ({ target, sdp }) => {
    if (!target) return;
    io.to(target).emit('voice-offer', { sender: socket.id, sdp, username: currentUsername });
  });

  socket.on('voice-answer', ({ target, sdp }) => {
    if (!target) return;
    io.to(target).emit('voice-answer', { sender: socket.id, sdp });
  });

  socket.on('voice-ice', ({ target, candidate }) => {
    if (!target) return;
    io.to(target).emit('voice-ice', { sender: socket.id, candidate });
  });

  // Server-Relayed Canlı HD Səs Axını (100% Zəmanətli WebSocket Relay - Heç bir NAT/Firewall bloku olmur)
  socket.on('voice-chunk', (audioBuffer) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('voice-chunk-receive', {
      sender: socket.id,
      username: currentUsername,
      audio: audioBuffer
    });
  });


  // 2.3 İştirakçını Otaqdan Çıxarmaq (Yalnız Host üçün Kick funksiyası)
  socket.on('kick-user', ({ targetSocketId }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const caller = rooms[currentRoom].users[socket.id];
    if (!caller || !caller.isHost) return;
    if (targetSocketId === socket.id) return; // Host özünü ata bilməz

    const targetUser = rooms[currentRoom].users[targetSocketId];
    if (!targetUser) return;

    // Həmin istifadəçiyə otaqdan çıxarıldığını bildir
    io.to(targetSocketId).emit('kicked-from-room', {
      message: 'Otaq rəhbəri tərəfindən otaqdan çıxarıldınız.'
    });

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.leave(currentRoom);
    }

    delete rooms[currentRoom].users[targetSocketId];
    if (rooms[currentRoom].allowedUsers) {
      delete rooms[currentRoom].allowedUsers[targetSocketId];
    }

    io.to(currentRoom).emit('user-left', {
      socketId: targetSocketId,
      username: targetUser.username,
      users: rooms[currentRoom].users,
      kicked: true
    });
    io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
    console.log(`[Kick] Host ${caller.username} kicked ${targetUser.username} from room: ${currentRoom}`);
  });

  // 2.4 Otaqdan İntensional Çıxış (Leave Room)
  socket.on('leave-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      const isHost = rooms[currentRoom].hostSocketId === socket.id || (rooms[currentRoom].users[socket.id] && rooms[currentRoom].users[socket.id].isHost);
      
      if (isHost) {
        // Qayda: Otaq rəhbəri çıxdıqda otaq hər kəs üçün avtomatik bağlanır!
        io.to(currentRoom).emit('room-closed', {
          message: 'Otaq rəhbəri otaqdan çıxdığı üçün kino zalı bağlandı.'
        });
        delete rooms[currentRoom];
        console.log(`[Closed] Host left. Room ${currentRoom} was completely closed.`);
      } else {
        delete rooms[currentRoom].users[socket.id];
        socket.to(currentRoom).emit('voice-peer-left', { peerId: socket.id, username: currentUsername });
        io.to(currentRoom).emit('user-left', {
          socketId: socket.id,
          username: currentUsername,
          users: rooms[currentRoom].users
        });
        io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
        console.log(`[-] Guest ${currentUsername} left room: ${currentRoom}`);
      }

      socket.leave(currentRoom);
      currentRoom = null;
    }
  });

  // Əlaqə kəsildikdə (Disconnect)
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      socket.to(currentRoom).emit('voice-peer-left', { peerId: socket.id, username: currentUsername });
      socket.to(currentRoom).emit('peer-speaking', { socketId: socket.id, isSpeaking: false });

      const isHost = rooms[currentRoom].hostSocketId === socket.id || (rooms[currentRoom].users[socket.id] && rooms[currentRoom].users[socket.id].isHost);

      if (isHost) {
        // Qayda: Otaq rəhbəri çıxdıqda / əlaqəsi kəsildikdə otaq avtomatik bağlanır!
        io.to(currentRoom).emit('room-closed', {
          message: 'Otaq rəhbəri çıxdığı üçün kino zalı avtomatik bağlandı.'
        });
        delete rooms[currentRoom];
        console.log(`[Closed] Host disconnected. Room ${currentRoom} was deleted.`);
      } else {
        delete rooms[currentRoom].users[socket.id];
        const remainingUsers = Object.keys(rooms[currentRoom].users);

        if (remainingUsers.length === 0) {
          delete rooms[currentRoom];
          console.log(`[-] Room ${currentRoom} deleted (empty)`);
        } else {
          io.to(currentRoom).emit('user-left', {
            socketId: socket.id,
            username: currentUsername,
            users: rooms[currentRoom].users
          });
          io.to(currentRoom).emit('update-users', rooms[currentRoom].users);
          console.log(`[-] Guest ${currentUsername} disconnected from room: ${currentRoom}`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Watch Party server işə düşdü: http://localhost:${PORT}`);
});
