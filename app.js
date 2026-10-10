// ==========================================
// KİNO OTAĞI - CLIENT APP.JS
// ==========================================

let socket = null;
let currentRoom = null;
let currentUsername = 'Mən';
let isHost = false;

// Media & Pleyer vəziyyətləri
let ytPlayer = null;
let isYtReady = false;
let isRemoteAction = false; // Sinxronizasiya dövrəsinin qarşısını almaq üçün
let currentVideoState = { type: 'empty', url: '', isPlaying: false, time: 0 };

// WebRTC Tab Yayımı
let localScreenStream = null;
let screenPeerConnection = null;

// WebRTC Səsli Zəng (Mikrofon)
let localVoiceStream = null;
let voicePeerConnection = null;
let isVoiceActive = false;

// STUN Serverləri (WebRTC P2P əlaqəsi üçün)
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

// Pleyerlər
const emptyPlayer = document.getElementById('empty-player');
const ytPlayerFrame = document.getElementById('youtube-player');
const directPlayer = document.getElementById('direct-player');
const streamPlayer = document.getElementById('stream-player');
const syncNotice = document.getElementById('sync-notice');
const syncNoticeText = document.getElementById('sync-notice-text');
const playbackStatus = document.getElementById('playback-status');

// WebRTC Yayım Düymələri
const btnStartStream = document.getElementById('btn-start-stream');
const btnStopStream = document.getElementById('btn-stop-stream');

// URL və Fayl Girişləri
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

// ==========================================
// 1. İLKİN YÜKLƏNMƏ VƏ LOBBY
// ==========================================

// URL-dən otaq kodunu yoxla (?room=ad)
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    roomInput.value = roomParam;
  }

  // Təsadüfi romantik otaq adı generatoru
  btnRandomRoom.addEventListener('click', () => {
    const prefixes = ['bizim-kino', 'romantika', 'gece-seansi', 'ulduzlar', 'sevgi-otagi'];
    const randNum = Math.floor(100 + Math.random() * 900);
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    roomInput.value = `${randPrefix}-${randNum}`;
  });

  // Otağa daxil ol
  btnEnterRoom.addEventListener('click', enterRoom);
  usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enterRoom(); });
  roomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') enterRoom(); });

  // Tab keçidləri
  setupTabs();
  // Pleyer hadisələri
  setupDirectPlayerEvents();
  // Çat & Reaksiyalar
  setupChatAndReactions();
  // Səsli Zəng
  setupVoiceChat();
});

// Otağa giriş funksiyası
function enterRoom() {
  const username = usernameInput.value.trim() || 'Kino Həvəskarı';
  let roomId = roomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (!roomId) {
    roomId = 'kino-' + Math.floor(100 + Math.random() * 900);
  }

  currentUsername = username;
  currentRoom = roomId;

  // URL-i yenilə (səhifə yenilənmədən)
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + currentRoom;
  window.history.pushState({ path: newUrl }, '', newUrl);

  initSocket();

  // Ekranı dəyiş
  lobbyScreen.classList.remove('active');
  roomScreen.classList.add('active');
  displayRoomId.textContent = currentRoom;
}

// Linki kopyala
btnCopyLink.addEventListener('click', () => {
  const inviteUrl = window.location.href;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showNotice('💌 Dəvət linki kopyalandı! Sevgilinizə göndərin.');
  });
});

// ==========================================
// 2. SOCKET.IO VƏ OTAQ ƏLAQƏSİ
// ==========================================

