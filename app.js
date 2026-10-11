// ==========================================
// WATCHPARTY - CLIENT APP.JS
// ==========================================

let socket = null;
let currentRoom = null;
let currentUsername = 'İstifadəçi';
let isHost = false;

// Media & Pleyer vəziyyətləri
let ytPlayer = null;
let isYtReady = false;
let isRemoteAction = false;
let currentVideoState = { type: 'empty', url: '', isPlaying: false, time: 0 };

// WebRTC Tab Yayımı
let localScreenStream = null;
let screenPeerConnection = null;

// WebRTC Səsli Zəng (Mikrofon)
let localVoiceStream = null;
let isVoiceActive = false;
const voicePeerConnections = {};

// Audio Ducking (Səs Balansı)
let audioContext = null;
let analyserNode = null;
let duckingTimer = null;
let isDucked = false;

// Trivia Sualları
const triviaList = [
  { q: "Popkorn və ya çay gətirmək növbəsi kimdədir? 🍿", opts: ["Məndədir, qaçdım gətirməyə 🏃‍♂️", "Səndədir, tez ol gəl! ⏳", "Gəl filmə davam edək ▶️"] },
  { q: "🧪 Breaking Bad: Walter White-ın gizli kimyagər ləqəbi nə idi?", opts: ["Heisenberg (Düzgün)", "Gus Fring", "Cap'n Cook"] },
  { q: "⚔️ Game of Thrones: Dəmir Taxt hansı paytaxt şəhərdə yerləşir?", opts: ["King's Landing (Düzgün)", "Winterfell", "Braavos"] },
  { q: "🌌 Interstellar: Qara Dəliyin (Black Hole) adı nə idi?", opts: ["Gargantua (Düzgün)", "Millers", "Edmunds"] },
  { q: "🦇 Batman: The Dark Knight-da Cokeri (Joker) hansı əfsanəvi aktyor oynamışdı?", opts: ["Heath Ledger (Düzgün)", "Joaquin Phoenix", "Christian Bale"] },
  { q: "🕶️ The Matrix: Neo həqiqəti görmək üçün hansı rəng həbi seçir?", opts: ["Qırmızı həb (Düzgün)", "Mavi həb", "Yaşıl həb"] }
];
let currentTriviaIndex = 0;

// STUN Serverləri
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// DOM Elementləri
const lobbyScreen = document.getElementById('lobby-screen');
const roomScreen = document.getElementById('room-screen');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const btnEnterRoom = document.getElementById('btn-enter-room');
const btnRandomRoom = document.getElementById('btn-random-room');
const displayRoomId = document.getElementById('display-room-id');
const btnCopyLink = document.getElementById('btn-copy-link');
const usersList = document.getElementById('users-list');

// Pleyerlər & Overlay
const emptyPlayer = document.getElementById('empty-player');
const ytPlayerFrame = document.getElementById('youtube-player');
const directPlayer = document.getElementById('direct-player');
const streamPlayer = document.getElementById('stream-player');
const btnUnmuteOverlay = document.getElementById('btn-unmute-overlay');
const syncNotice = document.getElementById('sync-notice');
const syncNoticeText = document.getElementById('sync-notice-text');
const playbackStatus = document.getElementById('playback-status');
const pauseTriviaOverlay = document.getElementById('pause-trivia-overlay');
const triviaQuestion = document.getElementById('trivia-question');
const triviaOptions = document.getElementById('trivia-options');
const btnCloseTrivia = document.getElementById('btn-close-trivia');

// Yayım Düymələri
const btnStartStream = document.getElementById('btn-start-stream');
const btnStopStream = document.getElementById('btn-stop-stream');
const btnStartNetflixStream = document.getElementById('btn-start-netflix-stream');

// Girişlər & Alətlər
const inputYtUrl = document.getElementById('input-youtube-url');
const btnLoadYt = document.getElementById('btn-load-youtube');
const inputDirectUrl = document.getElementById('input-direct-url');
const btnLoadDirect = document.getElementById('btn-load-direct');
const inputLocalFile = document.getElementById('input-local-file');
const btnSyncNow = document.getElementById('btn-sync-now');

// Səsli Zəng & Çat
const btnVoiceToggle = document.getElementById('btn-voice-toggle');
const remoteVoiceAudio = document.getElementById('remote-voice-audio');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const floatingEmojisContainer = document.getElementById('floating-emojis-container');
const duckingBadge = document.querySelector('.ducking-indicator');

// Modallar (Ruletka & Xatirə)
const btnOpenWatchlist = document.getElementById('btn-open-watchlist');
const btnOpenHistory = document.getElementById('btn-open-history');
const modalWatchlist = document.getElementById('modal-watchlist');
const modalHistory = document.getElementById('modal-history');
const watchlistForm = document.getElementById('watchlist-form');
const inputWatchlistMovie = document.getElementById('input-watchlist-movie');
const watchlistContainer = document.getElementById('watchlist-container');
const btnSpinRoulette = document.getElementById('btn-spin-roulette');
const rouletteWinnerBox = document.getElementById('roulette-winner-box');
const historyForm = document.getElementById('history-form');
const historyContainer = document.getElementById('history-container');

