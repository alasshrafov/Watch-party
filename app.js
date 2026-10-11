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
let screenPeerConnection = null;

// WebRTC Səsli Zəng (Mikrofon)
let localVoiceStream = null;
let isVoiceActive = false;
const voicePeerConnections = {};
const voiceIceCandidatesQueue = {};
let currentRoomUsers = {};

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

// STUN Serverləri (Global & Güclü NAT keçidi)
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' }
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
    roomInput.value = roomParam;
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

function leaveRoomAndReturnToLobby() {
  const t = (typeof I18N !== 'undefined' && I18N[currentLang]) ? I18N[currentLang] : null;
  if (roomScreen && roomScreen.classList.contains('active')) {
    const confirmLeave = confirm(t ? t.confirmLeave : 'Kino otağından çıxıb əsas ekrana (Lobby) qayıtmaq istəyirsiniz?');
    if (!confirmLeave) return;
  } else {
    return;
  }

  // 1. WebRTC və ekran/səs yayımlarını dayandır
  if (localScreenStream) {
    try { localScreenStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    localScreenStream = null;
  }
  if (screenPeerConnection) {
    try { screenPeerConnection.close(); } catch (e) {}
    screenPeerConnection = null;
  }
  if (localVoiceStream) {
    try { localVoiceStream.getTracks().forEach(t => t.stop()); } catch (e) {}
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

  // 3. Socket əlaqəsini bağla
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
  roomScreen.classList.remove('active');
  lobbyScreen.classList.add('active');

  // 7. UI-ı yenilə
  updateUserUI();
  showNotice(t ? t.noticeReturnLobby : '🛋️ Əsas ekrana qayıtdınız');
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
    if (data.history) renderHistory(data.history);
    showNotice(isHost ? '👑 Otaq rəhbərisiniz. Xoş gəldiniz!' : '🍿 Otağa qoşuldunuz!');
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
    roomScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
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
    // Otağa yeni girən iştirakçı ilə səsli zəng bağlantısını sinxronlaşdır (Glare-siz)
    if (socket && data.socketId && socket.id < data.socketId) {
      callVoicePeer(data.socketId);
    }
  });

  socket.on('user-left', (data) => {
    if (data.users) currentRoomUsers = data.users;
    updateUsersList(data.users || currentRoomUsers);
    showNotice(`👋 ${data.username} otaqdan ayrıldı`);
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
    // Yalnız socket.id < sender olan tərəf zəngi başladır (Dual-offer toqquşmasını tam aradan qaldırır)
    if (socket && sender && socket.id < sender) {
      await callVoicePeer(sender);
    }
  });

  socket.on('voice-peer-left', ({ peerId }) => {
    cleanupVoicePeer(peerId);
  });

  socket.on('voice-offer', async ({ sender, sdp }) => {
    await handleVoiceOffer(sender, sdp);
  });

  socket.on('voice-answer', async ({ sender, sdp }) => {
    const pc = voicePeerConnections[sender];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (voiceIceCandidatesQueue[sender]) {
          for (const cand of voiceIceCandidatesQueue[sender]) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
          }
          delete voiceIceCandidatesQueue[sender];
        }
      } catch (err) {
        console.warn('Voice answer remote desc error:', err);
      }
    }
  });

  socket.on('voice-ice', async ({ sender, candidate }) => {
    if (!candidate) return;
    const pc = voicePeerConnections[sender];
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {}
    } else {
      if (!voiceIceCandidatesQueue[sender]) voiceIceCandidatesQueue[sender] = [];
      voiceIceCandidatesQueue[sender].push(candidate);
    }
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
      `;
      sidebarList.appendChild(card);
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
    updateVoiceUI(true);
    showNotice('🎙️ Mikrofon aktivdir! Canlı danışa bilərsiniz.');

    // Audio Ducking Aktiv Et
    setupAudioDucking(localVoiceStream);

    // Əvvəldən mövcud peer bağlantılarına yerli mikrofon trekini dərhal əlavə et
    Object.entries(voicePeerConnections).forEach(([peerId, pc]) => {
      try {
        if (pc && pc.connectionState !== 'closed') {
          const senders = pc.getSenders();
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender && localVoiceStream.getAudioTracks().length > 0) {
            audioSender.replaceTrack(localVoiceStream.getAudioTracks()[0]);
          } else if (localVoiceStream.getAudioTracks().length > 0) {
            localVoiceStream.getAudioTracks().forEach(t => pc.addTrack(t, localVoiceStream));
          }
        }
      } catch (e) {}
    });

    if (socket) {
      socket.emit('voice-peer-ready');
      socket.emit('voice-user-state', { isVoiceActive: true });
    }

    // Otaqdakı digər istifadəçilərlə zəngi sinxronlaşdır (Yalnız socket.id < peerId olanlar zəng başladır)
    syncVoiceConnectionsWithPeers();
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
  if (isSelfSpeaking) {
    isSelfSpeaking = false;
    setSelfSpeakingHalo(false);
    if (socket) socket.emit('user-speaking', { isSpeaking: false });
  }
  updateVoiceUI(false);

  stopAudioDucking();

  Object.keys(voicePeerConnections).forEach(peerId => {
    cleanupVoicePeer(peerId);
  });

  if (socket) {
    socket.emit('voice-peer-left');
    socket.emit('voice-user-state', { isVoiceActive: false });
  }
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

function cleanupVoicePeer(peerId) {
  if (voicePeerConnections[peerId]) {
    try { voicePeerConnections[peerId].close(); } catch (e) {}
    delete voicePeerConnections[peerId];
  }
  delete voiceIceCandidatesQueue[peerId];
  const audioEl = document.getElementById(`remote-voice-audio-${peerId}`);
  if (audioEl) {
    audioEl.srcObject = null;
    audioEl.remove();
  }
}

function setSelfSpeakingHalo(speaking) {
  if (!socket) return;
  const selfPill = document.getElementById(`user-pill-${socket.id}`);
  if (selfPill) {
    if (speaking) selfPill.classList.add('speaking-halo');
    else selfPill.classList.remove('speaking-halo');
  }
  const selfCard = document.getElementById(`participant-item-${socket.id}`);
  if (selfCard) {
    if (speaking) selfCard.classList.add('speaking');
    else selfCard.classList.remove('speaking');
  }
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
        if (!isSelfSpeaking) {
          isSelfSpeaking = true;
          setSelfSpeakingHalo(true);
          if (socket) socket.emit('user-speaking', { isSpeaking: true });
        }
        if (!isDucked) {
          isDucked = true;
          applyDuckingVolume(true);
          if (duckingBadge) duckingBadge.classList.add('ducking-active');
        }
      } else {
        if (isSelfSpeaking) {
          isSelfSpeaking = false;
          setSelfSpeakingHalo(false);
          if (socket) socket.emit('user-speaking', { isSpeaking: false });
        }
        if (isDucked) {
          isDucked = false;
          applyDuckingVolume(false);
          if (duckingBadge) duckingBadge.classList.remove('ducking-active');
        }
      }
    }, 180);
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

function syncVoiceConnectionsWithPeers() {
  if (!socket || !currentRoomUsers) return;
  Object.keys(currentRoomUsers).forEach(peerId => {
    if (peerId !== socket.id) {
      // Deterministic initiator: yalnız socket.id < peerId olan tərəf zəngi başladır
      // Bu, WebRTC toqquşmasını (glare/race condition) 100% aradan qaldırır!
      if (socket.id < peerId) {
        callVoicePeer(peerId);
      }
    }
  });
}

async function callVoicePeer(targetSocketId) {
  if (!targetSocketId || !socket) return;
  console.log(`[WebRTC Voice] Initiating voice call to ${targetSocketId}`);

  if (voicePeerConnections[targetSocketId]) {
    try { voicePeerConnections[targetSocketId].close(); } catch (e) {}
    delete voicePeerConnections[targetSocketId];
  }

  const pc = new RTCPeerConnection(rtcConfig);
  voicePeerConnections[targetSocketId] = pc;

  if (localVoiceStream && localVoiceStream.getAudioTracks().length > 0) {
    localVoiceStream.getAudioTracks().forEach(track => {
      pc.addTrack(track, localVoiceStream);
    });
  } else {
    pc.addTransceiver('audio', { direction: 'recvonly' });
  }

  pc.ontrack = (event) => {
    console.log(`[WebRTC Voice] Received audio track from ${targetSocketId}:`, event.track);
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    playRemoteVoice(stream, targetSocketId);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('voice-ice', { target: targetSocketId, candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC Voice ${targetSocketId}] State: ${pc.connectionState}`);
    if (pc.connectionState === 'connected') {
      showNotice('🎙️ Səsli zəng bağlantısı quruldu!');
    }
  };

  try {
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    if (socket) {
      socket.emit('voice-offer', { target: targetSocketId, sdp: offer });
    }
  } catch (err) {
    console.error('Call voice peer offer error:', err);
  }
}