function initSocket() {
  socket = io();

  // Otağa qoşul
  socket.emit('join-room', {
    roomId: currentRoom,
    username: currentUsername
  });

  // Uğurla qoşulduqda
  socket.on('room-joined', (data) => {
    isHost = data.isHost;
    updateUsersList(data.users);
    if (data.videoState && data.videoState.type !== 'empty') {
      applyVideoState(data.videoState, false);
    }
    showNotice(isHost ? '👑 Otaq rəhbərisiniz. Xoş gəldiniz!' : '🍿 Otağa qoşuldunuz!');
  });

  // Yeni istifadəçi qoşulduqda
  socket.on('user-joined', (data) => {
    updateUsersList(data.users);
    showNotice(`💖 ${data.username} otağa daxil oldu!`);

    // Əgər Host biziksə və hazırda WebRTC yayım ediriksə, yeni gələnə stream təklifi göndər
    if (localScreenStream) {
      initiateScreenPeer(data.socketId);
    }
  });

  // İstifadəçi çıxdıqda
  socket.on('user-left', (data) => {
    updateUsersList(data.users);
    showNotice(`👋 ${data.username} otaqdan ayrıldı`);
  });

  // Video mənbəyi dəyişdikdə
  socket.on('video-changed', (videoState) => {
    applyVideoState(videoState, true);
  });

  // Video əməliyyatları (Play / Pause / Seek)
  socket.on('video-action', (data) => {
    handleRemoteVideoAction(data);
  });

  // Mesaj gəldikdə
  socket.on('receive-message', (msg) => {
    appendChatMessage(msg);
  });

  // Reaksiya gəldikdə
  socket.on('receive-reaction', (data) => {
    spawnFloatingEmoji(data.reaction);
  });

  // WebRTC Tab Yayımı Siqnalları
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
      } catch (e) {
        console.error('ICE candidate error', e);
      }
    }
  });

  // WebRTC Səsli Zəng Siqnalları
  socket.on('voice-offer', async ({ sender, sdp }) => {
    await handleVoiceOffer(sender, sdp);
  });

  socket.on('voice-answer', async ({ sender, sdp }) => {
    if (voicePeerConnection) {
      await voicePeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  });

  socket.on('voice-ice', async ({ sender, candidate }) => {
    if (voicePeerConnection && candidate) {
      try {
        await voicePeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
// 3. PLEYERİN İDARƏ EDİLMƏSİ VƏ SİNXRONİZASİYA
// ==========================================

function applyVideoState(state, showNotification = true) {
  currentVideoState = state;

  // Bütün pleyerləri gizlət
  emptyPlayer.classList.add('hidden');
  ytPlayerFrame.classList.add('hidden');
  directPlayer.classList.add('hidden');
  streamPlayer.classList.add('hidden');

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
    if (showNotification) showNotice('💻 Canlı film yayımı aktivdir');
  } else {
    emptyPlayer.classList.remove('hidden');
  }
}

// Digər tərəfdən gələn Play/Pause/Seek
function handleRemoteVideoAction({ action, time, sender }) {
  isRemoteAction = true;

  if (currentVideoState.type === 'youtube' && ytPlayer && isYtReady) {
    if (Math.abs(ytPlayer.getCurrentTime() - time) > 1.5) {
      ytPlayer.seekTo(time, true);
    }
    if (action === 'play') {
      ytPlayer.playVideo();
      showNotice(`▶️ ${sender} videonu başlatdı`);
    } else if (action === 'pause') {
      ytPlayer.pauseVideo();
      showNotice(`⏸️ ${sender} videonu saxladı`);
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
    } else if (action === 'pause') {
      directPlayer.pause();
      showNotice(`⏸️ ${sender} videonu saxladı`);
    } else if (action === 'seek') {
      directPlayer.currentTime = time;
      showNotice(`⏩ ${sender} vaxtı dəyişdi (${formatTime(time)})`);
    }
  }

  setTimeout(() => {
    isRemoteAction = false;
  }, 400);
}

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
  } else if (event.data === YT.PlayerState.PAUSED) {
    socket.emit('video-action', { action: 'pause', time: currentTime });
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
  });

  directPlayer.addEventListener('pause', () => {
    if (isRemoteAction || !socket) return;
    socket.emit('video-action', { action: 'pause', time: directPlayer.currentTime });
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

// Lokal Fayl Seçildikdə
inputLocalFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileUrl = URL.createObjectURL(file);
  applyVideoState({ type: 'direct', url: fileUrl, isPlaying: true, time: 0 });
  showNotice(`📁 Lokal fayl yükləndi: ${file.name}. Sevgiliniz də eyni faylı seçərsə sinxron baxacaqsınız!`);
});

// Sinxronlaşdır Düyməsi
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
// 6. WEBRTC TAB/EKRAN YAYIMI ("İstənilən Film Saytı")
// ==========================================

btnStartStream.addEventListener('click', async () => {
  try {
    // Səs və video ilə ekran/tab paylaşımı
    localScreenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
        frameRate: { ideal: 60 }
      },
      audio: true
    });

    // Öz pleyerimizdə göstər (səsi susdururuq ki, özümüzdə əks-səda verməsin)
    streamPlayer.srcObject = localScreenStream;
    streamPlayer.muted = true;
    streamPlayer.classList.remove('hidden');
    emptyPlayer.classList.add('hidden');

    btnStartStream.classList.add('hidden');
    btnStopStream.classList.remove('hidden');

    // Serverə xəbər ver ki, canlı yayım başladı
    socket.emit('change-video', { type: 'stream', url: 'live-tab' });

    // İstifadəçi brauzerdən "Stop sharing" basanda
    localScreenStream.getVideoTracks()[0].onended = stopScreenStream;

    showNotice('🎥 Film tabı yayımlanır! Sevgiliniz canlı izləyir.');
  } catch (err) {
    console.error('Ekran yayımı xətası:', err);
    alert('Yayımı başlatmaq üçün pəncərəni və ya tabı seçməlisiniz.');
  }
});

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

  btnStartStream.classList.remove('hidden');
  btnStopStream.classList.add('hidden');

  socket.emit('change-video', { type: 'empty', url: '' });
  showNotice('⏹️ Yayım dayandırıldı');
}

