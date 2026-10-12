// ==========================================
// WATCHPARTY - CLIENT APP.JS
// ==========================================

let socket = null;
let currentRoom = null;
let currentUsername = 'İstifadəçi';
let isHost = false;
let currentUser = null;
let isSelfSpeaking = false;
let isRoomLocked = false;
let currentMovieRating = 10;

// Media & Pleyer vəziyyətləri
let ytPlayer = null;
let isYtReady = false;
let isRemoteAction = false;
let currentVideoState = { type: 'empty', url: '', isPlaying: false, time: 0 };

// WebRTC Tab Yayımı
let localScreenStream = null;
const screenBroadcasterPeers = {};
const screenBroadcasterIceQueues = {};
let screenViewerPeer = null;
let screenViewerIceQueue = [];

// WebRTC Səsli Zəng (Mikrofon & Audio Engine)
let localVoiceStream = null;
let isVoiceActive = false;
const voicePeerConnections = {};
const voiceIceCandidatesQueue = {};
const pcMakingOffer = {};
let vadInterval = null;
let vadAudioContext = null;
let isSpeakingLocally = false;
let currentRoomUsers = {};

// STUN və TURN Serverləri (Qlobal Relay - Fərqli Şəbəkələr və Mobil üçün Zəmanətli Səs)
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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

// Auth & Profil DOM elementləri
const btnOpenAuthLobby = document.getElementById('btn-open-auth-lobby');
const lobbyUserAvatar = document.getElementById('lobby-user-avatar');
const lobbyUserName = document.getElementById('lobby-user-name');
const inputAvatarPreview = document.getElementById('input-avatar-preview');
const headerUserProfile = document.getElementById('header-user-profile');
const headerUserAvatar = document.getElementById('header-user-avatar');
const headerUserName = document.getElementById('header-user-name');
const btnLogout = document.getElementById('btn-logout');

const modalAuth = document.getElementById('modal-auth');
const authStatusMsg = document.getElementById('auth-status-msg');

// Xüsusiyyət 1: Otaq Kilidi DOM
const btnLockRoom = document.getElementById('btn-lock-room');
const lockIcon = document.getElementById('lock-icon');
const lockText = document.getElementById('lock-text');

// Xüsusiyyət 3: Seans Sonu Qiymətləndirmə DOM
const btnOpenReview = document.getElementById('btn-open-review');
const modalReview = document.getElementById('modal-review');
const movieReviewForm = document.getElementById('movie-review-form');
const reviewMovieTitle = document.getElementById('review-movie-title');
const reviewMovieNote = document.getElementById('review-movie-note');
const starRatingNum = document.getElementById('star-rating-num');
const starsRow = document.getElementById('stars-row');

// Xüsusiyyət 4: İşıqları Söndür DOM
const btnDimLights = document.getElementById('btn-dim-lights');
const btnFloatingRestoreLights = document.getElementById('btn-floating-restore-lights');


// ==========================================
// 1. ÇOXDİLLİ SİSTEM (I18N) & TEMA SİSTEMİ
// ==========================================

let currentLang = 'az';

const I18N = {
  az: {
    langLabel: 'AZ',
    langFlag: '🇦🇿',
    topLogin: 'Google ilə Giriş',
    dropdownStatus: 'Google Hesabı Aktivdir',
    dropdownLogout: 'Hesabdan Çıx',
    navCharacters: 'Xarakterlər',
    navArchetypes: 'Arxetiplər',
    navRooms: 'Kino Otağı',
    heroBadge: 'İKİ EKRAN. TƏK DİVAN.',
    heroSlogan: 'Two screens. One couch.',
    heroDesc: 'İstənilən film saytından, Netflix və YouTube-dan dostlarınızla sanki eyni divanda yanaşı oturmuş kimi birlikdə izləyin və canlı danışın.',
    cineMainTitle: 'SƏHNƏ SƏNİNDİR',
    cineSubSlogan: 'Two screens. One couch.',
    btnHeroRoom: '🛋️ İndi Otaq Aç',
    btnHeroExplore: '🎭 Xarakterləri Kəşf Et',
    sectionTagArchetypes: '🎭 KİNO ARXETİPLƏRİ',
    archetypeTitle: 'Kult Qəhrəmanlar və Rollar',
    archetypeSub: 'Dünya kino tarixinin ən unudulmaz simvolları və xarakterləri.',
    charCyberBadge: 'SCI-FI',
    charCyberName: 'KİBER DÖYÜŞÇÜ',
    charCyberSub: 'Gələcək və Neon',
    charGodfatherBadge: 'AİLƏ & GÜC',
    charGodfatherName: 'XAÇ ATASI',
    charGodfatherSub: 'Don Vito Corleone',
    charHeisenbergRibbon: '⭐ KULT SİMA',
    charHeisenbergBadge: 'ZƏKA OYUNÇUSU',
    charHeisenbergName: 'HEİSENBERG',
    charHeisenbergSub: 'Walter White (Breaking Bad)',
    charBatmanBadge: 'QƏHRƏMAN',
    charBatmanName: 'QARANLIQ CƏNGAVƏR',
    charBatmanSub: 'The Dark Knight (Gotham)',
    charDetectiveBadge: 'NOİR DEDEKTİV',
    charDetectiveName: 'SİRR VƏ KÖLGƏ',
    charDetectiveSub: 'Klassik Kino Noiri',
    archCatHeisenberg: 'BREAKING BAD • ZƏKA',
    archTitleHeisenberg: 'Walter White — Heisenberg',
    archDescHeisenberg: 'Zəka, kimya və sonsuz strateji düşüncənin simvolu. Qazanmaq üçün hər həddi aşan dahi.',
    archCatBatman: 'DC CINEMA • ƏDALƏT',
    archTitleBatman: 'Batman — Qaranlıq Cəngavər',
    archDescBatman: 'Gecənin kölgəsində təkbaşına ədalət axtaran, sarsılmaz iradə və gücün tərənnümü.',
    archCatGodfather: 'KLASSİK KİNO • NÜFUZ',
    archTitleGodfather: 'Don Vito Corleone — Xaç Atası',
    archDescGodfather: 'Ailəyə sədaqət, intizam, sakitlik və sözün çəkisini bilən əfsanəvi lider obrazı.',
    archCatCyber: 'SCI-FI • KİBERPANK',
    archTitleCyber: 'Cyber Warrior — Kiber Döyüşçü',
    archDescCyber: 'Süni intellekt, neon işıqlar və rəqəmsal dünyanın gələcək döyüşçü cəngavəri.',
    hostBadge: '👑 Otaq Sahibi',
    hostLockRequired: '🔒 Google Tələb Olunur',
    hostLockActive: '🟢 Google ilə Aktivdir',
    hostTitle: 'Yeni Kino Otağı Yarat',
    hostDesc: 'Öz kinoteatr zalınızı başladın, filmi idarə edin və dostlarınıza link göndərin.',
    hostContinueGoogle: 'Continue with Google',
    hostHint: '⚡ 1 kliklə daxil olub dərhal otaq başladın',
    btnCreateRoom: '🛋️ Yeni Otaq Yarat',
    dividerOr: 'VƏ YA',
    guestBadge: '🚪 Qonaq və ya İştirakçı',
    guestTitle: 'Mövcud Otağa Qoşul',
    guestDesc: 'Dostunuzun otaq kodunu və ya dəvət linkini daxil edərək birbaşa qoşulun.',
    labelNickname: 'Adınız / Ləqəbiniz:',
    placeholderNickname: 'Məsələn: Əli',
    labelRoom: 'Otaq Kodu və ya Link:',
    placeholderRoom: 'Məs: kino-101',
    btnJoin: 'Otağa Daxil Ol',
    feat1Title: 'Bütün Saytlar',
    feat1Sub: 'WebRTC HD Səs',
    feat2Title: 'Səsli Zəng',
    feat2Sub: 'İkitərəfli Canlı',
    feat3Title: 'Səs Balansı',
    feat3Sub: 'Auto Ducking',
    feat4Title: 'Çarxıfələk',
    feat4Sub: 'Püşkatma Ruletkası',
    copyHint: '📋 Kopyala',
    noticeLogout: '👋 Hesabdan çıxış edildi',
    noticeLogin: '👤 Xoş gəldiniz',
    noticeRoomReq: '⚠️ Zəhmət olmasa otaq kodunu daxil edin!',
    noticeReturnLobby: '🛋️ Əsas ekrana qayıtdınız',
    confirmLeave: 'Kino otağından çıxıb əsas ekrana (Lobby) qayıtmaq istəyirsiniz?'
  },
  tr: {
    langLabel: 'TR',
    langFlag: '🇹🇷',
    topLogin: 'Google ile Giriş',
    dropdownStatus: 'Google Hesabı Aktif',
    dropdownLogout: 'Çıkış Yap',
    navCharacters: 'Karakterler',
    navArchetypes: 'Arketipler',
    navRooms: 'Sinema Odası',
    heroBadge: 'İKİ EKRAN. TEK KOLTUK.',
    heroSlogan: 'Two screens. One couch.',
    heroDesc: 'Tüm film sitelerinden, Netflix ve YouTube\'dan arkadaşlarınızla sanki aynı koltukta oturuyormuş gibi birlikte izleyin ve sesli sohbet edin.',
    cineMainTitle: 'SAHNE SENİNDİR',
    cineSubSlogan: 'Two screens. One couch.',
    btnHeroRoom: '🛋️ Şimdi Oda Aç',
    btnHeroExplore: '🎭 Karakterleri Keşfet',
    sectionTagArchetypes: '🎭 SİNEMA ARKETİPLERİ',
    archetypeTitle: 'Kült Kahramanlar ve Roller',
    archetypeSub: 'Dünya sinema tarihinin en unutulmaz ikonları ve karakterleri.',
    charCyberBadge: 'BİLİM KURGU',
    charCyberName: 'SİBER SAVAŞÇI',
    charCyberSub: 'Gelecek ve Neon',
    charGodfatherBadge: 'AİLE VE GÜÇ',
    charGodfatherName: 'BABA',
    charGodfatherSub: 'Don Vito Corleone',
    charHeisenbergRibbon: '⭐ KÜLT İKON',
    charHeisenbergBadge: 'ZEKA OYUNCUSU',
    charHeisenbergName: 'HEİSENBERG',
    charHeisenbergSub: 'Walter White (Breaking Bad)',
    charBatmanBadge: 'KAHRAMAN',
    charBatmanName: 'KARA ŞÖVALYE',
    charBatmanSub: 'The Dark Knight (Gotham)',
    charDetectiveBadge: 'NOİR DEDEKTİF',
    charDetectiveName: 'GİZEM VE GÖLGE',
    charDetectiveSub: 'Klasik Sinema Noiri',
    archCatHeisenberg: 'BREAKING BAD • ZEKA',
    archTitleHeisenberg: 'Walter White — Heisenberg',
    archDescHeisenberg: 'Zeka, kimya ve stratejik düşüncenin simgesi. Kazanmak için sınır tanımayan deha.',
    archCatBatman: 'DC CINEMA • ADALET',
    archTitleBatman: 'Batman — Kara Şövalye',
    archDescBatman: 'Gecenin gölgesinde adalet arayan, sarsılmaz irade ve gücün timsali.',
    archCatGodfather: 'KLASİK SİNEMA • NÜFUZ',
    archTitleGodfather: 'Don Vito Corleone — Baba',
    archDescGodfather: 'Aileye sadakat, disiplin ve sözünün ağırlığını bilen efsanevi lider.',
    archCatCyber: 'BİLİM KURGU • SİBERPANK',
    archTitleCyber: 'Cyber Warrior — Siber Savaşçı',
    archDescCyber: 'Yapay zeka, neon ışıklar ve dijital dünyanın gelecekteki savaşçısı.',
    hostBadge: '👑 Oda Sahibi',
    hostLockRequired: '🔒 Google Gerekli',
    hostLockActive: '🟢 Google ile Aktif',
    hostTitle: 'Yeni Sinema Odası Oluştur',
    hostDesc: 'Kendi sinema odanızı başlatın, filmi yönetin ve arkadaşlarınıza davet linki gönderin.',
    hostContinueGoogle: 'Continue with Google',
    hostHint: '⚡ 1 tıkla giriş yapıp hemen oda başlatın',
    btnCreateRoom: '🛋️ Yeni Oda Oluştur',
    dividerOr: 'VEYA',
    guestBadge: '🚪 Misafir veya Katılımcı',
    guestTitle: 'Mevcut Odaya Katıl',
    guestDesc: 'Arkadaşınızın oda kodunu veya davet bağlantısını girerek doğrudan katılın.',
    labelNickname: 'Adınız / Takma Adınız:',
    placeholderNickname: 'Örn: Ali',
    labelRoom: 'Oda Kodu veya Link:',
    placeholderRoom: 'Örn: sinema-101',
    btnJoin: 'Odaya Katıl',
    feat1Title: 'Tüm Siteler',
    feat1Sub: 'WebRTC HD Ses',
    feat2Title: 'Sesli Sohbet',
    feat2Sub: 'Canlı & Kesintisiz',
    feat3Title: 'Ses Dengesi',
    feat3Sub: 'Auto Ducking',
    feat4Title: 'Çarkıfelek',
    feat4Sub: 'Kura Ruleti',
    copyHint: '📋 Kopyala',
    noticeLogout: '👋 Hesaptan çıkış yapıldı',
    noticeLogin: '👤 Hoş geldiniz',
    noticeRoomReq: '⚠️ Lütfen oda kodunu girin!',
    noticeReturnLobby: '🛋️ Ana ekrana dönüldü',
    confirmLeave: 'Sinema odasından çıkıp ana ekrana (Lobi) dönmek istiyor musunuz?'
  },
  en: {
    langLabel: 'EN',
    langFlag: '🇬🇧',
    topLogin: 'Sign in with Google',
    dropdownStatus: 'Google Account Active',
    dropdownLogout: 'Log out',
    navCharacters: 'Characters',
    navArchetypes: 'Archetypes',
    navRooms: 'Cinema Room',
    heroBadge: 'TWO SCREENS. ONE COUCH.',
    heroSlogan: 'Two screens. One couch.',
    heroDesc: 'Watch movies together from any streaming site, Netflix & YouTube, and voice chat with friends like you are sitting on the same couch.',
    cineMainTitle: 'THE STAGE IS YOURS',
    cineSubSlogan: 'Two screens. One couch.',
    btnHeroRoom: '🛋️ Start Watch Party',
    btnHeroExplore: '🎭 Explore Characters',
    sectionTagArchetypes: '🎭 CINEMA ARCHETYPES',
    archetypeTitle: 'Cult Heroes & Icons',
    archetypeSub: 'The most unforgettable characters in cinematic history.',
    charCyberBadge: 'SCI-FI',
    charCyberName: 'CYBER WARRIOR',
    charCyberSub: 'Future & Neon',
    charGodfatherBadge: 'FAMILY & POWER',
    charGodfatherName: 'THE GODFATHER',
    charGodfatherSub: 'Don Vito Corleone',
    charHeisenbergRibbon: '⭐ CULT ICON',
    charHeisenbergBadge: 'MASTERMIND',
    charHeisenbergName: 'HEISENBERG',
    charHeisenbergSub: 'Walter White (Breaking Bad)',
    charBatmanBadge: 'VIGILANTE',
    charBatmanName: 'THE DARK KNIGHT',
    charBatmanSub: 'Batman (Gotham City)',
    charDetectiveBadge: 'NOIR DETECTIVE',
    charDetectiveName: 'MYSTERY & SHADOW',
    charDetectiveSub: 'Classic Film Noir',
    archCatHeisenberg: 'BREAKING BAD • GENIUS',
    archTitleHeisenberg: 'Walter White — Heisenberg',
    archDescHeisenberg: 'The ultimate symbol of intellect, chemistry, and strategy. A mastermind crossing every line to win.',
    archCatBatman: 'DC CINEMA • JUSTICE',
    archTitleBatman: 'Batman — The Dark Knight',
    archDescBatman: 'Standing alone in the shadows of the night, the embodiment of iron will and justice.',
    archCatGodfather: 'CLASSIC CINEMA • POWER',
    archTitleGodfather: 'Don Vito Corleone — The Godfather',
    archDescGodfather: 'Loyalty to family, quiet discipline, and the weight of an offer you cannot refuse.',
    archCatCyber: 'SCI-FI • CYBERPUNK',
    archTitleCyber: 'Cyber Warrior — Sci-Fi Samurai',
    archDescCyber: 'Artificial intelligence, neon streets, and the cybernetic frontier of the digital age.',
    hostBadge: '👑 Room Host',
    hostLockRequired: '🔒 Google Required',
    hostLockActive: '🟢 Google Active',
    hostTitle: 'Create New Cinema Room',
    hostDesc: 'Start your personal theater, control the playback, and share the invite link with friends.',
    hostContinueGoogle: 'Continue with Google',
    hostHint: '⚡ Sign in with 1 click to start your room',
    btnCreateRoom: '🛋️ Create New Room',
    dividerOr: 'OR',
    guestBadge: '🚪 Guest / Participant',
    guestTitle: 'Join Existing Room',
    guestDesc: 'Enter your friend\'s room code or invite link to join instantly.',
    labelNickname: 'Your Name / Nickname:',
    placeholderNickname: 'e.g. Alex',
    labelRoom: 'Room Code or Link:',
    placeholderRoom: 'e.g. movie-101',
    btnJoin: 'Join Room',
    feat1Title: 'Any Website',
    feat1Sub: 'WebRTC HD Audio',
    feat2Title: 'Voice Chat',
    feat2Sub: 'Two-way Live',
    feat3Title: 'Audio Ducking',
    feat3Sub: 'Smart Ducking',
    feat4Title: 'Movie Wheel',
    feat4Sub: 'Random Picker',
    copyHint: '📋 Copy',
    noticeLogout: '👋 Logged out successfully',
    noticeLogin: '👤 Welcome',
    noticeRoomReq: '⚠️ Please enter room code!',
    noticeReturnLobby: '🛋️ Returned to Lobby',
    confirmLeave: 'Do you want to leave the cinema room and return to the lobby?'
  },
  ru: {
    langLabel: 'RU',
    langFlag: '🇷🇺',
    topLogin: 'Вход через Google',
    dropdownStatus: 'Google Аккаунт Активен',
    dropdownLogout: 'Выйти',
    navCharacters: 'Персонажи',
    navArchetypes: 'Архетипы',
    navRooms: 'Кинокомната',
    heroBadge: 'ДВА ЭКРАНА. ОДИН ДИВАН.',
    heroSlogan: 'Two screens. One couch.',
    heroDesc: 'Смотрите фильмы с любых сайтов, Netflix и YouTube вместе с друзьями и общайтесь голосом, будто сидите на одном диване.',
    cineMainTitle: 'СЦЕНА ЗА ТОБОЙ',
    cineSubSlogan: 'Two screens. One couch.',
    btnHeroRoom: '🛋️ Создать Комнату',
    btnHeroExplore: '🎭 Исследовать',
    sectionTagArchetypes: '🎭 КИНОАРХЕТИПЫ',
    archetypeTitle: 'Культовые Персонажи',
    archetypeSub: 'Самые незабываемые образы мирового кинематографа.',
    charCyberBadge: 'НАУЧ. ФАНТ.',
    charCyberName: 'КИБЕР-ВОИН',
    charCyberSub: 'Будущее и Неон',
    charGodfatherBadge: 'СЕМЬЯ И ВЛАСТЬ',
    charGodfatherName: 'КРЁСТНЫЙ ОТЕЦ',
    charGodfatherSub: 'Дон Вито Корлеоне',
    charHeisenbergRibbon: '⭐ КУЛЬТОВЫЙ ОБРАЗ',
    charHeisenbergBadge: 'ГЕНИЙ РАСЧЁТА',
    charHeisenbergName: 'ХАЙЗЕНБЕРГ',
    charHeisenbergSub: 'Уолтер Уайт (Во все тяжкие)',
    charBatmanBadge: 'ТЁМНЫЙ СТРАЖ',
    charBatmanName: 'ТЁМНЫЙ РЫЦАРЬ',
    charBatmanSub: 'Бэтмен (Готэм-Сити)',
    charDetectiveBadge: 'НУАР ДЕТЕКТИВ',
    charDetectiveName: 'ТАЙНА И ТЕНЬ',
    charDetectiveSub: 'Классический Нуар',
    archCatHeisenberg: 'BREAKING BAD • ИНТЕЛЛЕКТ',
    archTitleHeisenberg: 'Уолтер Уайт — Хайзенберг',
    archDescHeisenberg: 'Символ интеллекта, химии и стратегии. Гений, переступающий любые грани ради победы.',
    archCatBatman: 'DC CINEMA • ПРАВОСУДИЕ',
    archTitleBatman: 'Бэтмен — Тёмный Рыцарь',
    archDescBatman: 'Одинокий защитник в тени ночи, воплощение несгибаемой воли и справедливости.',
    archCatGodfather: 'КЛАССИКА • ВЛИЯНИЕ',
    archTitleGodfather: 'Дон Вито Корлеоне — Крёстный Отец',
    archDescGodfather: 'Преданность семье, железная выдержка и непререкаемый авторитет легендарного лидера.',
    archCatCyber: 'НАУЧ. ФАНТ • КИБЕРПАНК',
    archTitleCyber: 'Cyber Warrior — Кибер-Воин',
    archDescCyber: 'Искусственный интеллект, неоновые огни и цифровой воин будущего.',
    hostBadge: '👑 Создатель',
    hostLockRequired: '🔒 Требуется Google',
    hostLockActive: '🟢 Google Активен',
    hostTitle: 'Создать Кинокомнату',
    hostDesc: 'Создайте свой кинозал, управляйте просмотром и отправьте ссылку друзьям.',
    hostContinueGoogle: 'Continue with Google',
    hostHint: '⚡ Войдите в 1 клик и сразу начните',
    btnCreateRoom: '🛋️ Создать Комнату',
    dividerOr: 'ИЛИ',
    guestBadge: '🚪 Гость или Участник',
    guestTitle: 'Присоединиться к Комнате',
    guestDesc: 'Введите код комнаты или ссылку приглашения от друга, чтобы присоединиться.',
    labelNickname: 'Ваше Имя / Никнейм:',
    placeholderNickname: 'Напр: Алекс',
    labelRoom: 'Код Комнаты или Ссылка:',
    placeholderRoom: 'Напр: kino-101',
    btnJoin: 'Войти в Комнату',
    feat1Title: 'Любые Сайты',
    feat1Sub: 'WebRTC HD Звук',
    feat2Title: 'Голосовой Чат',
    feat2Sub: 'Двусторонний',
    feat3Title: 'Баланс Звука',
    feat3Sub: 'Авто-приглушение',
    feat4Title: 'Колесо Фортуны',
    feat4Sub: 'Случайный Выбор',
    copyHint: '📋 Копировать',
    noticeLogout: '👋 Вы вышли из аккаунта',
    noticeLogin: '👤 Добро пожаловать',
    noticeRoomReq: '⚠️ Пожалуйста, введите код комнаты!',
    noticeReturnLobby: '🛋️ Возврат на главный экран',
    confirmLeave: 'Вы действительно хотите покинуть кинокомнату и вернуться в лобби?'
  }
};

