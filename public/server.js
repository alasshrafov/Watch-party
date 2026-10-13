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

// Otaqlar kolleksiyası
const rooms = {};
const roomCleanupTimers = {};

app.use(cors());
app.use(express.json());

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

// ==========================================
// 2. RƏHBƏR VƏ DƏRİN STATİSTİKA SİSTEMİ (ADMIN DB)
// ==========================================
const ADMIN_DATA_FILE = path.join(__dirname, 'admin_stats.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'onecouch2026';
const adminSessions = new Set();
const activeSessions = new Map(); // sessionId -> lastHeartbeatTime
const failedLoginAttempts = new Map(); // ip -> { count, lockedUntil }

function loadAdminData() {
  try {
    if (fs.existsSync(ADMIN_DATA_FILE)) {
      const data = fs.readFileSync(ADMIN_DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.stats) parsed.stats = {};
      if (!parsed.stats.deviceCounts) parsed.stats.deviceCounts = { mobile: 0, desktop: 0 };
      if (!parsed.stats.osCounts) parsed.stats.osCounts = {};
      if (!parsed.stats.browserCounts) parsed.stats.browserCounts = {};
      if (!parsed.stats.peakHours) parsed.stats.peakHours = new Array(24).fill(0);
      if (!parsed.stats.popularVideos) parsed.stats.popularVideos = {};
      if (!parsed.stats.rouletteWins) parsed.stats.rouletteWins = [];
      if (!parsed.stats.uniqueVisitors) parsed.stats.uniqueVisitors = {};
      if (!parsed.roomsHistory) parsed.roomsHistory = [];
      if (!parsed.activityLogs) parsed.activityLogs = [];
      return parsed;
    }
  } catch (e) {
    console.error('Error loading admin_stats.json:', e);
  }
  return {
    stats: {
      totalVisits: 0,
      uniqueVisitors: {},
      appInstalls: 0,
      totalRoomsCreated: 0,
      totalVideosPlayed: 0,
      totalChatMessages: 0,
      totalReactionsSent: 0,
      totalSessionsCount: 0,
      totalSessionDurationSeconds: 0,
      deviceCounts: { mobile: 0, desktop: 0 },
      osCounts: {},
      browserCounts: {},
      peakHours: new Array(24).fill(0),
      popularVideos: {},
      rouletteWins: []
    },
    roomsHistory: [],
    activityLogs: []
  };
}

let adminData = loadAdminData();
let saveAdminTimeout = null;

function saveAdminData() {
  if (saveAdminTimeout) return;
  saveAdminTimeout = setTimeout(() => {
    saveAdminTimeout = null;
    try {
      fs.writeFileSync(ADMIN_DATA_FILE, JSON.stringify(adminData, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving admin_stats.json:', e);
    }
  }, 1200);
}

function logActivity(type, text, details = {}) {
  const item = {
    id: Date.now() + Math.random().toString(36).substr(2, 4),
    time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    type,
    text,
    details
  };
  adminData.activityLogs.unshift(item);
  if (adminData.activityLogs.length > 500) {
    adminData.activityLogs = adminData.activityLogs.slice(0, 500);
  }
  saveAdminData();
}

// Ziyarət və Platforma İzləmə Middleware-i (Daha Dərin Analitika)
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path === '/index.html')) {
    adminData.stats.totalVisits = (adminData.stats.totalVisits || 0) + 1;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isMob = /mobile|android|iphone|ipad|tablet/i.test(ua);
    
    // Cihaz növü
    if (!adminData.stats.deviceCounts) adminData.stats.deviceCounts = { mobile: 0, desktop: 0 };
    if (isMob) {
      adminData.stats.deviceCounts.mobile = (adminData.stats.deviceCounts.mobile || 0) + 1;
    } else {
      adminData.stats.deviceCounts.desktop = (adminData.stats.deviceCounts.desktop || 0) + 1;
    }

    // Əməliyyat sistemi (OS)
    let os = 'Digər';
    if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    if (!adminData.stats.osCounts) adminData.stats.osCounts = {};
    adminData.stats.osCounts[os] = (adminData.stats.osCounts[os] || 0) + 1;

    // Brauzer
    let browser = 'Digər';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    if (!adminData.stats.browserCounts) adminData.stats.browserCounts = {};
    adminData.stats.browserCounts[browser] = (adminData.stats.browserCounts[browser] || 0) + 1;

    // Günün saatı (Peak Hour)
    const hour = new Date().getHours();
    if (!adminData.stats.peakHours || adminData.stats.peakHours.length !== 24) {
      adminData.stats.peakHours = new Array(24).fill(0);
    }
    adminData.stats.peakHours[hour] = (adminData.stats.peakHours[hour] || 0) + 1;

    // Unikal və qayıdan ziyarətçi
    if (!adminData.stats.uniqueVisitors) adminData.stats.uniqueVisitors = {};
    const ipKey = crypto.createHash('md5').update(ip).digest('hex').substring(0, 10);
    if (!adminData.stats.uniqueVisitors[ipKey]) {
      adminData.stats.uniqueVisitors[ipKey] = {
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        visits: 1,
        device: isMob ? 'Mobil' : 'Masaüstü',
        os: os,
        browser: browser
      };
      logActivity('visit', `🌐 Yeni unikal ziyarətçi sayta daxil oldu (${os} / ${browser})`);
    } else {
      adminData.stats.uniqueVisitors[ipKey].visits = (adminData.stats.uniqueVisitors[ipKey].visits || 1) + 1;
      adminData.stats.uniqueVisitors[ipKey].lastSeen = new Date().toISOString();
      adminData.stats.uniqueVisitors[ipKey].os = os;
      adminData.stats.uniqueVisitors[ipKey].browser = browser;
    }
    saveAdminData();
  }
  next();
});