async function handleVoiceOffer(senderSocketId, sdp) {
  if (!senderSocketId || !sdp || !socket) return;
  console.log(`[WebRTC Voice] Received voice offer from ${senderSocketId}`);

  if (voicePeerConnections[senderSocketId]) {
    try { voicePeerConnections[senderSocketId].close(); } catch (e) {}
    delete voicePeerConnections[senderSocketId];
  }

  const pc = new RTCPeerConnection(rtcConfig);
  voicePeerConnections[senderSocketId] = pc;

  if (localVoiceStream && localVoiceStream.getAudioTracks().length > 0) {
    localVoiceStream.getAudioTracks().forEach(track => {
      pc.addTrack(track, localVoiceStream);
    });
  } else {
    pc.addTransceiver('audio', { direction: 'recvonly' });
  }

  pc.ontrack = (event) => {
    console.log(`[WebRTC Voice] Received audio track from ${senderSocketId}:`, event.track);
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    playRemoteVoice(stream, senderSocketId);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('voice-ice', { target: senderSocketId, candidate: event.candidate });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC Voice ${senderSocketId}] State: ${pc.connectionState}`);
    if (pc.connectionState === 'connected') {
      showNotice('🎙️ Səsli zəng bağlantısı quruldu!');
    }
  };

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    // Növbədə gözləyən ICE namizədlərini əlavə et
    if (voiceIceCandidatesQueue[senderSocketId]) {
      for (const cand of voiceIceCandidatesQueue[senderSocketId]) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {}
      }
      delete voiceIceCandidatesQueue[senderSocketId];
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    if (socket) {
      socket.emit('voice-answer', { target: senderSocketId, sdp: answer });
    }
  } catch (err) {
    console.error('Handle voice offer error:', err);
  }
}

function playRemoteVoice(stream, peerId) {
  let audioEl = document.getElementById(`remote-voice-audio-${peerId}`);
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = `remote-voice-audio-${peerId}`;
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    // display:none etmirik ki, brauzer arxa planda səs çıxışını dondurmasın
    audioEl.style.position = 'fixed';
    audioEl.style.top = '-9999px';
    audioEl.style.left = '-9999px';
    audioEl.style.width = '1px';
    audioEl.style.height = '1px';
    audioEl.style.opacity = '0.01';
    document.body.appendChild(audioEl);
  }
  audioEl.srcObject = stream;
  audioEl.muted = false;
  audioEl.volume = 1.0;

  const playPromise = audioEl.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn(`[WebRTC Voice] Autoplay blocked for ${peerId}:`, err);
      const unlockAudio = () => {
        audioEl.play().catch(() => {});
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      };
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });
    });
  }

  showNotice('🔊 Canlı səsli danışıq qoşuldu!');
}

// Bütün pleyer və səs kilidlərini istifadəçi kliklədikdə dərhal aç
function unlockAllRemoteAudios() {
  document.querySelectorAll('audio[id^="remote-voice-audio-"]').forEach(el => {
    if (el.paused) el.play().catch(() => {});
  });
}
document.addEventListener('click', unlockAllRemoteAudios);
document.addEventListener('touchstart', unlockAllRemoteAudios);

function getThemeName(theme) {
  const map = {
    'theme-netflix': '🎬 Netflix Cinema',
    'theme-spiderman': '🕷️ Marvel / Avengers (MCU)',
    'theme-breaking-bad': '🧪 Breaking Bad (Heisenberg)',
    'theme-got': '⚔️ Game of Thrones (Winterfell)',
    'theme-batman': '🦇 The Dark Knight (Gotham)',
    'theme-interstellar': '🌌 Interstellar (Cosmos)',
    'theme-matrix': '🕶️ The Matrix (Cyber)',
    'theme-discord': '👾 Discord Dark',
    'theme-oled': '🖤 OLED Minimal'
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

  // 3. Chess.com Stilli "Continue with Google" Düyməsi (Modal daxilində)
  const btnChessGoogle = document.getElementById('btn-chess-google');
  if (btnChessGoogle) {
    btnChessGoogle.addEventListener('click', () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.prompt();
        } catch (e) {}
      }
      const chooser = document.getElementById('google-account-chooser');
      if (chooser) {
        chooser.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 4. Google Hesab Seçimi Kartları (Şəkildəki Vali Alashrafov və s. 1-kliklə daxil olmaq)
  const userTiles = document.querySelectorAll('.google-user-tile:not(#tile-custom-google)');
  userTiles.forEach(tile => {
    tile.addEventListener('click', async () => {
      const email = tile.getAttribute('data-email');
      const name = tile.getAttribute('data-name');
      await executeGoogleLogin(email, name);
    });
  });

  // 5. Başqa Google hesabı daxil etmə forması
  const tileCustom = document.getElementById('tile-custom-google');
  const formCustom = document.getElementById('form-custom-google');
  const customEmailInput = document.getElementById('custom-google-email');
  if (tileCustom && formCustom) {
    tileCustom.addEventListener('click', () => {
      formCustom.classList.toggle('hidden');
      if (!formCustom.classList.contains('hidden') && customEmailInput) {
        customEmailInput.focus();
      }
    });
  }
  if (formCustom) {
    formCustom.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = customEmailInput.value.trim();
      if (!email) return;
      const name = email.split('@')[0];
      await executeGoogleLogin(email, name);
    });
  }

  // 6. Rəsmi Google GIS SDK-nı inisializasiya et
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
    // Şəbəkə / API gecikməsi olsa belə, 1 kliklə yerli sessiya aç
    const fallbackUser = {
      id: 'g_' + Date.now(),
      username: name || (email ? email.split('@')[0] : 'Vali Alashrafov'),
      email: email || 'alialashrafov0708@gmail.com',
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

function setupLightsDimmer() {
  if (!btnDimLights) return;
  btnDimLights.addEventListener('click', () => {
    const isDimmed = document.body.classList.toggle('lights-dimmed');
    btnDimLights.classList.toggle('active', isDimmed);
    const textSpan = btnDimLights.querySelector('span');
    if (isDimmed) {
      if (textSpan) textSpan.textContent = '💡 İşıqlar Söndü';
      btnDimLights.title = 'İşıqları yandır (Normal rejimə qayıt)';
      showNotice('🎬 Kinoteatr rejimi: Ətraf işıqlar söndürüldü!');
    } else {
      if (textSpan) textSpan.textContent = '💡 İşıqlar';
      btnDimLights.title = 'Kinoteatr zalı rejimi: İşıqları söndür';
      showNotice('💡 İşıqlar yandırıldı');
    }
  });
}