function setLanguage(lang) {
  if (!I18N[lang]) lang = 'az';
  currentLang = lang;
  try { localStorage.setItem('onecouch_lang', lang); } catch (e) {}

  const t = I18N[lang];
  const el = (id) => document.getElementById(id);

  if (el('current-lang-label')) el('current-lang-label').textContent = t.langLabel;
  if (el('top-login-label')) el('top-login-label').textContent = t.topLogin;
  if (el('dropdown-status-text')) el('dropdown-status-text').textContent = t.dropdownStatus;
  if (el('dropdown-logout-label')) el('dropdown-logout-label').textContent = t.dropdownLogout;
  if (el('nav-link-characters')) el('nav-link-characters').textContent = t.navCharacters;
  if (el('nav-link-archetypes')) el('nav-link-archetypes').textContent = t.navArchetypes;
  if (el('nav-link-rooms')) el('nav-link-rooms').textContent = t.navRooms;
  if (el('lobby-hero-badge')) el('lobby-hero-badge').textContent = t.heroBadge;
  if (el('lobby-hero-desc')) el('lobby-hero-desc').textContent = t.heroDesc;
  if (el('cine-main-title')) el('cine-main-title').textContent = t.cineMainTitle;
  if (el('cine-sub-slogan')) el('cine-sub-slogan').textContent = t.cineSubSlogan;

  if (el('btn-hero-cta-room')) {
    const span = el('btn-hero-cta-room').querySelector('span');
    if (span) span.textContent = t.btnHeroRoom;
  }
  if (el('btn-hero-cta-explore')) {
    const span = el('btn-hero-cta-explore').querySelector('span');
    if (span) span.textContent = t.btnHeroExplore;
  }

  // 3D Fanned Cards
  if (el('char-badge-cyberpunk')) el('char-badge-cyberpunk').textContent = t.charCyberBadge;
  if (el('char-name-cyberpunk')) el('char-name-cyberpunk').textContent = t.charCyberName;
  if (el('char-sub-cyberpunk')) el('char-sub-cyberpunk').textContent = t.charCyberSub;

  if (el('char-badge-godfather')) el('char-badge-godfather').textContent = t.charGodfatherBadge;
  if (el('char-name-godfather')) el('char-name-godfather').textContent = t.charGodfatherName;
  if (el('char-sub-godfather')) el('char-sub-godfather').textContent = t.charGodfatherSub;

  if (el('char-ribbon-heisenberg')) el('char-ribbon-heisenberg').textContent = t.charHeisenbergRibbon;
  if (el('char-badge-heisenberg')) el('char-badge-heisenberg').textContent = t.charHeisenbergBadge;
  if (el('char-name-heisenberg')) el('char-name-heisenberg').textContent = t.charHeisenbergName;
  if (el('char-sub-heisenberg')) el('char-sub-heisenberg').textContent = t.charHeisenbergSub;

  if (el('char-badge-batman')) el('char-badge-batman').textContent = t.charBatmanBadge;
  if (el('char-name-batman')) el('char-name-batman').textContent = t.charBatmanName;
  if (el('char-sub-batman')) el('char-sub-batman').textContent = t.charBatmanSub;

  if (el('char-badge-detective')) el('char-badge-detective').textContent = t.charDetectiveBadge;
  if (el('char-name-detective')) el('char-name-detective').textContent = t.charDetectiveName;
  if (el('char-sub-detective')) el('char-sub-detective').textContent = t.charDetectiveSub;

  // Section 1.5 Archetypes
  if (el('section-tag-archetypes')) el('section-tag-archetypes').textContent = t.sectionTagArchetypes;
  if (el('archetypes-title-text')) el('archetypes-title-text').textContent = t.archetypeTitle;
  if (el('archetypes-sub-text')) el('archetypes-sub-text').textContent = t.archetypeSub;

  if (el('arch-cat-heisenberg')) el('arch-cat-heisenberg').textContent = t.archCatHeisenberg;
  if (el('arch-title-heisenberg')) el('arch-title-heisenberg').textContent = t.archTitleHeisenberg;
  if (el('arch-desc-heisenberg')) el('arch-desc-heisenberg').textContent = t.archDescHeisenberg;

  if (el('arch-cat-batman')) el('arch-cat-batman').textContent = t.archCatBatman;
  if (el('arch-title-batman')) el('arch-title-batman').textContent = t.archTitleBatman;
  if (el('arch-desc-batman')) el('arch-desc-batman').textContent = t.archDescBatman;

  if (el('arch-cat-godfather')) el('arch-cat-godfather').textContent = t.archCatGodfather;
  if (el('arch-title-godfather')) el('arch-title-godfather').textContent = t.archTitleGodfather;
  if (el('arch-desc-godfather')) el('arch-desc-godfather').textContent = t.archDescGodfather;

  if (el('arch-cat-cyberpunk')) el('arch-cat-cyberpunk').textContent = t.archCatCyber;
  if (el('arch-title-cyberpunk')) el('arch-title-cyberpunk').textContent = t.archTitleCyber;
  if (el('arch-desc-cyberpunk')) el('arch-desc-cyberpunk').textContent = t.archDescCyber;

  if (el('host-badge-text')) el('host-badge-text').textContent = t.hostBadge;
  if (el('host-title-text')) el('host-title-text').textContent = t.hostTitle;
  if (el('host-desc-text')) el('host-desc-text').textContent = t.hostDesc;
  if (el('btn-host-google-text')) el('btn-host-google-text').textContent = t.hostContinueGoogle;
  if (el('host-hint-text')) el('host-hint-text').textContent = t.hostHint;
  if (el('btn-create-room-text')) el('btn-create-room-text').textContent = t.btnCreateRoom;
  if (el('divider-or-text')) el('divider-or-text').textContent = t.dividerOr;
  if (el('guest-badge-text')) el('guest-badge-text').textContent = t.guestBadge;
  if (el('guest-title-text')) el('guest-title-text').textContent = t.guestTitle;
  if (el('guest-desc-text')) el('guest-desc-text').textContent = t.guestDesc;
  if (el('label-nickname-text')) el('label-nickname-text').textContent = t.labelNickname;
  if (usernameInput) usernameInput.placeholder = t.placeholderNickname;
  if (el('label-room-text')) el('label-room-text').textContent = t.labelRoom;
  if (roomInput) roomInput.placeholder = t.placeholderRoom;
  if (el('btn-join-text')) el('btn-join-text').textContent = t.btnJoin;
  if (el('feat-1-title')) el('feat-1-title').textContent = t.feat1Title;
  if (el('feat-1-sub')) el('feat-1-sub').textContent = t.feat1Sub;
  if (el('feat-2-title')) el('feat-2-title').textContent = t.feat2Title;
  if (el('feat-2-sub')) el('feat-2-sub').textContent = t.feat2Sub;
  if (el('feat-3-title')) el('feat-3-title').textContent = t.feat3Title;
  if (el('feat-3-sub')) el('feat-3-sub').textContent = t.feat3Sub;
  if (el('feat-4-title')) el('feat-4-title').textContent = t.feat4Title;
  if (el('feat-4-sub')) el('feat-4-sub').textContent = t.feat4Sub;
  if (el('copy-hint-text')) el('copy-hint-text').textContent = t.copyHint;

  document.querySelectorAll('.lang-option').forEach(opt => {
    if (opt.getAttribute('data-lang') === lang) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  updateUserUI();
}

function setupLanguageSwitcher() {
  const btnLangToggle = document.getElementById('btn-lang-toggle');
  const langMenuDropdown = document.getElementById('lang-menu-dropdown');
  if (btnLangToggle && langMenuDropdown) {
    btnLangToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenuDropdown.classList.toggle('hidden');
      const profileCard = document.getElementById('profile-dropdown-card');
      if (profileCard) profileCard.classList.add('hidden');
    });
  }

  const langOptions = document.querySelectorAll('.lang-option');
  langOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const lang = opt.getAttribute('data-lang');
      if (lang) {
        setLanguage(lang);
      }
      if (langMenuDropdown) {
        langMenuDropdown.classList.add('hidden');
      }
    });
  });
}