// ==========================================
// 1. İLKİN YÜKLƏNMƏ VƏ TEMA SİSTEMİ
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    roomInput.value = roomParam;
  }

  // Kult Film/Serial Tema Seçiciləri (Lobby & Room Header)
  const themeSelect = document.getElementById('theme-select');
  const lobbyThemeSelect = document.getElementById('lobby-theme-select');
  const savedTheme = localStorage.getItem('watchparty-theme') || 'theme-netflix';
  applyTheme(savedTheme);

  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
  }
  if (lobbyThemeSelect) {
    lobbyThemeSelect.value = savedTheme;
    lobbyThemeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
  }

  // Təsadüfi otaq adı
  btnRandomRoom.addEventListener('click', () => {
    const prefixes = ['kino', 'party', 'cinema', 'spiderman', 'matrix', 'heisenberg', 'winterfell', 'gotham'];
    const randNum = Math.floor(100 + Math.random() * 900);
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    roomInput.value = `${randPrefix}-${randNum}`;
  });

  // Otağa giriş
  btnEnterRoom.addEventListener('click', enterRoom);
  usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enterRoom(); });
  roomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enterRoom(); });

  setupTabs();
  setupDirectPlayerEvents();
  setupChatAndReactions();
  setupVoiceChat();
  setupModalsAndFeatures();
});

function applyTheme(themeName) {
  document.body.className = themeName;
  localStorage.setItem('watchparty-theme', themeName);

  // Hər iki dropdown-u sinxronlaşdır
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.value = themeName;
  const lobbyThemeSelect = document.getElementById('lobby-theme-select');
  if (lobbyThemeSelect) lobbyThemeSelect.value = themeName;

  // Logo tərtibatı
  const logo = document.getElementById('brand-logo-text');
  if (logo) {
    if (themeName === 'theme-spiderman') {
      logo.innerHTML = '🕷️ Spider<span>Man</span>';
    } else if (themeName === 'theme-breaking-bad') {
      logo.innerHTML = '🧪 [Br]eak<span>[Ba]d</span>';
    } else if (themeName === 'theme-got') {
      logo.innerHTML = '⚔️ Winter<span>fell</span>';
    } else if (themeName === 'theme-batman') {
      logo.innerHTML = '🦇 Gotham<span>Cinema</span>';
    } else if (themeName === 'theme-interstellar') {
      logo.innerHTML = '🌌 Gargan<span>tua</span>';
    } else if (themeName === 'theme-matrix') {
      logo.innerHTML = '🕶️ The<span>Matrix</span>';
    } else {
      logo.innerHTML = '🎬 Watch<span>Party</span>';
    }
  }

  // Çarxıfələk rəng palitrasını temaya uyğunlaşdır
  updateWheelThemeColors(themeName);

  if (typeof drawWheel === 'function') {
    drawWheel();
  }
}

function updateWheelThemeColors(themeName) {
  if (themeName === 'theme-spiderman') {
    wheelColors = ['#e2232a', '#141a2e', '#b91c1c', '#1e293b', '#f43f5e', '#0f172a'];
  } else if (themeName === 'theme-breaking-bad') {
    wheelColors = ['#00ff88', '#00e5ff', '#10b981', '#064e3b', '#f59e0b', '#047857'];
  } else if (themeName === 'theme-got') {
    wheelColors = ['#38bdf8', '#1e293b', '#0284c7', '#334155', '#7dd3fc', '#0f172a'];
  } else if (themeName === 'theme-batman') {
    wheelColors = ['#f59e0b', '#18181b', '#d97706', '#27272a', '#fbbf24', '#09090b'];
  } else if (themeName === 'theme-interstellar') {
    wheelColors = ['#f97316', '#1e1b4b', '#ea580c', '#312e81', '#fb923c', '#0f172a'];
  } else if (themeName === 'theme-matrix') {
    wheelColors = ['#22c55e', '#052e16', '#16a34a', '#14532d', '#4ade80', '#022c22'];
  } else {
    wheelColors = ['#e50914', '#1f2937', '#b91c1c', '#111827', '#dc2626', '#374151'];
  }
}

function enterRoom() {
  const username = usernameInput.value.trim() || 'İstifadəçi';
  let roomId = roomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (!roomId) {
    roomId = 'kino-' + Math.floor(100 + Math.random() * 900);
  }

  currentUsername = username;
  currentRoom = roomId;

  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
  window.history.pushState({ path: newUrl }, '', newUrl);

  initSocket();

  lobbyScreen.classList.remove('active');
  roomScreen.classList.add('active');
  displayRoomId.textContent = currentRoom;
}

btnCopyLink.addEventListener('click', () => {
  const inviteUrl = window.location.href;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showNotice('📋 Dəvət linki kopyalandı! Dostlarınızla paylaşın.');
  });
});

// ==========================================
// 2. SOCKET.IO SİSTEMİ
// ==========================================