// Statik faylların dərhal və kəsintisiz yenilənməsi üçün ETag və dinamik keş
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.png') || path.endsWith('.svg') || path.endsWith('.json')) {
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    }
  }
}));
app.use(express.static(__dirname, {
  etag: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html') || path.endsWith('manifest.json') || path.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 3. ANALİTİKA VƏ STATİSTİKA API ENDPOINT-LƏRİ
// ==========================================

// PWA / App Quraşdırma Sayğacı
app.post('/api/analytics/install', (req, res) => {
  adminData.stats.appInstalls = (adminData.stats.appInstalls || 0) + 1;
  logActivity('install', '📲 İstifadəçi tətbiqi yüklədi / ana ekrana quraşdırdı (PWA)');
  saveAdminData();
  res.json({ success: true, appInstalls: adminData.stats.appInstalls });
});

// Seans və İstifadə Vaxtı Heartbeat
app.post('/api/analytics/session-heartbeat', (req, res) => {
  const { sessionId, seconds = 30, isPWA, username } = req.body;
  if (!sessionId) return res.json({ ok: false });

  adminData.stats.totalSessionDurationSeconds = (adminData.stats.totalSessionDurationSeconds || 0) + Number(seconds);
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, Date.now());
    adminData.stats.totalSessionsCount = (adminData.stats.totalSessionsCount || 0) + 1;
  } else {
    activeSessions.set(sessionId, Date.now());
  }
  saveAdminData();
  res.json({ ok: true });
});

// İstifadəçi Profilinin İzlənməsi
app.post('/api/analytics/user-profile', (req, res) => {
  const { username, avatar, isPWA } = req.body;
  if (!username) return res.json({ ok: false });

  let user = usersDB.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
  const ua = req.headers['user-agent'] || '';
  const isMob = /mobile|android|iphone/i.test(ua);
  const deviceType = isPWA ? 'Mobil Tətbiq (PWA)' : (isMob ? 'Mobil Brauzer' : 'Masaüstü Kompüter');

  if (!user) {
    user = {
      id: 'usr_' + Date.now(),
      username: username,
      email: '',
      avatar: avatar || '🍿',
      provider: 'Qonaq Profil',
      device: deviceType,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      loginCount: 1
    };
    usersDB.push(user);
    saveUsers(usersDB);
    logActivity('user', `👤 Yeni istifadəçi profili yaradıldı: ${username} (${deviceType})`);
  } else {
    user.lastActive = new Date().toISOString();
    user.loginCount = (user.loginCount || 1) + 1;
    user.device = deviceType;
    if (avatar) user.avatar = avatar;
    saveUsers(usersDB);
  }
  res.json({ ok: true });
});

// Gizli Rəhbər Kodunu Təsdiqləmə (Logo 5-tap üçün)
app.post('/api/admin/verify-secret', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attemptInfo = failedLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (attemptInfo.lockedUntil > now) {
    const remainingMins = Math.ceil((attemptInfo.lockedUntil - now) / 60000);
    return res.status(429).json({ success: false, error: `Çoxsaylı uğursuz cəhd! Zəhmət olmasa ${remainingMins} dəqiqə sonra yenidən yoxlayın.` });
  }

  const { code, password } = req.body;
  const given = (code || password || '').trim();

  if (given === ADMIN_PASSWORD) {
    failedLoginAttempts.delete(ip);
    const token = 'adm_' + crypto.randomBytes(24).toString('hex');
    adminSessions.add(token);
    return res.json({ success: true, token, redirectUrl: '/oc-console-secret-2026' });
  } else {
    attemptInfo.count = (attemptInfo.count || 0) + 1;
    if (attemptInfo.count >= 5) {
      attemptInfo.lockedUntil = now + (15 * 60 * 1000); // 15 dəqiqə blok
    }
    failedLoginAttempts.set(ip, attemptInfo);
    return res.status(401).json({ success: false, error: 'Şifrə yalnışdır!' });
  }
});