function setupMiniMovieFigures() {
  const charDetailsByLang = {
    az: {
      cyberpunk: { emoji: '⚡', title: 'Kiber Döyüşçü (Sci-Fi)' },
      godfather: { emoji: '🌹', title: 'Don Vito Corleone (Xaç Atası)' },
      heisenberg: { emoji: '🧪', title: 'Walter White (Heisenberg)' },
      batman: { emoji: '🦇', title: 'Batman (Qaranlıq Cəngavər)' },
      detective: { emoji: '🕶️', title: 'Noir Dedektiv (Klassik)' }
    },
    tr: {
      cyberpunk: { emoji: '⚡', title: 'Siber Savaşçı (Bilim Kurgu)' },
      godfather: { emoji: '🌹', title: 'Don Vito Corleone (Baba)' },
      heisenberg: { emoji: '🧪', title: 'Walter White (Heisenberg)' },
      batman: { emoji: '🦇', title: 'Batman (Kara Şövalye)' },
      detective: { emoji: '🕶️', title: 'Noir Dedektif (Klasik)' }
    },
    en: {
      cyberpunk: { emoji: '⚡', title: 'Cyber Warrior (Sci-Fi)' },
      godfather: { emoji: '🌹', title: 'Don Vito Corleone (The Godfather)' },
      heisenberg: { emoji: '🧪', title: 'Walter White (Heisenberg)' },
      batman: { emoji: '🦇', title: 'Batman (The Dark Knight)' },
      detective: { emoji: '🕶️', title: 'Noir Detective (Classic)' }
    },
    ru: {
      cyberpunk: { emoji: '⚡', title: 'Кибер-Воин (Науч. Фант.)' },
      godfather: { emoji: '🌹', title: 'Дон Вито Корлеоне (Крёстный Отец)' },
      heisenberg: { emoji: '🧪', title: 'Уолтер Уайт (Хайзенберг)' },
      batman: { emoji: '🦇', title: 'Бэтмен (Тёмный Рыцарь)' },
      detective: { emoji: '🕶️', title: 'Нуар Детектив (Классика)' }
    }
  };

  // 1. 3D Fanned Character Cards
  document.querySelectorAll('.cine-char-card').forEach(card => {
    card.addEventListener('click', () => {
      const charKey = card.getAttribute('data-char');
      const langDict = charDetailsByLang[currentLang] || charDetailsByLang.az;
      const info = langDict[charKey] || { emoji: '🍿', title: 'Hero' };
      
      if (typeof selectedAvatarChoice !== 'undefined') {
        selectedAvatarChoice = info.emoji;
      }
      const avatarPreview = document.getElementById('input-avatar-preview');
      if (avatarPreview) {
        avatarPreview.textContent = info.emoji;
        avatarPreview.style.transform = 'scale(1.3)';
        setTimeout(() => { avatarPreview.style.transform = ''; }, 300);
      }

      // Xarakterə uyğun otaq mövzusunu sinxronlaşdır
      if (charKey === 'heisenberg') {
        applyTheme('theme-breaking-bad', false);
      } else if (charKey === 'batman') {
        applyTheme('theme-batman', false);
      } else if (charKey === 'cyberpunk') {
        applyTheme('theme-matrix', false);
      } else if (charKey === 'godfather') {
        applyTheme('theme-netflix', false);
      }

      if (typeof spawnFloatingEmoji === 'function') {
        spawnFloatingEmoji(info.emoji);
        spawnFloatingEmoji('✨');
        spawnFloatingEmoji('⭐');
      }

      const selectedWord = {
        az: 'seçildi!',
        tr: 'seçildi!',
        en: 'selected!',
        ru: 'выбран!'
      }[currentLang] || 'seçildi!';

      showNotice(`🎭 ${info.title} ${selectedWord}`);
    });
  });

  // 2. Archetype Cards Click
  document.querySelectorAll('.archetype-card').forEach(card => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.arch-title')?.textContent || 'Arxetip';
      if (typeof spawnFloatingEmoji === 'function') {
        spawnFloatingEmoji('🎬');
        spawnFloatingEmoji('✨');
      }
      showNotice(`🎬 ${title}`);
    });
  });
}

function fixImageSources() {
  const tryRepair = (img) => {
    const attempts = parseInt(img.dataset.imgRetry || '0', 10);
    if (attempts >= 3) return;
    img.dataset.imgRetry = (attempts + 1).toString();

    const currentSrc = img.getAttribute('src') || '';
    if (!currentSrc || currentSrc.startsWith('data:')) return;

    if (attempts === 0) {
      if (currentSrc.startsWith('/assets/')) {
        img.src = currentSrc.substring(1);
      } else if (currentSrc.startsWith('assets/')) {
        img.src = '/' + currentSrc;
      } else {
        img.src = 'assets/' + currentSrc.replace(/^(\.\/|\/)/, '');
      }
    } else if (attempts === 1) {
      const cleanPath = currentSrc.replace(/^.*assets\//, 'assets/');
      img.src = './' + cleanPath;
    } else if (attempts === 2) {
      const cleanPath = currentSrc.replace(/^.*assets\//, 'public/assets/');
      img.src = '/' + cleanPath;
    }
  };

  document.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      tryRepair(img);
    }
    img.addEventListener('error', function() {
      tryRepair(this);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  fixImageSources();
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam) {
    const cleanRoom = roomParam.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanRoom) {
      if (roomInput) roomInput.value = cleanRoom;

      // Link ilə gələn istifadəçiyə avtomatik ad və avatar təyin edib birbaşa daxil olmaq
      let joinUsername = '';
      if (currentUser && currentUser.username) {
        joinUsername = currentUser.username;
      } else if (usernameInput && usernameInput.value.trim()) {
        joinUsername = usernameInput.value.trim();
      } else {
        const guestNames = ['KinoSevər', 'Tamaşaçı', 'FilmHəvəskarı', 'CouchDost', 'Sinefil', 'Qonaq'];
        const randName = guestNames[Math.floor(Math.random() * guestNames.length)];
        const randNum = Math.floor(100 + Math.random() * 900);
        joinUsername = `${randName}-${randNum}`;
        if (usernameInput) usernameInput.value = joinUsername;
      }

      const randomAvatars = ['🍿', '🎬', '🥤', '🍕', '🕶️', '⚡', '🦇', '🍫'];
      const joinAvatar = (currentUser && currentUser.avatar) ? currentUser.avatar : randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
      if (typeof selectedAvatarChoice !== 'undefined') {
        selectedAvatarChoice = joinAvatar;
      }

      // Linklə gələn qonaq üçün birbaşa otaq açılır (Heç bir qeydiyyat və ya gözləmə tələb olunmur)
      setTimeout(() => {
        enterRoomWithId(cleanRoom, joinUsername, false);
      }, 250);
    }
  }

  // Kult Film/Serial Tema Seçicisi (Yalnız Otaq Daxilində)
  const themeSelect = document.getElementById('theme-select');
  const savedTheme = localStorage.getItem('watchparty-theme') || 'theme-netflix';
  applyTheme(savedTheme);

  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
  }

  // Təsadüfi otaq adı
  if (btnRandomRoom) {
    btnRandomRoom.addEventListener('click', () => {
      const prefixes = ['couch', 'kino', 'party', 'cinema', 'spiderman', 'matrix', 'heisenberg', 'winterfell', 'gotham'];
      const randNum = Math.floor(100 + Math.random() * 900);
      const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      if (roomInput) roomInput.value = `${randPrefix}-${randNum}`;
    });
  }

  // 0. Loqoya basdıqda otaqdan çıxıb əsas ekrana (Lobby) qayıtmaq və URL-i təmizləmək
  const brandLogo = document.getElementById('brand-logo-text');
  if (brandLogo) {
    brandLogo.addEventListener('click', leaveRoomAndReturnToLobby);
  }

  // Otağa giriş & Otaq yaratma düymələri
  const btnCreateRoom = document.getElementById('btn-create-room');
  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('click', handleHostCreateRoom);
  }
  if (btnEnterRoom) {
    btnEnterRoom.addEventListener('click', handleGuestEnterRoom);
  }
  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGuestEnterRoom(); });
  }
  if (roomInput) {
    roomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGuestEnterRoom(); });
  }

  // Dil Dəstəyi (I18N)
  setupLanguageSwitcher();
  const savedLang = localStorage.getItem('onecouch_lang') || 'az';
  setLanguage(savedLang);

  // 🌓 Gündüz / Gecə Rejimi (Lobby Light/Dark Mode)
  setupLobbyMode();

  // Balaca Kino Fiqurları İnteraktivliyi
  setupMiniMovieFigures();

  setupTabs();
  setupDirectPlayerEvents();
  setupChatAndReactions();
  setupVoiceChat();
  setupModalsAndFeatures();
  setupAuth();
  setupRoomLock();
  setupMovieReview();
  setupLightsDimmer();
});

// ==========================================
// LOBBY LIGHT / DARK MODE CONTROLLER
// ==========================================
function applyLobbyMode(mode) {
  const currentMode = mode === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-mode', currentMode);
  try {
    localStorage.setItem('onecouch_lobby_mode', currentMode);
  } catch (e) {}

  const toggleBtn = document.getElementById('btn-mode-toggle');
  if (toggleBtn) {
    const sunIcon = toggleBtn.querySelector('.mode-icon-sun');
    const moonIcon = toggleBtn.querySelector('.mode-icon-moon');
    const label = document.getElementById('mode-label-text');

    if (currentMode === 'light') {
      if (sunIcon) sunIcon.classList.remove('hidden');
      if (moonIcon) moonIcon.classList.add('hidden');
      if (label) label.textContent = 'Light';
    } else {
      if (sunIcon) sunIcon.classList.add('hidden');
      if (moonIcon) moonIcon.classList.remove('hidden');
      if (label) label.textContent = 'Dark';
    }
  }
}

function setupLobbyMode() {
  let savedMode = 'dark';
  try {
    savedMode = localStorage.getItem('onecouch_lobby_mode') || 'dark';
  } catch (e) {}
  applyLobbyMode(savedMode);

  const toggleBtn = document.getElementById('btn-mode-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-mode') || 'dark';
      const nextMode = current === 'light' ? 'dark' : 'light';
      applyLobbyMode(nextMode);
    });
  }
}