function initSocket() {
  socket = io();

  socket.emit('join-room', {
    roomId: currentRoom,
    username: currentUsername
  });

  socket.on('room-joined', (data) => {
    isHost = data.isHost;
    updateUsersList(data.users);
    if (data.videoState && data.videoState.type !== 'empty') {
      applyVideoState(data.videoState, false);
    }
    if (data.watchlist) {
      currentWatchlist = data.watchlist;
      renderWatchlist(data.watchlist);
      drawWheel();
    }
    if (data.history) renderHistory(data.history);
    showNotice(isHost ? '👑 Otaq rəhbərisiniz. Xoş gəldiniz!' : '🍿 Otağa qoşuldunuz!');
  });

  socket.on('user-joined', (data) => {
    updateUsersList(data.users);
    showNotice(`👋 ${data.username} otağa daxil oldu!`);
    if (localScreenStream) {
      initiateScreenPeer(data.socketId);
    }
  });

  socket.on('user-left', (data) => {
    updateUsersList(data.users);
    showNotice(`👋 ${data.username} otaqdan ayrıldı`);
  });

  socket.on('video-changed', (videoState) => {
    applyVideoState(videoState, true);
  });

  socket.on('video-action', (data) => {
    handleRemoteVideoAction(data);
  });

  socket.on('receive-message', (msg) => {
    appendChatMessage(msg);
  });

  socket.on('receive-reaction', (data) => {
    spawnFloatingEmoji(data.reaction);
  });

  // Watchlist & History Hadisələri
  socket.on('watchlist-updated', (list) => {
    currentWatchlist = list;
    renderWatchlist(list);
    drawWheel();
  });

  socket.on('watchlist-winner', ({ winner, spinner }) => {
    openModal('modal-watchlist');
    spinWheelAnimation(winner, () => {
      showWinnerAnnouncement(winner, spinner);
    });
  });

  socket.on('history-updated', (list) => {
    renderHistory(list);
  });

  // WebRTC Tab Yayımı Siqnalları
  socket.on('stream-ready', ({ broadcaster }) => {
    socket.emit('request-stream', { target: broadcaster });
  });

  socket.on('request-stream', ({ requester }) => {
    if (localScreenStream) {
      initiateScreenPeer(requester);
    }
  });

  socket.on('webrtc-offer', async ({ sender, sdp }) => {
    await handleScreenOffer(sender, sdp);
  });

  socket.on('webrtc-answer', async ({ sender, sdp }) => {
    if (screenPeerConnection) {
      await screenPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  });

  socket.on('webrtc-ice', async ({ sender, candidate }) => {
    if (screenPeerConnection && candidate) {
      try {
        await screenPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    }
  });

  // WebRTC Səsli Zəng Siqnalları
  socket.on('voice-peer-ready', async ({ sender }) => {
    await callVoicePeer(sender);
  });

  socket.on('voice-peer-left', ({ peerId }) => {
    if (voicePeerConnections[peerId]) {
      voicePeerConnections[peerId].close();
      delete voicePeerConnections[peerId];
    }
  });

  socket.on('voice-offer', async ({ sender, sdp }) => {
    await handleVoiceOffer(sender, sdp);
  });

  socket.on('voice-answer', async ({ sender, sdp }) => {
    if (voicePeerConnections[sender]) {
      await voicePeerConnections[sender].setRemoteDescription(new RTCSessionDescription(sdp));
    }
  });

  socket.on('voice-ice', async ({ sender, candidate }) => {
    if (voicePeerConnections[sender] && candidate) {
      try {
        await voicePeerConnections[sender].addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    }
  });
}

function updateUsersList(users) {
  usersList.innerHTML = '';
  Object.values(users).forEach(u => {
    const pill = document.createElement('div');
    pill.className = 'user-pill';
    pill.innerHTML = `
      <span class="status-dot"></span>
      <span>${u.username} ${u.isHost ? '👑' : ''}</span>
    `;
    usersList.appendChild(pill);
  });
}

// ==========================================
// 3. PLEYER SİNXRONİZASİYASI & TRIVIA
// ==========================================

function applyVideoState(state, showNotification = true) {
  currentVideoState = state;

  emptyPlayer.classList.add('hidden');
  ytPlayerFrame.classList.add('hidden');
  directPlayer.classList.add('hidden');
  streamPlayer.classList.add('hidden');
  if (btnUnmuteOverlay) btnUnmuteOverlay.classList.add('hidden');
  if (pauseTriviaOverlay) pauseTriviaOverlay.classList.add('hidden');

  if (state.type === 'youtube') {
    ytPlayerFrame.classList.remove('hidden');
    loadYouTubeVideo(state.url);
    if (showNotification) showNotice('🔴 YouTube videosu açıldı');
  } else if (state.type === 'direct') {
    directPlayer.classList.remove('hidden');
    isRemoteAction = true;
    directPlayer.src = state.url;
    directPlayer.currentTime = state.time || 0;
    if (state.isPlaying) {
      directPlayer.play().catch(() => {});
    }
    setTimeout(() => { isRemoteAction = false; }, 500);
    if (showNotification) showNotice('🎬 Birbaşa video açıldı');
  } else if (state.type === 'stream') {
    streamPlayer.classList.remove('hidden');
    if (!localScreenStream) {
      socket.emit('stream-ready');
    }
    if (showNotification) showNotice('💻 Canlı film yayımı aktivdir');
  } else {
    emptyPlayer.classList.remove('hidden');
  }
}

function handleRemoteVideoAction({ action, time, sender }) {
  isRemoteAction = true;

  if (currentVideoState.type === 'youtube' && ytPlayer && isYtReady) {
    if (Math.abs(ytPlayer.getCurrentTime() - time) > 1.5) {
      ytPlayer.seekTo(time, true);
    }
    if (action === 'play') {
      ytPlayer.playVideo();
      showNotice(`▶️ ${sender} videonu başlatdı`);
      hideTrivia();
    } else if (action === 'pause') {
      ytPlayer.pauseVideo();
      showNotice(`⏸️ ${sender} videonu saxladı`);
      showRandomTrivia();
    } else if (action === 'seek') {
      ytPlayer.seekTo(time, true);
      showNotice(`⏩ ${sender} vaxtı dəyişdi (${formatTime(time)})`);
    }
  } else if (currentVideoState.type === 'direct') {
    if (Math.abs(directPlayer.currentTime - time) > 1.5) {
      directPlayer.currentTime = time;
    }
    if (action === 'play') {
      directPlayer.play().catch(() => {});
      showNotice(`▶️ ${sender} videonu başlatdı`);
      hideTrivia();
    } else if (action === 'pause') {
      directPlayer.pause();
      showNotice(`⏸️ ${sender} videonu saxladı`);
      showRandomTrivia();
    } else if (action === 'seek') {
      directPlayer.currentTime = time;
      showNotice(`⏩ ${sender} vaxtı dəyişdi (${formatTime(time)})`);
    }
  }

  setTimeout(() => {
    isRemoteAction = false;
  }, 400);
}

// Fasilə Trivia Sistemi
function showRandomTrivia() {
  if (!pauseTriviaOverlay) return;
  const t = triviaList[Math.floor(Math.random() * triviaList.length)];
  triviaQuestion.textContent = t.q;
  triviaOptions.innerHTML = '';
  t.opts.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'trivia-opt';
    btn.textContent = opt;
    btn.onclick = () => answerTrivia(idx, opt);
    triviaOptions.appendChild(btn);
  });
  pauseTriviaOverlay.classList.remove('hidden');
}

window.answerTrivia = function(idx, text) {
  showNotice(`💬 Cavab: "${text}"`);
  hideTrivia();
};

function hideTrivia() {
  if (pauseTriviaOverlay) pauseTriviaOverlay.classList.add('hidden');
}
if (btnCloseTrivia) btnCloseTrivia.addEventListener('click', hideTrivia);

// ==========================================
// 4. YOUTUBE İNTEQRASİYASI
// ==========================================

function onYouTubeIframeAPIReady() {
  isYtReady = true;
}

function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function loadYouTubeVideo(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    alert('Düzgün YouTube linki daxil edin!');
    return;
  }

  if (ytPlayer && ytPlayer.loadVideoById) {
    ytPlayer.loadVideoById(videoId);
  } else {
    ytPlayer = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1
      },
      events: {
        'onStateChange': onYouTubeStateChange
      }
    });
  }
}