// Yayımçının Peer başlatması
async function initiateScreenPeer(targetSocketId) {
  if (!localScreenStream) return;

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

// İzləyicinin təklifi qəbul etməsi
async function handleScreenOffer(senderSocketId, sdp) {
  screenPeerConnection = new RTCPeerConnection(rtcConfig);

  screenPeerConnection.ontrack = (event) => {
    streamPlayer.srcObject = event.streams[0];
    streamPlayer.muted = false; // İzləyici səsi eşitsin
    streamPlayer.play().catch(() => {});
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

// ==========================================
// 7. WEBRTC SƏSLİ ZƏNG (MİKROFON)
// ==========================================

function setupVoiceChat() {
  btnVoiceToggle.addEventListener('click', async () => {
    if (!isVoiceActive) {
      try {
        localVoiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isVoiceActive = true;
        btnVoiceToggle.classList.add('active');
        btnVoiceToggle.querySelector('.mic-text').textContent = 'Səs: Açıq 🟢';
        showNotice('🎙️ Mikrofon açıldı. Sevgiliniz sizi eşidə bilər.');
      } catch (err) {
        alert('Mikrofon icazəsi verilmədi.');
      }
    } else {
      if (localVoiceStream) {
        localVoiceStream.getTracks().forEach(track => track.stop());
        localVoiceStream = null;
      }
      isVoiceActive = false;
      btnVoiceToggle.classList.remove('active');
      btnVoiceToggle.querySelector('.mic-text').textContent = 'Səs: Bağlı';
      showNotice('🎙️ Mikrofon bağlandı');
    }
  });
}

async function handleVoiceOffer(senderSocketId, sdp) {
  voicePeerConnection = new RTCPeerConnection(rtcConfig);
  voicePeerConnection.ontrack = (event) => {
    remoteVoiceAudio.srcObject = event.streams[0];
  };
  await voicePeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await voicePeerConnection.createAnswer();
  await voicePeerConnection.setLocalDescription(answer);
  socket.emit('voice-answer', { target: senderSocketId, sdp: answer });
}

// ==========================================
// 8. ÇAT VƏ UÇAN EMOJİLƏR
// ==========================================

function setupChatAndReactions() {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text || !socket) return;
    socket.emit('send-message', { text });
    chatInput.value = '';
  });

  // Reaksiyalar
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

  // Təsadüfi üfüqi mövqe (10% - 85%)
  const randomLeft = 10 + Math.random() * 75;
  el.style.left = `${randomLeft}%`;

  floatingEmojisContainer.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}

// ==========================================
// 9. KÖMƏKÇİ FUNKSİYALAR
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
  // Animasiyanı sıfırlamaq üçün
  syncNotice.style.animation = 'none';
  syncNotice.offsetHeight; /* trigger reflow */
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