function applyTheme(themeName, syncWithRoom = true) {
  document.body.className = themeName;
  localStorage.setItem('watchparty-theme', themeName);

  // Hər iki dropdown-u sinxronlaşdır
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.value = themeName;
  const lobbyThemeSelect = document.getElementById('lobby-theme-select');
  if (lobbyThemeSelect) lobbyThemeSelect.value = themeName;

  // Otaqda olan digər iştirakçılarla dərhal sinxronlaşdır
  if (syncWithRoom && socket && currentRoom) {
    socket.emit('change-room-theme', { theme: themeName });
  }

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
      logo.innerHTML = '🛋️ One<span>Couch</span>';
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

function handleHostCreateRoom() {
  if (!currentUser || !currentUser.isGoogle) {
    alert('🔒 Yeni kino otağı yaratmaq üçün Google hesabı ilə daxil olmalısınız!\n\n(Qonaqlar yalnız dostlarının açdığı otağa qoşula bilər).');
    openAuthModal();
    return;
  }

  const prefixes = ['couch', 'kino', 'party', 'cinema', 'spiderman', 'matrix', 'heisenberg', 'winterfell', 'gotham'];
  const randNum = Math.floor(100 + Math.random() * 900);
  const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const newRoomId = `${randPrefix}-${randNum}`;

  enterRoomWithId(newRoomId, currentUser.username, true);
}

async function handleGuestEnterRoom() {
  const enteredRoom = roomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const username = usernameInput.value.trim() || (currentUser ? currentUser.username : 'Qonaq');

  if (!enteredRoom) {
    const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;
    alert(t ? t.noticeRoomReq : 'Zəhmət olmasa otaq kodunu və ya dəvət linkini daxil edin!');
    roomInput.focus();
    return;
  }

  // Serverdə bu adda otağın olub-olmadığını yoxla
  try {
    const res = await fetch(`/api/rooms/check/${enteredRoom}`);
    const data = await res.json();
    if (!data.exists) {
      if (!currentUser || !currentUser.isGoogle) {
        alert(`❌ "${enteredRoom}" adlı aktiv otaq tapılmadı!\n\nQeydiyyatsız yalnız dostunuzun açdığı mövcud otağa qoşula bilərsiniz. Yeni otaq yaratmaq üçün isə Google hesabı ilə daxil olun.`);
        openAuthModal();
        return;
      } else {
        const confirmCreate = confirm(`"${enteredRoom}" adlı otaq hələ açılmayıb. Bu kodla yeni otaq yaratmaq istəyirsiniz?`);
        if (!confirmCreate) return;
      }
    }
  } catch (err) {
    console.warn('Otaq yoxlanışında xəta:', err);
  }

  enterRoomWithId(enteredRoom, username, false);
}

function enterRoomWithId(roomId, username, isHostIntent) {
  currentUsername = username || (currentUser ? currentUser.username : 'İstifadəçi');
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

function forceLeaveRoomAndReturnToLobby(customNotice) {
  const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;

  // 1. WebRTC və ekran/səs yayımlarını dayandır
  if (localScreenStream) {
    try { localScreenStream.getTracks().forEach(track => track.stop()); } catch (e) {}
    localScreenStream = null;
  }
  Object.values(screenBroadcasterPeers).forEach(pc => {
    try { pc.close(); } catch (e) {}
  });
  for (const k in screenBroadcasterPeers) delete screenBroadcasterPeers[k];
  for (const k in screenBroadcasterIceQueues) delete screenBroadcasterIceQueues[k];
  if (screenViewerPeer) {
    try { screenViewerPeer.close(); } catch (e) {}
    screenViewerPeer = null;
  }
  screenViewerIceQueue = [];
  if (localVoiceStream) {
    try { localVoiceStream.getTracks().forEach(track => track.stop()); } catch (e) {}
    localVoiceStream = null;
  }
  if (typeof voicePeerConnections === 'object') {
    Object.values(voicePeerConnections).forEach(pc => {
      try { pc.close(); } catch (e) {}
    });
  }

  // 2. Videoları dayandır
  if (directPlayer) {
    try {
      directPlayer.pause();
      directPlayer.removeAttribute('src');
      directPlayer.load();
    } catch (e) {}
  }
  if (ytPlayer && ytPlayer.stopVideo) {
    try { ytPlayer.stopVideo(); } catch (e) {}
  }

  // 3. Socket əlaqəsini bağla (Serverə çıxış siqnalı göndər)
  if (socket) {
    try {
      socket.emit('leave-room');
      socket.disconnect();
    } catch (e) {}
    socket = null;
  }

  // 4. URL-i tam təmizlə: ?room=cinema-129 və s. silinir, yalnız ana səhifə qalır
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.pushState({ path: cleanUrl }, '', cleanUrl);

  // 5. Otaq dəyişənlərini sıfırla
  currentRoom = null;
  isHost = false;
  if (roomInput) roomInput.value = '';

  // 6. Ekranları dəyişdir
  if (roomScreen) roomScreen.classList.remove('active');
  if (lobbyScreen) lobbyScreen.classList.add('active');

  // 7. UI-ı yenilə
  updateUserUI();
  showNotice(customNotice || (t ? t.noticeReturnLobby : '🛋️ Əsas ekrana qayıtdınız'));
}

function leaveRoomAndReturnToLobby() {
  const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;
  if (roomScreen && roomScreen.classList.contains('active')) {
    const confirmMsg = isHost
      ? '👑 Otaq rəhbərisiniz. Çıxsanız, kino zalı hər kəs üçün bağlanacaq. Çıxmaq istəyirsiniz?'
      : (t ? t.confirmLeave : 'Kino otağından çıxıb əsas ekrana (Lobby) qayıtmaq istəyirsiniz?');
    const confirmLeave = confirm(confirmMsg);
    if (!confirmLeave) return;
  } else {
    return;
  }

  forceLeaveRoomAndReturnToLobby();
}

// ==========================================
// 2. SOCKET.IO SİSTEMİ
// ==========================================

function initSocket() {
  socket = io();

  socket.emit('join-room', {
    roomId: currentRoom,
    username: currentUsername,
    avatar: currentUser ? currentUser.avatar : '🍿',
    authUserId: currentUser ? currentUser.id : null,
    isGoogleAuth: !!(currentUser && currentUser.isGoogle),
    initialTheme: localStorage.getItem('watchparty-theme') || 'theme-netflix'
  });

  socket.on('room-joined', (data) => {
    isHost = data.isHost;
    if (data.theme) {
      applyTheme(data.theme, false);
    }
    if (data.users) {
      currentRoomUsers = data.users;
      updateUsersList(data.users);
      // Səs axını 100% zəmanətli WebSocket PCM Relay ilə ötürülür
    }
    if (data.isLocked !== undefined) {
      isRoomLocked = data.isLocked;
      updateRoomLockUI(data.isLocked);
    }
    if (data.videoState && data.videoState.type !== 'empty') {
      applyVideoState(data.videoState, false);
    }
    if (data.watchlist) {
      currentWatchlist = data.watchlist;
      renderWatchlist(data.watchlist);
      drawWheel();
    }
    if (data.lightsDimmed !== undefined) {
      applyRoomLights(data.lightsDimmed);
    }
    if (data.history) renderHistory(data.history);
    showNotice(isHost ? '👑 Otaq rəhbərisiniz. Xoş gəldiniz!' : '🍿 Otağa qoşuldunuz!');
  });

  socket.on('room-lights-changed', ({ dimmed, by }) => {
    applyRoomLights(dimmed);
    showNotice(`💡 ${by} kinoteatr işıqlarını ${dimmed ? 'söndürdü' : 'yandırdı'}`);
  });

  socket.on('room-theme-changed', ({ theme, changedBy }) => {
    applyTheme(theme, false);
    showNotice(`🎨 Otaq mövzusu yeniləndi: ${getThemeName(theme)} (${changedBy})`);
  });

  socket.on('voice-users-updated', (users) => {
    if (users) {
      currentRoomUsers = users;
      updateUsersList(users);
    }
  });

  socket.on('room-create-denied', (data) => {
    alert(`⛔ ${data.message || 'Yeni otaq yaratmaq üçün Google hesabı ilə daxil olmalısınız!'}`);
    roomScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    openAuthModal();
  });

  socket.on('room-locked-denied', (data) => {
    alert(`⛔ ${data.message || 'Bu otaq hal-hazırda kilidlənib! Host yalnız dəvətli üzvlərə icazə verir.'}`);
    forceLeaveRoomAndReturnToLobby();
  });

  // Otaq bağlandıqda (Otaq rəhbəri çıxdıqda bütün otaq avtomatik bağlanır)
  socket.on('room-closed', (data) => {
    alert(`🛋️ ${data.message || 'Otaq rəhbəri çıxdığı üçün kino zalı bağlandı.'}`);
    forceLeaveRoomAndReturnToLobby('🛋️ Otaq rəhbəri çıxdığı üçün zal bağlandı');
  });

  // Host tərəfindən otaqdan çıxarıldıqda (Kick)
  socket.on('kicked-from-room', (data) => {
    alert(`⛔ ${data.message || 'Otaq rəhbəri tərəfindən otaqdan çıxarıldınız.'}`);
    forceLeaveRoomAndReturnToLobby('⛔ Otaq rəhbəri tərəfindən çıxarıldınız');
  });

  socket.on('room-lock-status', ({ isLocked, lockedBy }) => {
    isRoomLocked = isLocked;
    updateRoomLockUI(isLocked);
    showNotice(isLocked ? `🔒 Otaq ${lockedBy || 'Host'} tərəfindən kilidləndi!` : `🔓 Otaq kilidi açıldı!`);
  });

  socket.on('peer-speaking', ({ socketId, isSpeaking }) => {
    const peerPill = document.getElementById(`user-pill-${socketId}`);
    if (peerPill) {
      if (isSpeaking) peerPill.classList.add('speaking-halo');
      else peerPill.classList.remove('speaking-halo');
    }
    const peerCard = document.getElementById(`participant-item-${socketId}`);
    if (peerCard) {
      if (isSpeaking) peerCard.classList.add('speaking');
      else peerCard.classList.remove('speaking');
    }
  });

  socket.on('movie-review-celebrated', (record) => {
    showNotice(`🎉 ${record.author} "${record.title}" filminə ⭐ ${record.rating}/10 bal verdi!`);
    for (let i = 0; i < 7; i++) {
      setTimeout(() => {
        spawnFloatingEmoji(['⭐', '🌟', '🎉', '🍿', '🎬', '👏', '💖'][i % 7]);
      }, i * 180);
    }
  });

  socket.on('user-joined', (data) => {
    if (data.users) currentRoomUsers = data.users;
    updateUsersList(data.users || currentRoomUsers);
    showNotice(`👋 ${data.username} otağa daxil oldu!`);
    if (localScreenStream) {
      initiateScreenPeer(data.socketId);
    }
    // Səs axını 100% zəmanətli WebSocket PCM Relay ilə ötürülür
  });

  socket.on('user-left', (data) => {
    if (data.users) currentRoomUsers = data.users;
    updateUsersList(data.users || currentRoomUsers);
    showNotice(`👋 ${data.username} otaqdan ayrıldı`);
    if (screenBroadcasterPeers[data.socketId]) {
      try { screenBroadcasterPeers[data.socketId].close(); } catch (e) {}
      delete screenBroadcasterPeers[data.socketId];
    }
    delete screenBroadcasterIceQueues[data.socketId];
    cleanupVoicePeer(data.socketId);
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
    const pc = screenBroadcasterPeers[sender];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (screenBroadcasterIceQueues[sender]) {
          for (const cand of screenBroadcasterIceQueues[sender]) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
          delete screenBroadcasterIceQueues[sender];
        }
      } catch (err) {
        console.warn('Broadcaster setRemoteDescription error:', err);
      }
    }
  });

  socket.on('webrtc-ice', async ({ sender, candidate }) => {
    if (!candidate) return;
    // 1. Əgər biz ekran paylaşan tərəfik (Broadcaster)
    if (localScreenStream && screenBroadcasterPeers[sender]) {
      const pc = screenBroadcasterPeers[sender];
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      } else {
        if (!screenBroadcasterIceQueues[sender]) screenBroadcasterIceQueues[sender] = [];
        screenBroadcasterIceQueues[sender].push(candidate);
      }
      return;
    }

    // 2. Əgər biz ekran izləyən tərəfik (Viewer)
    if (screenViewerPeer) {
      if (screenViewerPeer.remoteDescription && screenViewerPeer.remoteDescription.type) {
        try { await screenViewerPeer.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
      } else {
        screenViewerIceQueue.push(candidate);
      }
    }
  });

  // WebRTC Səsli Zəng Siqnalları
  socket.on('voice-peer-ready', async ({ sender }) => {
    // Səs axını 100% zəmanətli WebSocket PCM Relay ilə ötürülür
  });

  socket.on('voice-peer-left', ({ peerId }) => {
    cleanupVoicePeer(peerId);
  });

  socket.on('voice-offer', async ({ sender, sdp }) => {
    await handleVoiceOffer(sender, sdp);
  });

  socket.on('voice-answer', async ({ sender, sdp }) => {
    await handleVoiceAnswer(sender, sdp);
  });

  socket.on('voice-ice', async ({ sender, candidate }) => {
    await handleVoiceIceCandidate(sender, candidate);
  });

  // Server-Relayed Canlı HD Səs Qəbulu (100% Zəmanətli Səs)
  socket.on('voice-chunk-receive', ({ sender, username, audio }) => {
    handleIncomingVoiceChunk(sender, username, audio);
  });
}