function onYouTubeStateChange(event) {
  if (isRemoteAction || !socket) return;
  const currentTime = ytPlayer.getCurrentTime();

  if (event.data === YT.PlayerState.PLAYING) {
    socket.emit('video-action', { action: 'play', time: currentTime });
    hideTrivia();
  } else if (event.data === YT.PlayerState.PAUSED) {
    socket.emit('video-action', { action: 'pause', time: currentTime });
    showRandomTrivia();
  }
}

btnLoadYt.addEventListener('click', () => {
  const url = inputYtUrl.value.trim();
  if (!url) return;
  socket.emit('change-video', { type: 'youtube', url });
});

// ==========================================
// 5. BİRBAŞA VİDEO & LOKAL FAYL
// ==========================================

function setupDirectPlayerEvents() {
  directPlayer.addEventListener('play', () => {
    if (isRemoteAction || !socket) return;
    socket.emit('video-action', { action: 'play', time: directPlayer.currentTime });
    hideTrivia();
  });

  directPlayer.addEventListener('pause', () => {
    if (isRemoteAction || !socket) return;
    socket.emit('video-action', { action: 'pause', time: directPlayer.currentTime });
    showRandomTrivia();
  });

  directPlayer.addEventListener('seeked', () => {
    if (isRemoteAction || !socket) return;
    socket.emit('video-action', { action: 'seek', time: directPlayer.currentTime });
  });
}

btnLoadDirect.addEventListener('click', () => {
  const url = inputDirectUrl.value.trim();
  if (!url) return;
  socket.emit('change-video', { type: 'direct', url });
});

inputLocalFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fileUrl = URL.createObjectURL(file);
  applyVideoState({ type: 'direct', url: fileUrl, isPlaying: true, time: 0 });
  showNotice(`📁 Lokal fayl: ${file.name}. Digər iştirakçı da eyni faylı seçdikdə sinxronlaşacaq.`);
});

btnSyncNow.addEventListener('click', () => {
  if (currentVideoState.type === 'youtube' && ytPlayer) {
    socket.emit('video-action', { action: 'seek', time: ytPlayer.getCurrentTime() });
    showNotice('🔄 YouTube sinxronlaşdırıldı');
  } else if (currentVideoState.type === 'direct') {
    socket.emit('video-action', { action: 'seek', time: directPlayer.currentTime });
    showNotice('🔄 Video sinxronlaşdırıldı');
  }
});

// ==========================================
// 6. WEBRTC TAB YAYIMI & NETFLIX
// ==========================================

btnStartStream.addEventListener('click', startScreenCapture);
if (btnStartNetflixStream) {
  btnStartNetflixStream.addEventListener('click', startScreenCapture);
}

async function startScreenCapture() {
  try {
    localScreenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
        frameRate: { ideal: 60 }
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false
      }
    });

    const audioTracks = localScreenStream.getAudioTracks();
    if (audioTracks.length === 0) {
      alert("⚠️ DİQQƏT: Filmin səsi qoşulmadı!\n\nChrome pəncərəsi açılanda aşağıdakı 'Also share tab audio' (Səsi paylaş) qutusunu mütləq işarələyin və 'Pəncərə' yox, 'Chrome Tab' (və ya Bütöv Ekran) seçin.");
    }

    streamPlayer.srcObject = localScreenStream;
    streamPlayer.muted = true;
    streamPlayer.classList.remove('hidden');
    emptyPlayer.classList.add('hidden');
    if (btnUnmuteOverlay) btnUnmuteOverlay.classList.add('hidden');

    btnStartStream.classList.add('hidden');
    btnStopStream.classList.remove('hidden');

    socket.emit('change-video', { type: 'stream', url: 'live-tab' });
    socket.emit('stream-ready');

    localScreenStream.getVideoTracks()[0].onended = stopScreenStream;
    showNotice('🎥 Film tabı yayımlanır! Səs aktivdir.');
  } catch (err) {
    console.error('Ekran yayımı xətası:', err);
  }
}

