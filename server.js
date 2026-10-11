const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const fs = require('fs');

app.use(cors());
// Həm public qovluğunu, həm də əsas qovluğu dəstəkləyir
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  const p1 = path.join(__dirname, 'public', 'index.html');
  const p2 = path.join(__dirname, 'index.html');
  if (fs.existsSync(p1)) return res.sendFile(p1);
  if (fs.existsSync(p2)) return res.sendFile(p2);
  res.send('<h1>Kino Otağı Serveri İşləyir</h1>');
});

// Otaqların yaddaşda saxlanması
// rooms[roomId] = {
//    users: { [socketId]: { username, isHost } },
//    videoState: { type: 'youtube' | 'direct' | 'stream', url: '', isPlaying: false, time: 0, lastUpdate: Date.now() }
// }
const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUsername = null;

  // Otağa qoşulma
  socket.on('join-room', ({ roomId, username }) => {
    currentRoom = roomId;
    currentUsername = username || 'Qonaq';
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        users: {},
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
    rooms[roomId].users[socket.id] = {
      username: currentUsername,
      isHost: isHost
    };

    // İstifadəçiyə mövcud otaq vəziyyətini göndər
    socket.emit('room-joined', {
      roomId,
      isHost,
      users: rooms[roomId].users,
      videoState: rooms[roomId].videoState,
      watchlist: rooms[roomId].watchlist || [],
      history: rooms[roomId].history || []
    });

    // Otaqdakı digər istifadəçilərə xəbər ver
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      username: currentUsername,
      isHost,
      users: rooms[roomId].users
    });

    console.log(`[+] ${currentUsername} joined room: ${roomId} (Host: ${isHost})`);
  });

  // Video dəyişdirilməsi (YouTube linki, birbaşa video və ya Tab yayımı)
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

  // Video hərəkətləri (Play, Pause, Seek)
  socket.on('video-action', ({ action, time }) => {
    if (!currentRoom || !rooms[currentRoom]) return;

    const state = rooms[currentRoom].videoState;
    state.time = time;
    state.lastUpdate = Date.now();
    state.isPlaying = (action === 'play');

    // Göndərən xaric digər istifadəçilərə ötür
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
      addedBy: currentUsername
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

  // History / Xatirə Arxivi
  socket.on('history-add', (entry) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const record = {
      id: Date.now(),
      title: entry.title,
      rating: entry.rating || 10,
      note: entry.note || '',
      date: new Date().toLocaleDateString('az-AZ'),
      addedBy: currentUsername
    };
    rooms[currentRoom].history.unshift(record);
    io.to(currentRoom).emit('history-updated', rooms[currentRoom].history);
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
        // Əgər Host çıxıbsa, digər nəfəri Host et
        const nextHostId = remainingUsers[0];
        rooms[currentRoom].users[nextHostId].isHost = true;

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