function updateUsersList(users) {
  if (users) currentRoomUsers = users;
  const userEntries = Object.entries(users || {});
  const userCount = userEntries.length;

  // 1. Sayğac (Count Badge)
  const countBadge = document.getElementById('participants-count-badge');
  if (countBadge) {
    countBadge.textContent = userCount;
  }

  // 2. Üst Header Pills (Başlıqdakı pill-lər)
  if (usersList) {
    usersList.innerHTML = '';
    userEntries.forEach(([sockId, u]) => {
      const isMe = socket && (sockId === socket.id);
      const isAvatarImg = u.avatar && (u.avatar.startsWith('http') || u.avatar.includes('/') || u.avatar.includes('.jpg') || u.avatar.includes('.png'));

      const pill = document.createElement('div');
      pill.className = 'user-pill';
      pill.id = `user-pill-${sockId}`;
      pill.dataset.socketId = sockId;
      pill.innerHTML = `
        <span class="user-avatar-tag">
          ${isAvatarImg ? `<img src="${u.avatar}" alt="Avatar" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;">` : (u.avatar || '🍿')}
        </span>
        <span class="status-dot ${u.isVoiceActive ? 'voice-on' : ''}"></span>
        <span>${escapeHtml(u.username)} ${u.isHost ? '👑' : ''} ${isMe ? '(Sən)' : ''}</span>
        ${u.isVoiceActive ? '<span class="mic-status-tag" title="Mikrofon Aktivdir">🎙️</span>' : ''}
      `;
      usersList.appendChild(pill);
    });
  }

  // 3. Sağ Panel: Siyahı Şəklində İştirakçılar (Sidebar Participant List)
  const sidebarList = document.getElementById('sidebar-users-list');
  if (sidebarList) {
    sidebarList.innerHTML = '';
    userEntries.forEach(([sockId, u]) => {
      const isMe = socket && (sockId === socket.id);
      const isAvatarImg = u.avatar && (u.avatar.startsWith('http') || u.avatar.includes('/') || u.avatar.includes('.jpg') || u.avatar.includes('.png'));

      const card = document.createElement('div');
      card.className = 'participant-card';
      card.id = `participant-item-${sockId}`;
      card.dataset.socketId = sockId;

      card.innerHTML = `
        <div class="participant-avatar-wrap">
          ${isAvatarImg ?
            `<img src="${u.avatar}" alt="Avatar" class="participant-avatar-img">` :
            `<span class="participant-avatar-txt">${u.avatar || '🍿'}</span>`
          }
          <span class="participant-status-dot ${u.isVoiceActive ? 'voice-on' : ''}"></span>
        </div>
        <div class="participant-info">
          <div class="participant-name-row">
            <span class="participant-name">${escapeHtml(u.username)}</span>
            ${isMe ? '<span class="participant-you-tag">Sən</span>' : ''}
            ${u.isHost ? '<span class="participant-crown" title="Otaq Rəhbəri">👑</span>' : ''}
          </div>
          <div class="participant-role-sub">
            <span>${u.isHost ? 'Otaq Rəhbəri' : 'Qonaq'}</span>
            <span>•</span>
            ${u.isVoiceActive ?
              '<span class="voice-badge active">🎙️ Səs Aktivdir</span>' :
              '<span class="voice-badge muted">🔇 Səssiz</span>'
            }
          </div>
        </div>
        ${(isHost && !isMe) ? `
          <button class="btn-kick-participant" title="İştirakçını otaqdan çıxart" data-socket-id="${sockId}" data-username="${escapeHtml(u.username)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            <span>Çıxart</span>
          </button>
        ` : ''}
      `;
      sidebarList.appendChild(card);
    });

    // Otaq sahibi üçün iştirakçını çıxarmaq (Kick) düymələrinə listener qoş
    sidebarList.querySelectorAll('.btn-kick-participant').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetSockId = btn.getAttribute('data-socket-id');
        const targetName = btn.getAttribute('data-username') || 'Bu istifadəçini';
        if (confirm(`"${targetName}" adlı iştirakçını otaqdan çıxarmaq istəyirsiniz?`)) {
          if (socket) {
            socket.emit('kick-user', { targetSocketId: targetSockId });
          }
        }
      });
    });
  }
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

  if (currentVideoState.type === 'youtube' && ytPlayer) {
    try {
      if (typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.seekTo === 'function') {
        const cur = ytPlayer.getCurrentTime();
        if (Math.abs(cur - time) > 1.5) {
          ytPlayer.seekTo(time, true);
        }
      }
      if (action === 'play' && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.playVideo();
        showNotice(`▶️ ${sender} videonu başlatdı`);
        hideTrivia();
      } else if (action === 'pause' && typeof ytPlayer.pauseVideo === 'function') {
        ytPlayer.pauseVideo();
        showNotice(`⏸️ ${sender} videonu saxladı`);
        showRandomTrivia();
      } else if (action === 'seek' && typeof ytPlayer.seekTo === 'function') {
        ytPlayer.seekTo(time, true);
        showNotice(`⏩ ${sender} vaxtı dəyişdi (${formatTime(time)})`);
      }
    } catch (err) {
      console.warn('YouTube remote action error:', err);
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
  }, 500);
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

window.onYouTubeIframeAPIReady = function() {
  isYtReady = true;
};

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

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    ytPlayer.loadVideoById(videoId);
  } else if (window.YT && window.YT.Player) {
    createYTPlayer(videoId);
  } else {
    // YouTube scripti yüklənənə qədər qısa intervalla yoxla
    const ytTimer = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(ytTimer);
        createYTPlayer(videoId);
      }
    }, 150);
  }
}

function createYTPlayer(videoId) {
  try {
    ytPlayer = new YT.Player('youtube-player', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1,
        origin: window.location.origin
      },
      events: {
        'onReady': (event) => {
          isYtReady = true;
          if (currentVideoState && currentVideoState.time) {
            try { event.target.seekTo(currentVideoState.time, true); } catch (e) {}
          }
          if (currentVideoState && currentVideoState.isPlaying) {
            try { event.target.playVideo(); } catch (e) {}
          }
        },
        'onStateChange': onYouTubeStateChange
      }
    });
  } catch (e) {
    console.error('Error creating YouTube player:', e);
  }
}

function onYouTubeStateChange(event) {
  if (isRemoteAction || !socket) return;
  const state = event.data;
  let currentTime = 0;
  try {
    if (event.target && typeof event.target.getCurrentTime === 'function') {
      currentTime = event.target.getCurrentTime();
    }
  } catch (e) {}

  // 1 = PLAYING, 2 = PAUSED (YouTube API rəsmi standart kodları)
  if (state === 1) {
    socket.emit('video-action', { action: 'play', time: currentTime });
    hideTrivia();
  } else if (state === 2) {
    socket.emit('video-action', { action: 'pause', time: currentTime });
    showRandomTrivia();
  }
}

// Qonaq və ya Host YouTube videosunu dayandırdıqda/başlatdıqda 100% zəmanətli avtomatik sinxronizasiya
let lastYtSyncState = null;
setInterval(() => {
  if (isRemoteAction || !socket || !ytPlayer || currentVideoState.type !== 'youtube') return;
  try {
    if (typeof ytPlayer.getPlayerState === 'function') {
      const state = ytPlayer.getPlayerState();
      let curTime = 0;
      if (typeof ytPlayer.getCurrentTime === 'function') curTime = ytPlayer.getCurrentTime();

      if (state !== lastYtSyncState) {
        if (state === 2) { // PAUSED
          lastYtSyncState = 2;
          socket.emit('video-action', { action: 'pause', time: curTime });
          showRandomTrivia();
        } else if (state === 1) { // PLAYING
          lastYtSyncState = 1;
          socket.emit('video-action', { action: 'play', time: curTime });
          hideTrivia();
        }
      }
    }
  } catch (e) {}
}, 400);

// Alətlər panelindəki Otaq Play/Pause Düymələri (Həm Qonaq, həm Host üçün anında sinxron)
const btnRoomPlay = document.getElementById('btn-room-play');
const btnRoomPause = document.getElementById('btn-room-pause');

if (btnRoomPlay) {
  btnRoomPlay.addEventListener('click', () => {
    let curTime = 0;
    if (currentVideoState.type === 'youtube' && ytPlayer) {
      if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
      if (typeof ytPlayer.getCurrentTime === 'function') curTime = ytPlayer.getCurrentTime();
    } else if (currentVideoState.type === 'direct') {
      directPlayer.play().catch(() => {});
      curTime = directPlayer.currentTime;
    }
    if (socket) socket.emit('video-action', { action: 'play', time: curTime });
    showNotice('▶️ Video başladıldı (Hamı üçün)');
    hideTrivia();
  });
}

if (btnRoomPause) {
  btnRoomPause.addEventListener('click', () => {
    let curTime = 0;
    if (currentVideoState.type === 'youtube' && ytPlayer) {
      if (typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
      if (typeof ytPlayer.getCurrentTime === 'function') curTime = ytPlayer.getCurrentTime();
    } else if (currentVideoState.type === 'direct') {
      directPlayer.pause();
      curTime = directPlayer.currentTime;
    }
    if (socket) socket.emit('video-action', { action: 'pause', time: curTime });
    showNotice('⏸️ Video saxlanıldı (Hamı üçün)');
    showRandomTrivia();
  });
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

// Keyfiyyət Profilləri: Film və seriallar üçün 1080p Full HD kristal təmiz standart (30 FPS)
const STREAM_PROFILES = {
  '1080p-high': {
    name: '🌟 1080p Full HD — Kristal Təmiz (Kino Rejimi • 8.5 Mbps)',
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 }, // Kino/film üçün 30 FPS standartı (donmaların qarşısını alır)
    maxBitrate: 8500000, // 8.5 Mbps (tam HD, sıxılma və ləkələnmə yoxdur)
    contentHint: 'detail', // Mətn və incə kino detallarının bulanıqlaşmasının qarşısını alır
    degradationPreference: 'maintain-resolution'
  },
  '1080p-balanced': {
    name: '⚡ 1080p Balans — Stabil & Axıcı (5.0 Mbps)',
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    maxBitrate: 5000000, // 5.0 Mbps
    contentHint: 'detail',
    degradationPreference: 'balanced'
  },
  '720p-smooth': {
    name: '🚀 720p HD — Zəif İnternet (3.0 Mbps)',
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    maxBitrate: 3000000, // 3.0 Mbps
    contentHint: 'motion',
    degradationPreference: 'maintain-framerate'
  }
};

let currentStreamProfileKey = '1080p-high';

const selectStreamQuality = document.getElementById('stream-quality-select');
const selectNetflixQuality = document.getElementById('netflix-quality-select');

function getActiveStreamProfile() {
  return STREAM_PROFILES[currentStreamProfileKey] || STREAM_PROFILES['1080p-high'];
}

async function changeStreamQuality(newKey, notify = true) {
  if (!STREAM_PROFILES[newKey]) return;
  currentStreamProfileKey = newKey;
  if (selectStreamQuality) selectStreamQuality.value = newKey;
  if (selectNetflixQuality) selectNetflixQuality.value = newKey;

  const profile = getActiveStreamProfile();

  // Əgər yayım aktivdirsə, yeni keyfiyyəti dərhal canlı olaraq tətbiq et
  if (localScreenStream) {
    const videoTrack = localScreenStream.getVideoTracks()[0];
    if (videoTrack) {
      if ('contentHint' in videoTrack) {
        videoTrack.contentHint = profile.contentHint;
      }
      try {
        await videoTrack.applyConstraints({ frameRate: profile.frameRate });
      } catch (e) {}
    }

    for (const targetId in screenBroadcasterPeers) {
      const pc = screenBroadcasterPeers[targetId];
      if (pc) {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          try {
            const params = videoSender.getParameters();
            if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
            params.encodings[0].maxBitrate = profile.maxBitrate;
            params.encodings[0].scaleResolutionDownBy = 1.0;
            params.degradationPreference = profile.degradationPreference;
            await videoSender.setParameters(params);
          } catch (e) {
            console.warn(`[WebRTC Stream] Bitrate yenilənmə xətası (${targetId}):`, e);
          }
        }
      }
    }
  }

  if (notify) {
    showNotice(`⚙️ ${profile.name}`);
  }
}

if (selectStreamQuality) {
  selectStreamQuality.addEventListener('change', (e) => {
    changeStreamQuality(e.target.value);
  });
}
if (selectNetflixQuality) {
  selectNetflixQuality.addEventListener('change', (e) => {
    changeStreamQuality(e.target.value);
  });
}

btnStartStream.addEventListener('click', startScreenCapture);
if (btnStartNetflixStream) {
  btnStartNetflixStream.addEventListener('click', startScreenCapture);
}

async function startScreenCapture() {
  try {
    const profile = getActiveStreamProfile();

    localScreenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'browser',
        frameRate: profile.frameRate, // 30 FPS kino standartı: GPU yükünü azaldır və kadr donmasını tam aradan qaldırır
        width: profile.width,
        height: profile.height
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false
      }
    });

    const videoTrack = localScreenStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.contentHint = profile.contentHint; // 'detail' = Kristal təmiz, heç bir sıxılma bulanıqlığı olmur!
    }

    const audioTracks = localScreenStream.getAudioTracks();
    if (audioTracks.length === 0) {
      alert("⚠️ DİQQƏT: Filmin səsi qoşulmadı!\n\nChrome pəncərəsi açılanda aşağıdakı 'Also share tab audio' (Səsi paylaş) qutusunu mütləq işarələyin və 'Pəncərə' yox, 'Chrome Tab' (və ya Bütöv Ekran) seçin.");
    } else {
      audioTracks[0].contentHint = 'music'; // Film və musiqi üçün təmiz stereo səs rejimi
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
    showNotice(`🎥 Film tabı yayımlanır! (${profile.name})`);
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
  Object.values(screenBroadcasterPeers).forEach(pc => {
    try { pc.close(); } catch (e) {}
  });
  for (const k in screenBroadcasterPeers) delete screenBroadcasterPeers[k];
  for (const k in screenBroadcasterIceQueues) delete screenBroadcasterIceQueues[k];

  if (screenViewerPeer) {
    try { screenViewerPeer.close(); } catch (e) {}
    screenViewerPeer = null;
  }
  screenViewerIceQueue = [];

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
  if (!localScreenStream || !targetSocketId || targetSocketId === socket.id) return;

  if (screenBroadcasterPeers[targetSocketId]) {
    try { screenBroadcasterPeers[targetSocketId].close(); } catch (e) {}
    delete screenBroadcasterPeers[targetSocketId];
  }
  delete screenBroadcasterIceQueues[targetSocketId];

  const pc = new RTCPeerConnection(rtcConfig);
  screenBroadcasterPeers[targetSocketId] = pc;

  localScreenStream.getTracks().forEach(track => {
    pc.addTrack(track, localScreenStream);
  });

  // H.264 Donmanı bloklamaq üçün Hardware Acceleration kodekini prioritet et
  try {
    const transceivers = pc.getTransceivers();
    const videoTransceiver = transceivers.find(t => t.sender && t.sender.track && t.sender.track.kind === 'video');
    if (videoTransceiver && typeof videoTransceiver.setCodecPreferences === 'function' && RTCRtpReceiver.getCapabilities) {
      const capabilities = RTCRtpReceiver.getCapabilities('video');
      if (capabilities && capabilities.codecs) {
        const h264Codecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
        const otherCodecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264');
        if (h264Codecs.length > 0) {
          videoTransceiver.setCodecPreferences([...h264Codecs, ...otherCodecs]);
        }
      }
    }
  } catch (e) {
    console.warn('Codec preference error:', e);
  }

  // WebRTC Video Bitreyt Nəzarəti və Keyfiyyəti (8.5 Mbps tam HD axın)
  const profile = getActiveStreamProfile();
  const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
  if (videoSender) {
    try {
      const params = videoSender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0].maxBitrate = profile.maxBitrate;
      params.encodings[0].scaleResolutionDownBy = 1.0; // Qətnamənin süni azaldılmasını qadağan et
      params.degradationPreference = profile.degradationPreference;
      await videoSender.setParameters(params);
    } catch (e) {
      console.warn('Bitrate parameters error:', e);
    }
  }

  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('webrtc-ice', { target: targetSocketId, candidate: event.candidate });
    }
  };

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc-offer', { target: targetSocketId, sdp: offer });
  } catch (err) {
    console.error('initiateScreenPeer error:', err);
  }
}

async function handleScreenOffer(senderSocketId, sdp) {
  if (!senderSocketId || !sdp) return;
  if (screenViewerPeer) {
    try { screenViewerPeer.close(); } catch (e) {}
    screenViewerPeer = null;
  }
  screenViewerIceQueue = [];

  screenViewerPeer = new RTCPeerConnection(rtcConfig);

  // İzləyici tərəfdə də H.264 aparat sürətləndirməsi
  try {
    const transceivers = screenViewerPeer.getTransceivers();
    const videoTransceiver = transceivers.find(t => t.receiver && t.receiver.track && t.receiver.track.kind === 'video');
    if (videoTransceiver && typeof videoTransceiver.setCodecPreferences === 'function' && RTCRtpReceiver.getCapabilities) {
      const capabilities = RTCRtpReceiver.getCapabilities('video');
      if (capabilities && capabilities.codecs) {
        const h264Codecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
        const otherCodecs = capabilities.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264');
        if (h264Codecs.length > 0) {
          videoTransceiver.setCodecPreferences([...h264Codecs, ...otherCodecs]);
        }
      }
    }
  } catch (e) {}

  screenViewerPeer.ontrack = (event) => {
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

  screenViewerPeer.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('webrtc-ice', { target: senderSocketId, candidate: event.candidate });
    }
  };

  try {
    await screenViewerPeer.setRemoteDescription(new RTCSessionDescription(sdp));
    // Növbədə gözləyən ICE namizədlərini dərhal əlaqəyə tətbiq et
    for (const cand of screenViewerIceQueue) {
      try { await screenViewerPeer.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
    }
    screenViewerIceQueue = [];

    const answer = await screenViewerPeer.createAnswer();
    await screenViewerPeer.setLocalDescription(answer);
    socket.emit('webrtc-answer', { target: senderSocketId, sdp: answer });
  } catch (err) {
    console.error('handleScreenOffer error:', err);
  }
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
  const toggleHandler = async () => {
    if (!isVoiceActive) {
      await startVoiceChat();
    } else {
      stopVoiceChat();
    }
  };

  if (btnVoiceToggle) {
    btnVoiceToggle.addEventListener('click', toggleHandler);
  }
  const btnVoiceSidebar = document.getElementById('btn-voice-chat-sidebar');
  if (btnVoiceSidebar) {
    btnVoiceSidebar.addEventListener('click', toggleHandler);
  }
  setupAudioModeToggle();
}

let isHeadphoneMode = true; // Susmaya görə: Qulaqlıq Rejimi (Kino səsi 100% təmiz qalır, heç bir boğulma olmur)

function setupAudioModeToggle() {
  const btnMode = document.getElementById('btn-audio-mode');
  if (btnMode) {
    btnMode.addEventListener('click', async () => {
      isHeadphoneMode = !isHeadphoneMode;
      updateAudioModeUI();
      if (isVoiceActive) {
        showNotice(isHeadphoneMode ? '🎧 Qulaqlıq Rejimi: Video səsi 100% təmizdir' : '🔊 Dinamik Rejimi: Əks-səda filtri aktivdir');
        await startVoiceChat();
      } else {
        showNotice(isHeadphoneMode ? '🎧 Rejim: Qulaqlıq seçildi (Kino səsi təmiz)' : '🔊 Rejim: Dinamik seçildi (Əks-səda filtri)');
      }
    });
  }
  updateAudioModeUI();
}

function updateAudioModeUI() {
  const icon = document.getElementById('audio-mode-icon');
  const txt = document.getElementById('audio-mode-text');
  const btn = document.getElementById('btn-audio-mode');
  if (icon && txt) {
    if (isHeadphoneMode) {
      icon.textContent = '🎧';
      txt.textContent = 'Qulaqlıq';
      if (btn) btn.title = 'Qulaqlıq Rejimi: Film səsi 100% təmiz qalır (Boğulma olmur). Dinamik üçün toxunun.';
    } else {
      icon.textContent = '🔊';
      txt.textContent = 'Dinamik';
      if (btn) btn.title = 'Dinamik Rejimi: Əks-səda əleyhinə filtr aktivdir. Qulaqlıq üçün toxunun.';
    }
  }
}

let voiceCaptureContext = null;
let voiceCaptureProcessor = null;
let voiceCaptureSource = null;
let audioPlaybackContext = null;
const scheduledPlayTimes = {}; // Hər danışan üçün fərdi jitter vaxtı
const speakerTimeouts = {};

function getPlaybackContext() {
  if (!audioPlaybackContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioPlaybackContext = new AudioCtx();
    }
  }
  if (audioPlaybackContext && audioPlaybackContext.state === 'suspended') {
    audioPlaybackContext.resume().catch(() => {});
  }
  return audioPlaybackContext;
}

function handleIncomingVoiceChunk(senderId, username, arrayBuffer) {
  if (!arrayBuffer || (socket && senderId === socket.id)) return;
  const ctx = getPlaybackContext();
  if (!ctx) return;

  try {
    const int16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32767.0;
    }

    // 24kHz PCM buferi - Web Audio API bunu arxa planda təmiz şəkildə sistemin 48kHz çıxışına upsample edir
    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    let playAt = scheduledPlayTimes[senderId] || 0;

    // Adaptiv Jitter Buferi (70ms başlanğıc buferi - şəbəkə dalğalanmalarını tam udur, səsdə qırılma və ilişmə olmur)
    if (playAt < now || playAt > now + 0.350) {
      playAt = now + 0.070;
    }

    source.start(playAt);
    scheduledPlayTimes[senderId] = playAt + audioBuffer.duration;

    // Discord Səs Haləsi (Qarşı tərəf danışanda dərhal yaşıl yanır)
    updateSpeakingVisual(senderId, true);
    clearTimeout(speakerTimeouts[senderId]);
    speakerTimeouts[senderId] = setTimeout(() => {
      updateSpeakingVisual(senderId, false);
    }, 400);
  } catch (err) {
    console.warn('[Voice Engine] Playback chunk error:', err);
  }
}

function startAudioChunkCapture(stream) {
  stopAudioChunkCapture();
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    voiceCaptureContext = new AudioCtx();
    if (voiceCaptureContext.state === 'suspended') {
      voiceCaptureContext.resume().catch(() => {});
    }

    voiceCaptureSource = voiceCaptureContext.createMediaStreamSource(stream);
    const nativeRate = voiceCaptureContext.sampleRate || 48000;
    const downsampleStep = nativeRate / 24000;
    const bufferSize = nativeRate >= 44100 ? 4096 : 2048;
    voiceCaptureProcessor = voiceCaptureContext.createScriptProcessor(bufferSize, 1, 1);

    let silenceCount = 0;
    let isSpeakingState = false;
    let isGateOpen = false;
    let preRollBuffer = []; // Cümlənin başlanğıcının kəsilməməsi üçün 5 paketlik (~425ms) dairəvi bufer

    voiceCaptureProcessor.onaudioprocess = (e) => {
      if (!isVoiceActive) return;
      const input = e.inputBuffer.getChannelData(0);

      // RMS səs səviyyəsi hesabla
      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i];
      }
      const rms = Math.sqrt(sum / input.length);
      // Həssas danışıq həddi (pıçıltı və yumşaq samitləri dərhal tutur)
      const isVoice = rms > 0.005;

      // 24kHz PCM-ə çevir
      const outLen = Math.floor(input.length / downsampleStep);
      const int16 = new Int16Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const sample = input[Math.floor(i * downsampleStep)];
        int16[i] = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      }
      const chunkBuffer = int16.buffer;

      if (isVoice) {
        silenceCount = 0;
        if (!isGateOpen) {
          isGateOpen = true;
          // CÜMLƏNİN ƏVVƏLİ: Pre-roll buferdəki bütün əvvəlki paketləri dərhal göndər!
          // Beləliklə, cümlənin ilk hecası/sözü zərrə qədər də kəsilmir!
          if (socket && preRollBuffer.length > 0) {
            preRollBuffer.forEach(prev => {
              socket.emit('voice-chunk', prev);
            });
            preRollBuffer = [];
          }
        }
        if (!isSpeakingState) {
          isSpeakingState = true;
          updateSpeakingVisual(socket ? socket.id : null, true);
          if (socket) socket.emit('user-speaking', { isSpeaking: true });
        }
      } else {
        silenceCount++;
        // CÜMLƏNİN SONU: 15 paketlik (~1.3 saniyə) geniş bufer.
        // Tənəffüs və cümlə sonundakı səslər qətiyyən kəsilmir!
        if (silenceCount > 15) {
          if (isGateOpen) isGateOpen = false;
          if (isSpeakingState) {
            isSpeakingState = false;
            updateSpeakingVisual(socket ? socket.id : null, false);
            if (socket) socket.emit('user-speaking', { isSpeaking: false });
          }
        }
      }

      if (isGateOpen || silenceCount <= 15) {
        if (socket) {
          socket.emit('voice-chunk', chunkBuffer);
        }
      } else {
        // Sükut zamanı ən son 5 paketi (~425ms) pre-roll üçün yaddaşda saxla
        preRollBuffer.push(chunkBuffer);
        if (preRollBuffer.length > 5) {
          preRollBuffer.shift();
        }
      }
    };

    const muteNode = voiceCaptureContext.createGain();
    muteNode.gain.value = 0;

    voiceCaptureSource.connect(voiceCaptureProcessor);
    voiceCaptureProcessor.connect(muteNode);
    muteNode.connect(voiceCaptureContext.destination);

  } catch (err) {
    console.warn('[Voice Engine] Capture setup error:', err);
  }
}

function stopAudioChunkCapture() {
  if (voiceCaptureProcessor) {
    try { voiceCaptureProcessor.disconnect(); } catch (e) {}
    voiceCaptureProcessor = null;
  }
  if (voiceCaptureSource) {
    try { voiceCaptureSource.disconnect(); } catch (e) {}
    voiceCaptureSource = null;
  }
  if (voiceCaptureContext) {
    try { voiceCaptureContext.close(); } catch (e) {}
    voiceCaptureContext = null;
  }
}

async function startVoiceChat() {
  try {
    // Əgər artıq mikrofon axını varsa, təmiz bağla
    if (localVoiceStream) {
      localVoiceStream.getTracks().forEach(t => t.stop());
      localVoiceStream = null;
    }

    // Qulaqlıq rejimində: echoCancellation=false, noiseSuppression=false
    // Bu zaman Windows heç vaxt videonun səsini boğmur və kəsmir, 100% təmiz stereo saxlayır!
    const audioConstraints = isHeadphoneMode ? {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1
    } : {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
      channelCount: 1
    };

    localVoiceStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: false
    });

    isVoiceActive = true;
    updateVoiceUI(true);
    showNotice(isHeadphoneMode ? '🎙️ Səsli danışıq aktivdir! (Qulaqlıq rejimi: Film səsi 100% təmizdir)' : '🎙️ Səsli danışıq aktivdir! (Dinamik rejimi)');

    // Səs oxutma sistemini aç
    const pCtx = getPlaybackContext();
    if (pCtx && pCtx.state === 'suspended') {
      pCtx.resume().catch(() => {});
    }

    // 100% Zəmanətli Pre-Roll & Hangover Canlı Audio Capturer-i işə sal
    startAudioChunkCapture(localVoiceStream);

    if (socket) {
      socket.emit('voice-user-state', { isVoiceActive: true });
    }

  } catch (err) {
    console.error('Mikrofon xətası:', err);
    alert('Mikrofon icazəsi verilmədi! Zəhmət olmasa brauzerinizin parametrlərindən mikrofona icazə verin.');
  }
}

function stopVoiceChat() {
  stopAudioChunkCapture();

  if (localVoiceStream) {
    localVoiceStream.getTracks().forEach(track => {
      track.stop();
    });
    localVoiceStream = null;
  }
  isVoiceActive = false;
  updateVoiceUI(false);

  if (socket) {
    socket.emit('voice-user-state', { isVoiceActive: false });
    socket.emit('user-speaking', { isSpeaking: false });
  }
  updateSpeakingVisual(socket ? socket.id : null, false);
  showNotice('🎙️ Mikrofon bağlandı');
}


function updateVoiceUI(active) {
  if (btnVoiceToggle) {
    const micText = btnVoiceToggle.querySelector('.mic-text');
    if (active) {
      btnVoiceToggle.classList.add('voice-active');
      if (micText) micText.textContent = 'Səs Açıq 🟢';
    } else {
      btnVoiceToggle.classList.remove('voice-active');
      if (micText) micText.textContent = 'Səsli Zəng';
    }
  }
  const btnVoiceSidebar = document.getElementById('btn-voice-chat-sidebar');
  if (btnVoiceSidebar) {
    const micText = btnVoiceSidebar.querySelector('.mic-text');
    if (active) {
      btnVoiceSidebar.classList.add('voice-active');
      if (micText) micText.textContent = 'Səs Açıq 🟢';
    } else {
      btnVoiceSidebar.classList.remove('voice-active');
      if (micText) micText.textContent = 'Səsli Zəng';
    }
  }
}

async function callVoicePeer(peerId) {
  if (!socket || !peerId || peerId === socket.id) return;
  console.log(`[WebRTC Voice] Zəng göndərilir -> ${peerId}`);

  if (voicePeerConnections[peerId]) {
    try { voicePeerConnections[peerId].close(); } catch (e) {}
    delete voicePeerConnections[peerId];
  }

  const pc = new RTCPeerConnection(rtcConfig);
  voicePeerConnections[peerId] = pc;

  // Real mikrofon səsini əlaqəyə qoş
  if (localVoiceStream && localVoiceStream.getAudioTracks().length > 0) {
    localVoiceStream.getAudioTracks().forEach(track => {
      try { pc.addTrack(track, localVoiceStream); } catch (e) {}
    });
  }

  // Qarşı tərəfdən gələn səs axını
  pc.ontrack = (event) => {
    console.log(`[WebRTC Voice] Səs axını qəbul edildi (${peerId}):`, event.track);
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    playRemoteVoice(stream, peerId, event.track);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('voice-ice', { target: peerId, candidate: event.candidate });
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[WebRTC Voice] ICE Vəziyyəti (${peerId}): ${pc.iceConnectionState}`);
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      unlockAllRemoteAudios();
    }
  };

  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    socket.emit('voice-offer', { target: peerId, sdp: offer });
  } catch (err) {
    console.error(`[WebRTC Voice] Təklif yaratma xətası (${peerId}):`, err);
  }
}