btnStopStream.addEventListener('click', stopScreenStream);

function stopScreenStream() {
  if (localScreenStream) {
    localScreenStream.getTracks().forEach(track => track.stop());
    localScreenStream = null;
  }
  if (screenPeerConnection) {
    screenPeerConnection.close();
    screenPeerConnection = null;
  }

  streamPlayer.srcObject = null;
  streamPlayer.classList.add('hidden');
  emptyPlayer.classList.remove('hidden');
  if (btnUnmuteOverlay) btnUnmuteOverlay.classList.add('hidden');

  btnStartStream.classList.remove('hidden');
  btnStopStream.classList.add('hidden');

  socket.emit('change-video', { type: 'empty', url: '' });
  showNotice('⏹️ Yayım dayandırıldı');
}

async function initiateScreenPeer(targetSocketId) {
  if (!localScreenStream) return;
  if (screenPeerConnection) screenPeerConnection.close();

  screenPeerConnection = new RTCPeerConnection(rtcConfig);

  localScreenStream.getTracks().forEach(track => {
    screenPeerConnection.addTrack(track, localScreenStream);
  });

  screenPeerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-ice', { target: targetSocketId, candidate: event.candidate });
    }
  };

  const offer = await screenPeerConnection.createOffer();
  await screenPeerConnection.setLocalDescription(offer);
  socket.emit('webrtc-offer', { target: targetSocketId, sdp: offer });
}

async function handleScreenOffer(senderSocketId, sdp) {
  if (screenPeerConnection) screenPeerConnection.close();

  screenPeerConnection = new RTCPeerConnection(rtcConfig);

  screenPeerConnection.ontrack = (event) => {
    streamPlayer.srcObject = event.streams[0];
    streamPlayer.muted = false;
    streamPlayer.volume = 1.0;

    const playPromise = streamPlayer.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (btnUnmuteOverlay) btnUnmuteOverlay.classList.add('hidden');
      }).catch(err => {
        console.warn('Autoplay audio blocked:', err);
        if (btnUnmuteOverlay) btnUnmuteOverlay.classList.remove('hidden');
      });
    }
  };

  screenPeerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-ice', { target: senderSocketId, candidate: event.candidate });
    }
  };

  await screenPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await screenPeerConnection.createAnswer();
  await screenPeerConnection.setLocalDescription(answer);
  socket.emit('webrtc-answer', { target: senderSocketId, sdp: answer });
}

if (btnUnmuteOverlay) {
  btnUnmuteOverlay.addEventListener('click', () => {
    streamPlayer.muted = false;
    streamPlayer.volume = 1.0;
    streamPlayer.play().catch(() => {});
    btnUnmuteOverlay.classList.add('hidden');
    showNotice('🔊 Səs açıldı!');
  });
}

// ==========================================
// 7. WEBRTC SƏSLİ ZƏNG & AUDIO DUCKING
// ==========================================

function setupVoiceChat() {
  btnVoiceToggle.addEventListener('click', async () => {
    if (!isVoiceActive) {
      await startVoiceChat();
    } else {
      stopVoiceChat();
    }
  });
}

async function startVoiceChat() {
  try {
    localVoiceStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });
    isVoiceActive = true;
    btnVoiceToggle.classList.add('active');
    btnVoiceToggle.querySelector('.mic-text').textContent = 'Səs: Açıq 🟢';
    showNotice('🎙️ Mikrofon aktivdir! Canlı danışa bilərsiniz.');

    // Audio Ducking Aktiv Et
    setupAudioDucking(localVoiceStream);

    Object.values(voicePeerConnections).forEach(pc => {
      localVoiceStream.getTracks().forEach(track => {
        pc.addTrack(track, localVoiceStream);
      });
    });

    socket.emit('voice-peer-ready');
  } catch (err) {
    console.error('Mikrofon xətası:', err);
    alert('Mikrofon icazəsi verilmədi! Brauzerinizin parametrlərindən mikrofonu aktivləşdirin.');
  }
}

function stopVoiceChat() {
  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach(track => track.stop());
    localVoiceStream = null;
  }
  isVoiceActive = false;
  btnVoiceToggle.classList.remove('active');
  btnVoiceToggle.querySelector('.mic-text').textContent = 'Səsli Zəng: Qoşul';

  stopAudioDucking();

  Object.values(voicePeerConnections).forEach(pc => pc.close());
  for (let key in voicePeerConnections) delete voicePeerConnections[key];

  socket.emit('voice-peer-left');
  showNotice('🎙️ Mikrofon bağlandı');
}

// Audio Ducking: Danışanda filmin səsini 30%-ə salır, susanda 100%-ə qaldırır
function setupAudioDucking(stream) {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    source.connect(analyserNode);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    if (duckingTimer) clearInterval(duckingTimer);
    duckingTimer = setInterval(() => {
      if (!isVoiceActive || !analyserNode) return;
      analyserNode.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      let avg = sum / dataArray.length;

      if (avg > 16) {
        if (!isDucked) {
          isDucked = true;
          applyDuckingVolume(true);
          if (duckingBadge) duckingBadge.classList.add('ducking-active');
        }
      } else {
        if (isDucked) {
          isDucked = false;
          applyDuckingVolume(false);
          if (duckingBadge) duckingBadge.classList.remove('ducking-active');
        }
      }
    }, 200);
  } catch (err) {
    console.warn('Audio Ducking işə düşmədi:', err);
  }
}