// Admin Daxil Olma
app.post('/api/admin/login', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const attemptInfo = failedLoginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  if (attemptInfo.lockedUntil > now) {
    const remainingMins = Math.ceil((attemptInfo.lockedUntil - now) / 60000);
    return res.status(429).json({ success: false, error: `Çoxsaylı uğursuz cəhd! Zəhmət olmasa ${remainingMins} dəqiqə sonra yenidən yoxlayın.` });
  }

  const { password } = req.body;
  if ((password || '').trim() === ADMIN_PASSWORD) {
    failedLoginAttempts.delete(ip);
    const token = 'adm_' + crypto.randomBytes(24).toString('hex');
    adminSessions.add(token);
    return res.json({ success: true, token });
  } else {
    attemptInfo.count = (attemptInfo.count || 0) + 1;
    if (attemptInfo.count >= 5) {
      attemptInfo.lockedUntil = now + (15 * 60 * 1000);
    }
    failedLoginAttempts.set(ip, attemptInfo);
    return res.status(401).json({ success: false, error: 'Şifrə yalnışdır!' });
  }
});

// Admin Məlumatları (Dashboard Data — Tam Dərin Statistika)
app.get('/api/admin/data', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!adminSessions.has(token) && req.query.pass !== ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, error: 'İcazə verilmədi!' });
  }

  // Cari aktiv otaqlar
  const activeRoomsList = Object.keys(rooms).map(rId => {
    const r = rooms[rId];
    return {
      roomId: rId,
      host: (r.users[r.hostSocketId]?.username) || 'Bilinmir',
      usersCount: Object.keys(r.users || {}).length,
      users: Object.values(r.users || {}).map(u => ({ username: u.username, avatar: u.avatar, isHost: u.isHost })),
      videoState: r.videoState,
      isLocked: !!r.isLocked,
      lightsDimmed: !!r.lightsDimmed,
      theme: r.theme
    };
  });

  // Cari onlayn istifadəçi sayı
  let liveOnlineCount = 0;
  Object.values(rooms).forEach(r => {
    liveOnlineCount += Object.keys(r.users || {}).length;
  });

  const now = Date.now();
  let activeHeartbeats = 0;
  for (const [sId, lastTime] of activeSessions.entries()) {
    if (now - lastTime < 90000) activeHeartbeats++;
    else activeSessions.delete(sId);
  }
  liveOnlineCount = Math.max(liveOnlineCount, activeHeartbeats, io.engine.clientsCount || 0);

  // Ortalama istifadə vaxtı (dəqiqə ilə)
  const totalSec = adminData.stats.totalSessionDurationSeconds || 0;
  const sessionCount = Math.max(1, adminData.stats.totalSessionsCount || 1);
  let avgSessionMinutes = Math.round((totalSec / sessionCount) / 60 * 10) / 10;
  if (avgSessionMinutes <= 0) avgSessionMinutes = 8.5;

  // Unikal və qayıdan ziyarətçi sayı
  const visitorsList = Object.values(adminData.stats.uniqueVisitors || {});
  const returningCount = visitorsList.filter(v => v.visits > 1).length;

  // Populyar videoların sıralanması
  const popularVideosList = Object.values(adminData.stats.popularVideos || {})
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  res.json({
    success: true,
    stats: {
      totalVisits: adminData.stats.totalVisits || 0,
      uniqueVisitorsCount: visitorsList.length,
      returningVisitorsCount: returningCount,
      appInstalls: adminData.stats.appInstalls || 0,
      registeredUsersCount: usersDB.length,
      totalRoomsCreated: adminData.stats.totalRoomsCreated || 0,
      totalVideosPlayed: adminData.stats.totalVideosPlayed || 0,
      totalChatMessages: adminData.stats.totalChatMessages || 0,
      totalReactionsSent: adminData.stats.totalReactionsSent || 0,
      activeOnlineNow: liveOnlineCount,
      activeRoomsCount: activeRoomsList.length,
      avgSessionMinutes: avgSessionMinutes,
      totalSessionHours: Math.round((totalSec / 3600) * 10) / 10,
      deviceCounts: adminData.stats.deviceCounts || { mobile: 0, desktop: 0 },
      osCounts: adminData.stats.osCounts || {},
      browserCounts: adminData.stats.browserCounts || {},
      peakHours: adminData.stats.peakHours || new Array(24).fill(0),
      popularVideos: popularVideosList,
      rouletteWins: (adminData.stats.rouletteWins || []).slice(0, 15)
    },
    registeredUsers: usersDB.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email || '',
      avatar: u.avatar || '🍿',
      provider: u.googleId ? 'Google' : (u.provider || 'Qonaq Profil'),
      createdAt: u.createdAt,
      lastActive: u.lastActive || u.createdAt,
      loginCount: u.loginCount || 1,
      device: u.device || 'Naməlum'
    })),
    activeRooms: activeRoomsList,
    roomsHistory: (adminData.roomsHistory || []).slice(0, 60),
    activityLogs: (adminData.activityLogs || []).slice(0, 200)
  });
});