async function handleVoiceOffer(senderId, sdp) {
  if (!senderId || !sdp || !socket) return;
  console.log(`[WebRTC Voice] Səs təklifi qəbul edildi <- ${senderId}`);

  let pc = voicePeerConnections[senderId];
  if (!pc || pc.signalingState === 'closed') {
    pc = new RTCPeerConnection(rtcConfig);
    voicePeerConnections[senderId] = pc;
  }

  // Əgər bizim də mikrofonumuz aktivdirsə, öz səsimizi də cavaba əlavə et
  if (localVoiceStream && isVoiceActive && localVoiceStream.getAudioTracks().length > 0) {
    const senders = pc.getSenders();
    if (!senders || senders.length === 0) {
      localVoiceStream.getAudioTracks().forEach(track => {
        try { pc.addTrack(track, localVoiceStream); } catch (e) {}
      });
    }
  }

  pc.ontrack = (event) => {
    console.log(`[WebRTC Voice] Səs axını qəbul edildi (${senderId}):`, event.track);
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    playRemoteVoice(stream, senderId, event.track);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('voice-ice', { target: senderId, candidate: event.candidate });
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      unlockAllRemoteAudios();
    }
  };

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    drainIceCandidates(senderId, pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('voice-answer', { target: senderId, sdp: answer });
  } catch (err) {
    console.error(`[WebRTC Voice] handleVoiceOffer xətası (${senderId}):`, err);
  }
}