function stopAudioDucking() {
  if (duckingTimer) clearInterval(duckingTimer);
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  applyDuckingVolume(false);
  if (duckingBadge) duckingBadge.classList.remove('ducking-active');
}

function applyDuckingVolume(duck) {
  const targetVol = duck ? 0.35 : 1.0;
  const ytVol = duck ? 35 : 100;

  if (streamPlayer) streamPlayer.volume = targetVol;
  if (directPlayer) directPlayer.volume = targetVol;
  if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(ytVol);
}

async function callVoicePeer(targetSocketId) {
  if (voicePeerConnections[targetSocketId]) voicePeerConnections[targetSocketId].close();

  const pc = new RTCPeerConnection(rtcConfig);
  voicePeerConnections[targetSocketId] = pc;

  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach(track => pc.addTrack(track, localVoiceStream));
  } else {
    pc.addTransceiver('audio', { direction: 'recvonly' });
  }

  pc.ontrack = (event) => playRemoteVoice(event.streams[0]);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice-ice', { target: targetSocketId, candidate: event.candidate });
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-offer', { target: targetSocketId, sdp: offer });
}

async function handleVoiceOffer(senderSocketId, sdp) {
  if (voicePeerConnections[senderSocketId]) voicePeerConnections[senderSocketId].close();

  const pc = new RTCPeerConnection(rtcConfig);
  voicePeerConnections[senderSocketId] = pc;

  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach(track => pc.addTrack(track, localVoiceStream));
  } else {
    pc.addTransceiver('audio', { direction: 'recvonly' });
  }

  pc.ontrack = (event) => playRemoteVoice(event.streams[0]);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice-ice', { target: senderSocketId, candidate: event.candidate });
    }
  };

  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('voice-answer', { target: senderSocketId, sdp: answer });
}

function playRemoteVoice(stream) {
  let audioEl = document.getElementById('remote-voice-audio');
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = 'remote-voice-audio';
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    document.body.appendChild(audioEl);
  }
  audioEl.srcObject = stream;
  audioEl.muted = false;
  audioEl.volume = 1.0;
  audioEl.play().catch(() => {});
  showNotice('💖 Canlı səsli danışıq qoşuldu!');
}

// ==========================================
// 8. WATCHLIST, ÇARXIFƏLƏK & XATİRƏ ARXİVİ
// ==========================================

let currentWatchlist = [];
let wheelAngle = 0;
let isWheelSpinning = false;
let wheelColors = [
  '#e50914', '#1f2937', '#b91c1c', '#111827', 
  '#dc2626', '#374151', '#f59e0b', '#10b981'
];

function setupModalsAndFeatures() {
  btnOpenWatchlist.addEventListener('click', () => {
    openModal('modal-watchlist');
    drawWheel();
  });
  btnOpenHistory.addEventListener('click', () => openModal('modal-history'));

  // Watchlist Əlavə Et
  watchlistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = inputWatchlistMovie.value.trim();
    if (!title || !socket) return;
    socket.emit('watchlist-add', { title });
    inputWatchlistMovie.value = '';
  });

  // Çarxıfələyi Fırlat
  btnSpinRoulette.addEventListener('click', () => {
    if (!socket || isWheelSpinning) return;
    if (currentWatchlist.length === 0) {
      alert('Zəhmət olmasa əvvəlcə ən azı 1 film əlavə edin!');
      return;
    }
    btnSpinRoulette.textContent = '🎡 Çarx Fırlanır...';
    btnSpinRoulette.disabled = true;
    socket.emit('watchlist-spin');
  });

  // Tarixçə Əlavə Et
  historyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('input-history-title').value.trim();
    const rating = document.getElementById('input-history-rating').value;
    const note = document.getElementById('input-history-note').value.trim();
    if (!title || !socket) return;

    socket.emit('history-add', { title, rating, note });
    document.getElementById('input-history-title').value = '';
    document.getElementById('input-history-note').value = '';
    showNotice('📜 Film xatirələr siyahısına əlavə olundu!');
  });

  // İlkin olaraq çarxı və fon animasiyasını çək
  drawWheel();
  setupAmbientAnimations();
}