// Açıq /admin sorğularına 404 Qoruması (Yalnız gizli açarla daxil olunduqda açılır)
app.get('/admin', (req, res) => {
  const queryKey = ((req.query.key || req.query.pass || req.query.secret) || '').trim();
  if (queryKey === ADMIN_PASSWORD) {
    const pAdmin = path.join(__dirname, 'admin.html');
    const pPublic = path.join(__dirname, 'public', 'admin.html');
    if (fs.existsSync(pAdmin)) return res.sendFile(pAdmin);
    if (fs.existsSync(pPublic)) return res.sendFile(pPublic);
  }
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="az">
    <head><meta charset="UTF-8"><title>404 Not Found</title></head>
    <body style="background:#080914;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;margin:0;">
      <h1 style="font-size:3rem;margin:0;color:#fff;">404</h1>
      <p style="margin:10px 0 20px 0;">Səhifə tapılmadı və ya mövcud deyil.</p>
      <a href="/" style="color:#7c3aed;text-decoration:none;font-weight:bold;">← Ana Səhifəyə Qayıt</a>
    </body>
    </html>
  `);
});

// Gizli və Şəxsi Rəhbər Konsolu Linkləri (Dedicated Standalone Admin App URLs)
const serveAdminConsole = (req, res) => {
  const pAdmin = path.join(__dirname, 'admin.html');
  const pPublic = path.join(__dirname, 'public', 'admin.html');
  if (fs.existsSync(pAdmin)) return res.sendFile(pAdmin);
  if (fs.existsSync(pPublic)) return res.sendFile(pPublic);
  res.sendFile(path.join(__dirname, 'index.html'));
};

app.get('/oc-console-secret-2026', serveAdminConsole);
app.get('/oc-console', serveAdminConsole);
app.get('/boss', serveAdminConsole);
app.get('/dashboard', serveAdminConsole);

// Otağın Mövcudluğunu Yoxlamaq (API)
app.get('/api/rooms/check/:roomId', (req, res) => {
  const rId = (req.params.roomId || '').toLowerCase();
  res.json({ exists: !!rooms[rId] });
});

// Google Hesabı ilə Daxil Ol (Google GIS OAuth)
app.post('/api/auth/google', (req, res) => {
  let { email, name, picture, sub, credential } = req.body;

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
  const ua = req.headers['user-agent'] || '';
  const isMob = /mobile|android|iphone/i.test(ua);
  const device = isMob ? 'Mobil Telefon' : 'Masaüstü Kompüter';

  if (!user) {
    user = {
      id: 'g_' + Date.now(),
      username: name || email.split('@')[0],
      email: userEmail,
      googleId: sub || 'g_' + Date.now(),
      avatar: picture || '🍿',
      provider: 'Google',
      device: device,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      loginCount: 1
    };
    usersDB.push(user);
    saveUsers(usersDB);
    logActivity('user', `🌟 Yeni istifadəçi Google hesabı ilə qeydiyyatdan keçdi: ${user.username} (${user.email})`);
  } else {
    if (picture) user.avatar = picture;
    if (name) user.username = name;
    user.lastActive = new Date().toISOString();
    user.loginCount = (user.loginCount || 1) + 1;
    user.device = device;
    saveUsers(usersDB);
    logActivity('user', `👤 İstifadəçi Google hesabı ilə daxil oldu: ${user.username}`);
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
// 4. REAL-VAXT SİXRONİZASİYASI VƏ SOCKET.IO
// ==========================================

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUsername = null;
  let currentUserAvatar = '🍿';
  let currentUserId = null;

  // Otağın mövcudluğunu yoxla (Socket callback)
  socket.on('check-room', ({ roomId }, callback) => {
    const rId = (roomId || '').trim().toLowerCase();
    if (typeof callback === 'function') {
      callback({ exists: !!rooms[rId] });
    }
  });

  // Otağa qoşulma
  socket.on('join-room', ({ roomId, username, avatar, authUserId, isGoogleAuth, initialTheme }) => {
    const rId = (roomId || '').trim().toLowerCase();
    if (!rId) return;

    if (roomCleanupTimers[rId]) {
      clearTimeout(roomCleanupTimers[rId]);
      delete roomCleanupTimers[rId];
      console.log(`[Timer Cancelled] Room ${rId} deletion cancelled - user joined.`);
    }

    const roomExists = !!rooms[rId];

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

      // Admin statistikasına yeni otaq qeydiyyatı
      adminData.stats.totalRoomsCreated = (adminData.stats.totalRoomsCreated || 0) + 1;
      adminData.roomsHistory.unshift({
        roomId: rId,
        host: currentUsername,
        createdAt: new Date().toISOString(),
        participants: [currentUsername],
        videos: [],
        chatCount: 0,
        active: true
      });
      if (adminData.roomsHistory.length > 100) adminData.roomsHistory.pop();
      logActivity('room_create', `🎬 ${currentUsername} yeni otaq yaratdı: "${rId}"`);
      saveAdminData();
    } else {
      const hist = adminData.roomsHistory.find(h => h.roomId === rId && h.active);
      if (hist && !hist.participants.includes(currentUsername)) {
        hist.participants.push(currentUsername);
      }
      logActivity('room_join', `👤 ${currentUsername} otağa daxil oldu: "${rId}"`);
      saveAdminData();
    }

    const isHost = (rooms[rId].hostSocketId === socket.id) || (Object.keys(rooms[rId].users).length === 0);
    if (isHost) {
      rooms[rId].hostSocketId = socket.id;
    }

    if (!rooms[rId].allowedUsers) rooms[rId].allowedUsers = {};
    rooms[rId].allowedUsers[socket.id] = true;
    if (authUserId) rooms[rId].allowedUsers[authUserId] = true;

    rooms[rId].users[socket.id] = {
      username: currentUsername,
      avatar: currentUserAvatar,
      isHost: isHost,
      isVoiceActive: false
    };

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

    socket.to(rId).emit('user-joined', {
      socketId: socket.id,
      username: currentUsername,
      avatar: currentUserAvatar,
      users: rooms[rId].users
    });

    io.to(rId).emit('update-users', rooms[rId].users);
    console.log(`[+] ${currentUsername} (${currentUserAvatar}) joined: ${rId} (Host: ${isHost}, Total: ${Object.keys(rooms[rId].users).length})`);
  });

  // Otağın Kilidlənməsi / Açılması (Host üçün)
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

  // Kinoteatr İşıqları (Dim Lights) Sinxronizasiyası
  socket.on('toggle-room-lights', ({ dimmed }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].lightsDimmed = !!dimmed;
    io.to(currentRoom).emit('room-lights-changed', {
      dimmed: rooms[currentRoom].lightsDimmed,
      by: currentUsername
    });
    console.log(`[Lights] Room ${currentRoom} lights dimmed: ${rooms[currentRoom].lightsDimmed} by ${currentUsername}`);
  });

  // Səsli Danışıq: Kim Danışır (Discord Voice Halo)
  socket.on('user-speaking', ({ isSpeaking }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('peer-speaking', {
      socketId: socket.id,
      isSpeaking
    });
  });

  // Video dəyişdirilməsi
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

    // Admin dərin statistikası
    adminData.stats.totalVideosPlayed = (adminData.stats.totalVideosPlayed || 0) + 1;
    const hist = adminData.roomsHistory.find(h => h.roomId === currentRoom && h.active);
    if (hist) {
      hist.videos.push({ type, url: url ? url.substring(0, 80) : '', time: new Date().toLocaleTimeString('az-AZ') });
    }

    if (!adminData.stats.popularVideos) adminData.stats.popularVideos = {};
    const vKey = (url || '').trim();
    if (vKey) {
      if (!adminData.stats.popularVideos[vKey]) {
        adminData.stats.popularVideos[vKey] = { url: vKey, type, count: 1, lastPlayed: new Date().toISOString() };
      } else {
        adminData.stats.popularVideos[vKey].count += 1;
        adminData.stats.popularVideos[vKey].lastPlayed = new Date().toISOString();
      }
    }

    logActivity('video', `▶️ ${currentUsername} otaqda (${currentRoom}) video dəyişdi: ${type.toUpperCase()}`);
    saveAdminData();
  });

  // Video hərəkətləri (Play, Pause, Seek)
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

    adminData.stats.totalChatMessages = (adminData.stats.totalChatMessages || 0) + 1;
    const hist = adminData.roomsHistory.find(h => h.roomId === currentRoom && h.active);
    if (hist) hist.chatCount = (hist.chatCount || 0) + 1;
    saveAdminData();
  });

  // Uçan reaksiyalar (🍿, 😂, 🔥 və s.)
  socket.on('send-reaction', ({ reaction }) => {
    if (!currentRoom) return;
    adminData.stats.totalReactionsSent = (adminData.stats.totalReactionsSent || 0) + 1;
    saveAdminData();
    io.to(currentRoom).emit('receive-reaction', {
      reaction,
      sender: currentUsername
    });
  });

  // Watchlist (Nəyə Baxaq? Püşkatma Ruletkası)
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
    logActivity('roulette', `🎯 ${currentUsername} otaqda (${currentRoom}) ruletkaya film əlavə etdi: "${item.title}"`);
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
    
    if (!adminData.stats.rouletteWins) adminData.stats.rouletteWins = [];
    adminData.stats.rouletteWins.unshift({
      title: winner.title,
      room: currentRoom,
      time: new Date().toLocaleTimeString('az-AZ'),
      spinner: currentUsername
    });
    if (adminData.stats.rouletteWins.length > 50) adminData.stats.rouletteWins.pop();

    logActivity('roulette', `🎡 ${currentUsername} otaqda (${currentRoom}) çarxıfələyi fırlatdı! Qalib: "${winner.title}"`);
    saveAdminData();
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

  // Server-Relayed Canlı HD Səs Axını (WebSocket Relay)
  socket.on('voice-chunk', (audioBuffer) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('voice-chunk-receive', {
      sender: socket.id,
      username: currentUsername,
      audio: audioBuffer
    });
  });

  // İştirakçını Otaqdan Çıxarmaq (Kick)
  socket.on('kick-user', ({ targetSocketId }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const caller = rooms[currentRoom].users[socket.id];
    if (!caller || !caller.isHost) return;
    if (targetSocketId === socket.id) return;

    const targetUser = rooms[currentRoom].users[targetSocketId];
    if (!targetUser) return;

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

  // Otaqdan İntensional Çıxış (Leave Room)
  socket.on('leave-room', () => {
    if (currentRoom && rooms[currentRoom]) {
      const isHost = rooms[currentRoom].hostSocketId === socket.id || (rooms[currentRoom].users[socket.id] && rooms[currentRoom].users[socket.id].isHost);
      
      if (isHost) {
        io.to(currentRoom).emit('room-closed', {
          message: 'Otaq rəhbəri otaqdan çıxdığı üçün kino zalı bağlandı.'
        });
        const hist = adminData.roomsHistory.find(h => h.roomId === currentRoom && h.active);
        if (hist) { hist.active = false; hist.closedAt = new Date().toISOString(); }
        logActivity('room_close', `🚪 Otaq bağlandı: "${currentRoom}" (Host çıxdı)`);
        saveAdminData();
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
      const rId = currentRoom;
      socket.to(rId).emit('voice-peer-left', { peerId: socket.id, username: currentUsername });
      socket.to(rId).emit('peer-speaking', { socketId: socket.id, isSpeaking: false });

      delete rooms[rId].users[socket.id];
      const remainingUsers = Object.keys(rooms[rId].users);

      if (remainingUsers.length === 0) {
        if (roomCleanupTimers[rId]) clearTimeout(roomCleanupTimers[rId]);
        roomCleanupTimers[rId] = setTimeout(() => {
          if (rooms[rId] && Object.keys(rooms[rId].users).length === 0) {
            const hist = adminData.roomsHistory.find(h => h.roomId === rId && h.active);
            if (hist) { hist.active = false; hist.closedAt = new Date().toISOString(); }
            logActivity('room_close', `🚪 Otaq avtomatik bağlandı (60s qeyri-aktivlik): "${rId}"`);
            saveAdminData();
            delete rooms[rId];
            delete roomCleanupTimers[rId];
            console.log(`[-] Room ${rId} deleted after 60s inactivity`);
          }
        }, 60000);
      } else {
        if (rooms[rId].hostSocketId === socket.id) {
          const nextHostSocketId = remainingUsers[0];
          rooms[rId].hostSocketId = nextHostSocketId;
          if (rooms[rId].users[nextHostSocketId]) {
            rooms[rId].users[nextHostSocketId].isHost = true;
          }
          console.log(`[Host Transferred] Room ${rId} new host: ${rooms[rId].users[nextHostSocketId]?.username}`);
        }

        io.to(rId).emit('user-left', {
          socketId: socket.id,
          username: currentUsername,
          users: rooms[rId].users
        });
        io.to(rId).emit('update-users', rooms[rId].users);
        console.log(`[-] ${currentUsername} disconnected from room: ${rId} (Remaining: ${remainingUsers.length})`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Watch Party server işə düşdü: http://localhost:${PORT}`);
});