async function handleVoiceAnswer(senderId, sdp) {
  if (!senderId || !sdp) return;
  console.log(`[WebRTC Voice] Səs cavabı qəbul edildi <- ${senderId}`);
  const pc = voicePeerConnections[senderId];
  if (!pc) return;

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    drainIceCandidates(senderId, pc);
  } catch (err) {
    console.error(`[WebRTC Voice] handleVoiceAnswer xətası (${senderId}):`, err);
  }
}

async function handleVoiceIceCandidate(senderId, candidate) {
  if (!candidate) return;
  const pc = voicePeerConnections[senderId];
  if (pc && pc.remoteDescription && pc.remoteDescription.type) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn(`[WebRTC Voice] addIceCandidate xətası (${senderId}):`, e);
    }
  } else {
    if (!voiceIceCandidatesQueue[senderId]) voiceIceCandidatesQueue[senderId] = [];
    voiceIceCandidatesQueue[senderId].push(candidate);
  }
}

async function drainIceCandidates(peerId, pc) {
  if (!voiceIceCandidatesQueue[peerId]) return;
  const queue = voiceIceCandidatesQueue[peerId];
  delete voiceIceCandidatesQueue[peerId];
  for (const cand of queue) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(cand));
    } catch (e) {
      console.warn(`[WebRTC Voice] Növbədəki ICE namizədi xətası (${peerId}):`, e);
    }
  }
}

function playRemoteVoice(stream, peerId, track) {
  // Səs axını 100% zəmanətli şəkildə WebSocket PCM Relay (voice-chunk) ilə ötürülür və Web Audio ilə oxunur.
  // Burada əlavə <audio> elementi yaradılmır ki, Windows brauzerə "VoIP zəng" rejimi tətbiq edib videonun səsini boğmasın!
}

function cleanupVoicePeer(peerId) {
  if (voicePeerConnections[peerId]) {
    try { voicePeerConnections[peerId].close(); } catch (e) {}
    delete voicePeerConnections[peerId];
  }
  delete voiceIceCandidatesQueue[peerId];
  delete pcMakingOffer[peerId];

  const audioEl = document.getElementById(`remote-voice-audio-${peerId}`);
  if (audioEl) {
    audioEl.srcObject = null;
    audioEl.remove();
  }
  updateSpeakingVisual(peerId, false);
}

// ------------------------------------------
// Real Vaxt Səs Fəallığı və Discord Haləsi (VAD)
// ------------------------------------------
function startLocalSpeakingDetection(stream) {
  stopLocalSpeakingDetection();
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    vadAudioContext = new AudioCtx();
    if (vadAudioContext.state === 'suspended') {
      vadAudioContext.resume().catch(() => {});
    }

    const source = vadAudioContext.createMediaStreamSource(stream);
    const analyser = vadAudioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    source.connect(analyser); // Dinləyiciyə qoşulmur (əks-səda olmur)

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceCounter = 0;

    vadInterval = setInterval(() => {
      if (!isVoiceActive || !localVoiceStream) {
        stopLocalSpeakingDetection();
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const isVoiceDetected = avg > 14;

      if (isVoiceDetected) {
        silenceCounter = 0;
        if (!isSpeakingLocally) {
          isSpeakingLocally = true;
          updateSpeakingVisual(socket.id, true);
          if (socket) socket.emit('user-speaking', { isSpeaking: true });
        }
      } else {
        silenceCounter++;
        if (silenceCounter > 4) {
          if (isSpeakingLocally) {
            isSpeakingLocally = false;
            updateSpeakingVisual(socket.id, false);
            if (socket) socket.emit('user-speaking', { isSpeaking: false });
          }
        }
      }
    }, 100);
  } catch (err) {
    console.warn('[WebRTC Voice] VAD inisializasiya xətası:', err);
  }
}

function stopLocalSpeakingDetection() {
  if (vadInterval) {
    clearInterval(vadInterval);
    vadInterval = null;
  }
  if (vadAudioContext) {
    try { vadAudioContext.close(); } catch (e) {}
    vadAudioContext = null;
  }
  if (isSpeakingLocally) {
    isSpeakingLocally = false;
    if (socket) {
      updateSpeakingVisual(socket.id, false);
      socket.emit('user-speaking', { isSpeaking: false });
    }
  }
}

function updateSpeakingVisual(sockId, isSpeaking) {
  if (!sockId) return;
  // 1. Başlıqdakı pill
  const pill = document.getElementById(`user-pill-${sockId}`);
  if (pill) {
    if (isSpeaking) pill.classList.add('speaking-halo');
    else pill.classList.remove('speaking-halo');
  }
  // 2. Sağ paneldəki kart
  const card = document.getElementById(`participant-item-${sockId}`);
  if (card) {
    if (isSpeaking) card.classList.add('speaking');
    else card.classList.remove('speaking');
  }
}

function getPeerUsername(peerId) {
  if (currentRoomUsers && currentRoomUsers[peerId] && currentRoomUsers[peerId].username) {
    return currentRoomUsers[peerId].username;
  }
  return 'İştirakçı';
}

// Bütün pleyer və səs kilidlərini istifadəçi kliklədikdə dərhal aç
function unlockAllRemoteAudios() {
  document.querySelectorAll('audio[id^="remote-voice-audio-"]').forEach(el => {
    if (el.paused) el.play().catch(() => {});
  });
  if (audioPlaybackContext && audioPlaybackContext.state === 'suspended') {
    audioPlaybackContext.resume().catch(() => {});
  }
  if (vadAudioContext && vadAudioContext.state === 'suspended') {
    vadAudioContext.resume().catch(() => {});
  }
  hideAudioUnlockBanner();
}
document.addEventListener('click', unlockAllRemoteAudios, { passive: true });
document.addEventListener('touchstart', unlockAllRemoteAudios, { passive: true });

function showAudioUnlockBanner() {
  let banner = document.getElementById('voice-unlock-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'voice-unlock-banner';
    banner.className = 'voice-unlock-banner';
    banner.innerHTML = `
      <span>🔊 Canlı səsə qulaq asmaq üçün toxunun</span>
      <button id="btn-unlock-voice" style="background:#fff;color:#064e3b;border:none;padding:6px 14px;border-radius:99px;font-weight:700;cursor:pointer;">Səsi Aç 📢</button>
    `;
    banner.onclick = () => {
      unlockAllRemoteAudios();
      banner.classList.add('hidden');
    };
    document.body.appendChild(banner);
  }
  banner.classList.remove('hidden');
}

function hideAudioUnlockBanner() {
  const banner = document.getElementById('voice-unlock-banner');
  if (banner) banner.classList.add('hidden');
}

function getThemeName(theme) {
  const map = {
    'theme-netflix': '🎬 Cinema Premier (Netflix)',
    'theme-batman': '🦇 The Dark Knight (Gotham)',
    'theme-interstellar': '🌌 Interstellar (Gargantua)',
    'theme-matrix': '🕶️ The Matrix (Cyber Terminal)',
    'theme-breaking-bad': '🧪 Breaking Bad (Heisenberg)',
    'theme-got': '❄️ Winterfell (Game of Thrones)',
    'theme-spiderman': '🕷️ Marvel MCU (Stark Tech)'
  };
  return map[theme] || theme;
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
    { title: '🛋️ OneCouch' }
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

// ==========================================
// 11. QEYDİYYAT & PROFİL & GOOGLE GİRİŞ SİSTEMİ
// ==========================================

let selectedAvatarChoice = '🍿';

function setupAuth() {
  // 1. LocalStorage-dən yadda saxlanılan Google istifadəçisini bərpa et
  try {
    const savedUserStr = localStorage.getItem('watchparty_user');
    if (savedUserStr) {
      currentUser = JSON.parse(savedUserStr);
      updateUserUI();
    }
  } catch (e) {
    console.error('Yadda saxlanılan istifadəçi oxuna bilmədi:', e);
  }

  // 2. Modalı açan düymələr
  if (btnOpenAuthLobby) {
    btnOpenAuthLobby.addEventListener('click', () => openAuthModal());
  }
  if (headerUserProfile) {
    headerUserProfile.addEventListener('click', (e) => {
      if (btnLogout && (e.target === btnLogout || btnLogout.contains(e.target))) {
        return;
      }
      openAuthModal();
    });
  }
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.stopPropagation();
      leaveRoomAndReturnToLobby();
    });
  }

  // 2.2 Lobby Profil Açılan Menyu & Çıxış Düyməsi
  const btnProfileTrigger = document.getElementById('btn-profile-trigger');
  const profileDropdownCard = document.getElementById('profile-dropdown-card');
  if (btnProfileTrigger && profileDropdownCard) {
    btnProfileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdownCard.classList.toggle('hidden');
      const langDropdown = document.getElementById('lang-menu-dropdown');
      if (langDropdown) langDropdown.classList.add('hidden');
    });
  }

  const btnLobbyLogout = document.getElementById('btn-lobby-logout');
  if (btnLobbyLogout) {
    btnLobbyLogout.addEventListener('click', (e) => {
      e.stopPropagation();
      logoutUser();
    });
  }

  // Kənara kliklədikdə açılan menyuları bağla
  document.addEventListener('click', (e) => {
    if (profileDropdownCard && !profileDropdownCard.classList.contains('hidden')) {
      if (!profileDropdownCard.contains(e.target) && (!btnProfileTrigger || !btnProfileTrigger.contains(e.target))) {
        profileDropdownCard.classList.add('hidden');
      }
    }
    const langDropdown = document.getElementById('lang-menu-dropdown');
    const langToggle = document.getElementById('btn-lang-toggle');
    if (langDropdown && !langDropdown.classList.contains('hidden')) {
      if (!langDropdown.contains(e.target) && (!langToggle || !langToggle.contains(e.target))) {
        langDropdown.classList.add('hidden');
      }
    }
  });

  // 2.5 Host kartındakı birbaşa Google Giriş Düyməsi (Google prompt + Hesab seçimi modalını açır)
  const btnHostGoogleLogin = document.getElementById('btn-host-google-login');
  if (btnHostGoogleLogin) {
    btnHostGoogleLogin.addEventListener('click', () => {
      // 1. Google One-Tap pəncərəsini aç
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.prompt();
        } catch (e) {}
      }
      // 2. Hesab seçimi modalını aç (istifadəçi oradan da hesabını seçə bilər)
      openAuthModal();
    });
  }

  // 3. Google Formu ilə Birbaşa Giriş
  const formGoogleDirect = document.getElementById('form-google-direct-auth');
  if (formGoogleDirect) {
    formGoogleDirect.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('google-login-name');
      const emailInput = document.getElementById('google-login-email');
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      if (!name || !email) {
        showAuthStatus('Zəhmət olmasa adınızı və e-poçt ünvanınızı daxil edin.', 'error');
        return;
      }
      await executeGoogleLogin(email, name);
    });
  }

  // 4. Rəsmi Google GIS SDK-nı inisializasiya et
  initGoogleAuth();
}