// ÇARXIFƏLƏK CANVAS ÇƏKİLMƏSİ
function drawWheel() {
  const canvas = document.getElementById('wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = cx - 14;

  ctx.clearRect(0, 0, width, height);

  const items = currentWatchlist.length > 0 ? currentWatchlist : [
    { title: '1. Film əlavə et' },
    { title: '🍿 Popkorn al' },
    { title: '2. Çarxı fırlat' },
    { title: '🎬 WatchParty' }
  ];

  const numSlices = items.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  for (let i = 0; i < numSlices; i++) {
    const startAngle = wheelAngle + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = wheelColors[i % wheelColors.length];
    ctx.fill();

    ctx.strokeStyle = '#181920';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Mətn
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;

    let text = items[i].title;
    if (text.length > 15) text = text.substr(0, 13) + '..';
    ctx.fillText(text, radius - 18, 5);
    ctx.restore();
  }

  // Xarici Qızılı Çərçivə
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#ffb830';
  ctx.stroke();

  // Mərkəzi Dairə (Hub)
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
  ctx.fillStyle = '#181920';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffb830';
  ctx.stroke();

  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎬', cx, cy);
}

// ÇARXIN CANLI FİZİKA İLƏ FIRLANMASI
function spinWheelAnimation(winnerItem, onComplete) {
  if (isWheelSpinning) {
    if (onComplete) onComplete();
    return;
  }
  isWheelSpinning = true;

  const items = currentWatchlist;
  let winnerIndex = items.findIndex(it => it.id === winnerItem.id || it.title === winnerItem.title);
  if (winnerIndex === -1) winnerIndex = 0;

  const numSlices = items.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  // Ox yuxarıdadır: angle = 3 * PI / 2
  const pointerAngle = 3 * Math.PI / 2;
  const targetSliceMid = winnerIndex * sliceAngle + sliceAngle / 2;
  const fullSpins = 6 * 2 * Math.PI;
  const currentMod = wheelAngle % (2 * Math.PI);
  const targetAngle = wheelAngle + fullSpins + ((pointerAngle - targetSliceMid - currentMod + 4 * Math.PI) % (2 * Math.PI));

  const startAngle = wheelAngle;
  const change = targetAngle - startAngle;
  const duration = 4200;
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Quartic Ease-Out əyləclənməsi
    const easeOut = 1 - Math.pow(1 - progress, 4);
    wheelAngle = startAngle + change * easeOut;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isWheelSpinning = false;
      btnSpinRoulette.innerHTML = '<span>🎯 ÇARXI FIRLAT!</span>';
      btnSpinRoulette.disabled = false;
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(animate);
}

function renderWatchlist(list) {
  currentWatchlist = list || [];
  if (!watchlistContainer) return;
  watchlistContainer.innerHTML = '';
  if (!currentWatchlist || currentWatchlist.length === 0) {
    watchlistContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:10px; font-size:0.85rem;">Hələ heç bir film əlavə edilməyib.</div>';
    drawWheel();
    return;
  }
  currentWatchlist.forEach(item => {
    const chip = document.createElement('div');
    chip.className = 'watchlist-chip';
    chip.innerHTML = `
      <span>🎬 <strong>${escapeHtml(item.title)}</strong> <small style="opacity:0.65">(${escapeHtml(item.addedBy)})</small></span>
      <button class="watchlist-chip-remove" onclick="deleteWatchlistItem('${item.id}')" title="Sil">✕</button>
    `;
    watchlistContainer.appendChild(chip);
  });
  drawWheel();
}

window.deleteWatchlistItem = function(id) {
  if (socket) socket.emit('watchlist-remove', { id });
};

function showWinnerAnnouncement(winner, spinner) {
  rouletteWinnerBox.classList.remove('hidden');
  rouletteWinnerBox.innerHTML = `
    🎉 <strong>${escapeHtml(spinner)}</strong> çarxıfələyi fırlatdı!<br>
    🍿 Bu seansın qalib filmi: <strong style="color:var(--primary); font-size:1.35rem; display:block; margin-top:6px;">${escapeHtml(winner.title)}</strong>!
  `;
  // Konfetti emojiləri
  spawnFloatingEmoji('🎉');
  spawnFloatingEmoji('🍿');
  spawnFloatingEmoji('✨');
  showNotice(`🎯 Qalib seçildi: ${winner.title}`);
}

// ==========================================
// 8.1 KULT KİNO AMBİENT FON ANİMASİYALARI
// ==========================================

function setupAmbientAnimations() {
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // 1. Marvel / Spider-Man: Hörümçək toru və qırmızı/mavi partikullar
  const spideyParticles = Array.from({ length: 42 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2.4 + 1.2,
    speedX: (Math.random() - 0.5) * 0.9,
    speedY: (Math.random() - 0.5) * 0.9,
    color: Math.random() > 0.4 ? 'rgba(226, 35, 42, ' : 'rgba(56, 189, 248, '
  }));

  // 2. Game of Thrones: Çoxqatlı Şaxtalı qar dənəcikləri
  const snowFlakes = Array.from({ length: 70 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 3 + 1,
    speedY: Math.random() * 1.5 + 0.6,
    speedX: Math.random() * 0.8 - 0.4,
    alpha: Math.random() * 0.5 + 0.4
  }));

  // 3. The Matrix: Rəqəmsal kod yağışı
  const matrixColumns = Math.floor(window.innerWidth / 20);
  const matrixDrops = Array.from({ length: matrixColumns }, () => Math.random() * -50);
  const matrixChars = "0101XYZ9823#$*+-=";

  // 4. Breaking Bad: Qalxan kimyəvi tüstü və mavi kristal qabarcıqları
  const bubbles = Array.from({ length: 30 }, () => ({
    x: Math.random() * 180 + (Math.random() < 0.5 ? 0 : window.innerWidth - 180),
    y: window.innerHeight + Math.random() * 100,
    r: Math.random() * 6 + 3,
    speedY: Math.random() * 1.6 + 0.8,
    alpha: Math.random() * 0.5 + 0.25,
    isBlue: Math.random() > 0.5
  }));

  // 5. Interstellar: Kosmik ulduzlar
  const stars = Array.from({ length: 85 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.8 + 0.5,
    alpha: Math.random(),
    speed: Math.random() * 0.02 + 0.005
  }));

  // 6. Netflix / Default Cinema: Teatral işıq şüasında zərif toz zərrəcikləri
  const cinemaDust = Array.from({ length: 35 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2 + 0.8,
    speedY: Math.random() * 0.4 + 0.2,
    alpha: Math.random() * 0.5 + 0.2
  }));

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const theme = document.body.className;

    if (theme.includes('theme-spiderman')) {
      // Marvel / Spider-Man: İpək Hörümçək Torları və Parlaq Qırmızı/Mavi Partikullar
      for (let i = 0; i < spideyParticles.length; i++) {
        const p = spideyParticles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = p.color + '0.9)';
        ctx.shadowColor = p.color + '1)';
        ctx.shadowBlur = 8;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Yaxın olanlar arasında aydın görünən tor sapları
        for (let j = i + 1; j < spideyParticles.length; j++) {
          const p2 = spideyParticles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 135) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (1 - dist / 135)})`;
            ctx.lineWidth = 1.2;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
            ctx.stroke();
          }
        }
      }
      ctx.shadowBlur = 0;
    } else if (theme.includes('theme-got')) {
      // Game of Thrones: Şaxtalı qar dənəcikləri
      snowFlakes.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha})`;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fill();
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
      });
      ctx.shadowBlur = 0;
    } else if (theme.includes('theme-breaking-bad')) {
      // Breaking Bad: Kimyəvi tüstü və mavi metan kristalları qabarcıqları
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
        ctx.fillStyle = b.isBlue ? `rgba(0, 229, 255, ${b.alpha})` : `rgba(0, 255, 102, ${b.alpha})`;
        ctx.shadowColor = b.isBlue ? 'rgba(0, 229, 255, 0.8)' : 'rgba(0, 255, 102, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        b.y -= b.speedY;
        if (b.y < -10) {
          b.y = canvas.height + 20;
          b.x = Math.random() * 250 + (Math.random() < 0.5 ? 0 : canvas.width - 250);
        }
      });
      ctx.shadowBlur = 0;
    } else if (theme.includes('theme-matrix')) {
      // The Matrix: Rəqəmsal kod yağışı
      ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
      ctx.font = '14px monospace';
      for (let i = 0; i < matrixDrops.length; i++) {
        const x = i * 20;
        if (x < 160 || x > canvas.width - 160) {
          const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          const y = matrixDrops[i] * 18;
          ctx.fillText(char, x, y);
          if (y > canvas.height && Math.random() > 0.975) {
            matrixDrops[i] = 0;
          }
          matrixDrops[i]++;
        }
      }
    } else if (theme.includes('theme-interstellar')) {
      // Interstellar: Sayrışan kosmik ulduzlar
      stars.forEach(s => {
        s.alpha += s.speed;
        const a = (Math.sin(s.alpha) + 1) / 2 * 0.8 + 0.2;
        ctx.fillStyle = `rgba(249, 115, 22, ${a * 0.7})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
        ctx.fill();
      });
    } else {
      // Netflix / Default: Kinoteatr işıq şüasında üzən incə toz zərrəcikləri
      cinemaDust.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(229, 9, 20, ${d.alpha * 0.35})`;
        ctx.fill();
        d.y -= d.speedY;
        if (d.y < 0) {
          d.y = canvas.height;
          d.x = Math.random() * canvas.width;
        }
      });
    }

    requestAnimationFrame(render);
  }

  render();
}

function renderHistory(list) {
  historyContainer.innerHTML = '';
  if (!list || list.length === 0) {
    historyContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:10px;">Hələ izlənmiş film qeyd olunmayıb.</div>';
    return;
  }
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <span class="history-title">🎬 ${escapeHtml(item.title)}</span>
        <span class="history-badge">⭐ ${item.rating}/10</span>
      </div>
      ${item.note ? `<div class="history-note">"${escapeHtml(item.note)}"</div>` : ''}
      <div class="history-meta">📅 ${item.date} — ${escapeHtml(item.addedBy)}</div>
    `;
    historyContainer.appendChild(card);
  });
}

window.openModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('hidden');
};

window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');
};

// ==========================================
// 9. ÇAT VƏ EMOJİLƏR
// ==========================================

function setupChatAndReactions() {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !socket) return;
    socket.emit('send-message', { text });
    chatInput.value = '';
  });

  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-reaction');
      if (socket) {
        socket.emit('send-reaction', { reaction: emoji });
      }
      spawnFloatingEmoji(emoji);
    });
  });
}

function appendChatMessage(msg) {
  const isMine = (msg.sender === currentUsername);
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${isMine ? 'mine' : 'theirs'}`;
  msgDiv.innerHTML = `
    <div class="chat-msg-header">
      <span class="sender">${isMine ? 'Sən' : msg.sender}</span>
      <span class="time">${msg.time}</span>
    </div>
    <div class="chat-msg-bubble">${escapeHtml(msg.text)}</div>
  `;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function spawnFloatingEmoji(emoji) {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.textContent = emoji;

  const randomLeft = 10 + Math.random() * 75;
  el.style.left = `${randomLeft}%`;

  floatingEmojisContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

// ==========================================
// 10. KÖMƏKÇİ FUNKSİYALAR
// ==========================================

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const paneId = `pane-${btn.getAttribute('data-tab')}`;
      const pane = document.getElementById(paneId);
      if (pane) pane.classList.add('active');
    });
  });
}

window.openSourceTab = function(tabName) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (btn) btn.click();
};

function showNotice(text) {
  syncNoticeText.textContent = text;
  syncNotice.classList.remove('hidden');
  syncNotice.style.animation = 'none';
  syncNotice.offsetHeight;
  syncNotice.style.animation = null;

  setTimeout(() => {
    syncNotice.classList.add('hidden');
  }, 2500);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