async function executeGoogleLogin(email, name, credential) {
  try {
    showAuthStatus('Google ilə daxil olunur...', 'info');
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, credential, picture: '🍿' })
    });
    const data = await res.json();
    if (data.success && data.user) {
      saveUserSession(data.user);
      showAuthStatus(`Xoş gəldiniz, ${data.user.username}! 🎉`, 'success');
      setTimeout(() => closeModal('modal-auth'), 600);
    } else {
      showAuthStatus(data.error || 'Google girişi uğursuz oldu', 'error');
    }
  } catch (err) {
    // API/Server əlçatan olmadıqda belə, istifadəçinin öz daxil etdiyi məlumatla təhlükəsiz sessiya aç
    const cleanEmail = email ? email.toLowerCase().trim() : 'user@gmail.com';
    const cleanName = name || cleanEmail.split('@')[0] || 'Google İstifadəçisi';
    const fallbackUser = {
      id: 'g_' + Date.now(),
      username: cleanName,
      email: cleanEmail,
      avatar: '🍿',
      isGoogle: true
    };
    saveUserSession(fallbackUser);
    showAuthStatus(`Xoş gəldiniz, ${fallbackUser.username}! 🎉`, 'success');
    setTimeout(() => closeModal('modal-auth'), 600);
  }
}

function initGoogleAuth() {
  const container = document.getElementById('google-signin-btn-container');
  if (!container) return;

  if (window.google && window.google.accounts && window.google.accounts.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: '928475938475-mockgoogleclientid.apps.googleusercontent.com',
        callback: handleGoogleCredentialResponse,
        auto_select: false
      });
      window.google.accounts.id.renderButton(container, {
        theme: 'filled_blue',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280
      });
    } catch (e) {
      console.warn('Google One-Tap render xətası:', e);
    }
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function handleGoogleCredentialResponse(response) {
  try {
    showAuthStatus('Google ilə daxil olunur...', 'info');
    let email = '';
    let name = '';
    let picture = '🍿';
    let sub = '';

    if (response && response.credential) {
      const payload = parseJwt(response.credential);
      if (payload) {
        email = payload.email || '';
        name = payload.name || '';
        picture = payload.picture || '🍿';
        sub = payload.sub || '';
      }
    }

    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        credential: response.credential, 
        email, 
        name, 
        picture,
        sub 
      })
    });
    const data = await res.json();
    if (data.success && data.user) {
      saveUserSession(data.user);
      showAuthStatus(`Google ilə daxil olundu: ${data.user.username}! 🎉`, 'success');
      setTimeout(() => closeModal('modal-auth'), 600);
    } else {
      showAuthStatus(data.error || 'Google girişi uğursuz oldu', 'error');
    }
  } catch (err) {
    console.error('Google One-Tap error:', err);
    showAuthStatus('Google xətası baş verdi', 'error');
  }
}

function saveUserSession(user) {
  user.isGoogle = true;
  currentUser = user;
  currentUsername = user.username;
  try {
    localStorage.setItem('watchparty_user', JSON.stringify(user));
  } catch (e) {}
  updateUserUI();
  const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;
  showNotice(t ? `${t.noticeLogin}, ${user.username}! 🎉` : `👤 Xoş gəldiniz, ${user.username}!`);
}

function logoutUser() {
  currentUser = null;
  currentUsername = 'Qonaq';
  try {
    localStorage.removeItem('watchparty_user');
  } catch (e) {}
  const profileCard = document.getElementById('profile-dropdown-card');
  if (profileCard) profileCard.classList.add('hidden');
  updateUserUI();
  const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;
  showNotice(t ? t.noticeLogout : '👋 Hesabdan çıxış edildi');
}

function updateUserUI() {
  const hostLockStatusBadge = document.getElementById('host-lock-status-badge');
  const hostAuthPrompt = document.getElementById('host-auth-prompt');
  const btnCreateRoom = document.getElementById('btn-create-room');

  const btnOpenAuthLobby = document.getElementById('btn-open-auth-lobby');
  const lobbyUserProfileMenu = document.getElementById('lobby-user-profile-menu');
  const dropdownFullName = document.getElementById('dropdown-full-name');
  const dropdownEmailText = document.getElementById('dropdown-email-text');
  const dropdownAvatarCircle = document.getElementById('dropdown-avatar-circle');
  const dropdownStatusText = document.getElementById('dropdown-status-text');

  const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;

  if (currentUser && currentUser.isGoogle) {
    if (lobbyUserName) lobbyUserName.textContent = currentUser.username;
    if (lobbyUserAvatar) lobbyUserAvatar.textContent = currentUser.avatar || '🍿';
    if (headerUserName) headerUserName.textContent = currentUser.username;
    if (headerUserAvatar) headerUserAvatar.textContent = currentUser.avatar || '🍿';
    if (inputAvatarPreview) inputAvatarPreview.textContent = currentUser.avatar || '🍿';
    if (usernameInput && !usernameInput.value) usernameInput.value = currentUser.username;

    // Lobby yuxarı profil/giriş düymələrini dəyişdir
    if (btnOpenAuthLobby) btnOpenAuthLobby.classList.add('hidden');
    if (lobbyUserProfileMenu) lobbyUserProfileMenu.classList.remove('hidden');

    if (dropdownFullName) dropdownFullName.textContent = currentUser.username;
    if (dropdownEmailText) dropdownEmailText.textContent = currentUser.email || 'google.user@gmail.com';
    if (dropdownStatusText && t) dropdownStatusText.textContent = t.dropdownStatus;
    if (dropdownAvatarCircle) {
      if (currentUser.username) {
        const parts = currentUser.username.trim().split(/\s+/);
        const initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
        dropdownAvatarCircle.textContent = initials || 'VA';
      }
    }

    if (hostLockStatusBadge) {
      hostLockStatusBadge.textContent = t ? t.hostLockActive : '🟢 Google ilə Aktivdir';
      hostLockStatusBadge.className = 'action-badge lock-badge logged-in';
    }

    if (hostAuthPrompt) hostAuthPrompt.classList.add('hidden');
    if (btnCreateRoom) btnCreateRoom.classList.remove('hidden');
  } else {
    if (lobbyUserName) lobbyUserName.textContent = t ? t.topLogin : 'Google ilə Giriş';
    if (lobbyUserAvatar) lobbyUserAvatar.textContent = '🌐';
    if (headerUserName) headerUserName.textContent = 'Qonaq';
    if (headerUserAvatar) headerUserAvatar.textContent = '🍿';
    if (inputAvatarPreview) inputAvatarPreview.textContent = '👤';

    // Lobby yuxarı profil/giriş düymələrini dəyişdir
    if (btnOpenAuthLobby) btnOpenAuthLobby.classList.remove('hidden');
    if (lobbyUserProfileMenu) lobbyUserProfileMenu.classList.add('hidden');

    if (hostLockStatusBadge) {
      hostLockStatusBadge.textContent = t ? t.hostLockRequired : '🔒 Google Tələb Olunur';
      hostLockStatusBadge.className = 'action-badge lock-badge';
    }

    if (hostAuthPrompt) hostAuthPrompt.classList.remove('hidden');
    if (btnCreateRoom) btnCreateRoom.classList.add('hidden');
  }
}

function openAuthModal() {
  clearAuthStatus();
  openModal('modal-auth');
}

function showAuthStatus(msg, type) {
  if (!authStatusMsg) return;
  authStatusMsg.textContent = msg;
  authStatusMsg.className = `auth-status-msg ${type}`;
  authStatusMsg.classList.remove('hidden');
}

function clearAuthStatus() {
  if (!authStatusMsg) return;
  authStatusMsg.textContent = '';
  authStatusMsg.className = 'auth-status-msg hidden';
}

// ==========================================
// 12. XÜSUSİYYƏT 1: OTAQ KİLİDİ (ROOM LOCK)
// ==========================================

function setupRoomLock() {
  setupRoomToolsDropdown();

  if (!btnLockRoom) return;
  btnLockRoom.addEventListener('click', () => {
    if (!socket) return;
    if (!isHost) {
      showNotice('⚠️ Yalnız otaq rəhbəri (Host) otağı kilidləyə bilər!');
      return;
    }
    socket.emit('toggle-room-lock');
  });
}

function setupRoomToolsDropdown() {
  const btnToggle = document.getElementById('btn-room-tools-toggle');
  const dropdown = document.getElementById('room-tools-dropdown');
  if (btnToggle && dropdown) {
    btnToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    dropdown.querySelectorAll('.tool-dropdown-row').forEach(btn => {
      btn.addEventListener('click', () => {
        dropdown.classList.add('hidden');
      });
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && !btnToggle.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      }
    });
  }
}

function updateRoomLockUI(locked) {
  if (!btnLockRoom) return;
  if (locked) {
    btnLockRoom.classList.add('locked');
    if (lockIcon) lockIcon.textContent = '🔒';
    if (lockText) lockText.textContent = 'Kilidli';
    btnLockRoom.title = 'Otaq kilidlidir (Yeni qoşulmalar dayandırılıb)';
  } else {
    btnLockRoom.classList.remove('locked');
    if (lockIcon) lockIcon.textContent = '🔓';
    if (lockText) lockText.textContent = 'Açıqdır';
    btnLockRoom.title = 'Otaq açıqdır (Klikləyərək kilidləyin)';
  }
}

// ==========================================
// 13. XÜSUSİYYƏT 3: SEANS SONU QİYMƏTLƏNDİRMƏ (MOVIE REVIEW)
// ==========================================

function setupMovieReview() {
  if (btnOpenReview) {
    btnOpenReview.addEventListener('click', () => {
      if (reviewMovieTitle && !reviewMovieTitle.value) {
        if (currentVideoState && currentVideoState.type === 'direct') {
          reviewMovieTitle.value = 'İzlədiyimiz Film';
        } else if (currentVideoState && currentVideoState.type === 'youtube') {
          reviewMovieTitle.value = 'YouTube Seansı';
        }
      }
      openModal('modal-review');
    });
  }

  // Ulduz seçimi (1-10)
  if (starsRow) {
    const stars = starsRow.querySelectorAll('.star-item');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const val = parseInt(star.getAttribute('data-val'), 10) || 10;
        currentMovieRating = val;
        if (starRatingNum) starRatingNum.textContent = val;
        renderStars(val);
      });

      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.getAttribute('data-val'), 10) || 10;
        renderStars(val);
      });
    });

    starsRow.addEventListener('mouseleave', () => {
      renderStars(currentMovieRating);
    });
  }

  function renderStars(activeCount) {
    const stars = starsRow.querySelectorAll('.star-item');
    stars.forEach(s => {
      const v = parseInt(s.getAttribute('data-val'), 10) || 1;
      if (v <= activeCount) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
  }

  // Rəy və qiymətləndirmə formasının göndərilməsi
  if (movieReviewForm) {
    movieReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = reviewMovieTitle.value.trim();
      const note = reviewMovieNote.value.trim();
      if (!title || !socket) return;

      socket.emit('submit-movie-review', {
        title,
        rating: currentMovieRating,
        note
      });

      closeModal('modal-review');
      showNotice('🌟 Qiymətiniz göndərildi və qeyd edildi!');
      reviewMovieTitle.value = '';
      reviewMovieNote.value = '';
    });
  }
}

// ==========================================
// 14. XÜSUSİYYƏT 4: İŞIQLARI SÖNDÜR (CINEMA LIGHTS DIMMER)
// ==========================================

function applyRoomLights(dimmed) {
  const isDimmed = !!dimmed;
  if (isDimmed) {
    document.body.classList.add('lights-dimmed');
    if (btnFloatingRestoreLights) btnFloatingRestoreLights.classList.remove('hidden');
    if (btnDimLights) btnDimLights.classList.add('active');
  } else {
    document.body.classList.remove('lights-dimmed');
    if (btnFloatingRestoreLights) btnFloatingRestoreLights.classList.add('hidden');
    if (btnDimLights) btnDimLights.classList.remove('active');
  }
}

function toggleRoomLights() {
  const isCurrentlyDimmed = document.body.classList.contains('lights-dimmed');
  const newDimmed = !isCurrentlyDimmed;
  applyRoomLights(newDimmed);
  if (socket) {
    socket.emit('toggle-room-lights', { dimmed: newDimmed });
  }
}

function setupLightsDimmer() {
  if (btnDimLights) {
    btnDimLights.addEventListener('click', toggleRoomLights);
  }
  if (btnFloatingRestoreLights) {
    btnFloatingRestoreLights.addEventListener('click', toggleRoomLights);
  }
}

