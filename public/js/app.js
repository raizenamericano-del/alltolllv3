/* ============================================================================
   ⚡ ALL TOOLS KYY — Frontend App Logic
   Developer : Rifkyy sensei
   ========================================================================== */
'use strict';

/* ================================ HELPERS ================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function toast(msg, type = 'success') {
  const wrap = $('#toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="t-ico">${type === 'success' ? '✅' : '⚠️'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3400);
}

function copyText(text) {
  navigator.clipboard?.writeText(text).then(
    () => toast('Berhasil disalin ke clipboard 📋'),
    () => toast('Gagal menyalin 😢', 'error')
  );
}

async function api(path, body) {
  const t0 = performance.now();
  const opts = body !== undefined
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {};
  const res = await fetch('/api' + path, opts);
  const data = await res.json().catch(() => ({ status: false, error: 'Respon server tidak valid' }));
  if (!data.status) throw new Error(data.error || 'Request gagal');
  data._ms = Math.round(performance.now() - t0);
  return data;
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LOADER_HTML = `<div class="loader-wrap"><div class="loader"></div><p>Sabar, lagi diproses…</p></div>`;
const errBox = (msg) => `<div class="result-box" style="border-color:rgba(248,113,113,.4)"><b style="color:var(--red)">❌ ${esc(msg)}</b></div>`;
const looksUrl = (s) => /^https?:\/\/[^\s]+\.[^\s]+/.test(String(s || '').trim());

/* ============================ PARTICLES CANVAS ============================ */

(function particles() {
  const cv = $('#particles');
  const ctx = cv.getContext('2d');
  let W, H, pts = [];
  const COLORS = ['168,85,247', '34,211,238', '236,72,153'];

  function resize() {
    W = cv.width = innerWidth;
    H = cv.height = innerHeight;
    const n = Math.min(70, Math.floor(W / 22));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: Math.random() * 0.5 + 0.2,
    }));
  }
  addEventListener('resize', resize);
  resize();

  (function loop() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.shadowColor = `rgba(${p.c},0.9)`;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // garis koneksi tipis
    ctx.strokeStyle = 'rgba(120,140,255,0.055)';
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        if (dx * dx + dy * dy < 130 * 130) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  })();
})();

/* ============================ STATUS & HEALTH ============================= */

let _healthRetried = false;
async function pingHealth() {
  const pill = $('#statusPill'), txt = $('#statusText'), lat = $('#latencyText');
  pill.className = 'status-pill checking';
  txt.textContent = 'Checking…';
  try {
    const t0 = performance.now();
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!data.status) throw new Error();
    _healthRetried = false;
    pill.className = 'status-pill';
    txt.textContent = 'Online';
    lat.textContent = `${Math.round(performance.now() - t0)}ms`;
  } catch {
    // servernya bisa cold-start — coba sekali lagi sebelum vonis offline
    if (!_healthRetried) {
      _healthRetried = true;
      txt.textContent = 'Menyambung…';
      setTimeout(pingHealth, 3200);
      return;
    }
    pill.className = 'status-pill offline';
    txt.textContent = 'Offline';
    lat.textContent = '';
  }
}
pingHealth();
setInterval(pingHealth, 30000);
addEventListener('online', () => { _healthRetried = false; pingHealth(); });

/* ============================ VISITOR INFO ================================ */

function flagEmoji(code) {
  if (!code || code.length !== 2 || !/^[A-Z]+$/.test(code)) return '🏳️';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

(async function loadInfo() {
  try {
    const d = await api('/info');
    $('#infCountry').textContent = `${flagEmoji((d.countryCode || '').toUpperCase())} ${d.country || 'Tidak terdeteksi'}`;
    $('#infDevice').textContent = d.device || '—';
    $('#infBrowser').textContent = d.browser || '—';
    $('#infOs').textContent = d.os || '—';
    $('#infCity').textContent = d.city && d.city !== '-' ? d.city : '—';
    $('#infIp').textContent = d.ip || '—';
  } catch {
    $('#infCountry').textContent = 'Gagal memuat ⚠️';
    ['infDevice', 'infBrowser', 'infOs', 'infCity', 'infIp'].forEach((id) => ($('#' + id).textContent = '—'));
  }
})();

/* ========================= TYPING & COUNTERS ============================== */

(function typing() {
  const lines = [
    '67 tools gratis. Ga pake login, ga pake ribet…',
    'Download video TikTok & IG tanpa watermark, gas…',
    'Brat gojo, IQC, AI art… semua bisa diedit di sini…',
    'Gabut? Ada arcade, kuis trivia & top anime juga 🐍',
    'Yang baca ini fix lagi kepo. Scroll aja bawah 😌',
  ];
  const el = $('#typed');
  let li = 0, ci = 0, del = false;
  (function tick() {
    const line = lines[li];
    el.textContent = line.slice(0, ci);
    if (!del && ci < line.length) { ci++; setTimeout(tick, 34); }
    else if (!del) { del = true; setTimeout(tick, 2100); }
    else if (ci > 0) { ci--; setTimeout(tick, 13); }
    else { del = false; li = (li + 1) % lines.length; setTimeout(tick, 350); }
  })();
})();

function animateCounters() {
  $$('[data-count]').forEach((el) => {
    const target = +el.dataset.count;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const iv = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(iv); }
      el.textContent = cur + '+';
    }, 40);
  });
}

// Kunjungan (lokal)
(function visits() {
  const k = 'kyy_visits';
  const n = (parseInt(localStorage.getItem(k)) || 0) + 1;
  localStorage.setItem(k, n);
  $('#visitCount').textContent = n;
})();

/* ============================= TOOLS CONFIG =============================== */

const TOOLS = [
  { id: 'aio',        cat: 'downloader', icon: '⚡', title: 'AIO Downloader',  desc: 'Auto deteksi platform apa saja',  badge: 'AUTO',     bc: 'purple' },
  { id: 'tiktok',     cat: 'downloader', icon: '🎵', title: 'TikTok',          desc: 'No watermark + HD + MP3',        badge: 'MP4/MP3',  bc: '' },
  { id: 'instagram',  cat: 'downloader', icon: '📸', title: 'Instagram',       desc: 'Foto, video, reels & story',     badge: 'HD',       bc: 'pink' },
  { id: 'youtube',    cat: 'downloader', icon: '▶️', title: 'YouTube',         desc: 'Video MP4 & audio MP3',          badge: 'MP4/MP3',  bc: '' },
  { id: 'facebook',   cat: 'downloader', icon: '📘', title: 'Facebook',        desc: 'Video FB, reels & fb.watch',     badge: 'HD',       bc: 'purple' },
  { id: 'twitter',    cat: 'downloader', icon: '🐦', title: 'Twitter / X',     desc: 'Video & GIF dari X',             badge: 'HD',       bc: 'pink' },
  { id: 'winquote',   cat: 'maker',      icon: '🪟', title: 'Windows Quotes',  desc: 'Quote meme ala error Windows',   badge: 'MEME',     bc: 'purple' },
  { id: 'meme',       cat: 'maker',      icon: '🖼️', title: 'Meme Generator',  desc: 'Meme teks atas-bawah klasik',    badge: 'CANVAS',   bc: 'pink' },
  { id: 'quotecard',  cat: 'maker',      icon: '✨', title: 'Quote Card',      desc: 'Kartu quote estetik neon',       badge: 'HD',       bc: '' },
  { id: 'iqc',        cat: 'maker',      icon: '📱', title: 'IQC Studio',      desc: 'Fake chat iMessage HD asli bot', badge: 'PRO',      bc: 'pink' },
  { id: 'removebg',   cat: 'maker',      icon: '✂️', title: 'Remove BG',       desc: 'Hapus background foto otomatis', badge: 'AI',      bc: 'purple' },
  { id: 'ocr',        cat: 'tools',      icon: '📖', title: 'OCR Baca Foto',   desc: 'Ubah tulisan di foto jadi teks', badge: 'AI',      bc: '' },
  { id: 'nulis',      cat: 'maker',      icon: '📝', title: 'Nulis Kertas',    desc: 'Tulisan tangan di kertas garis', badge: 'CLASSIC',  bc: '' },
  { id: 'codesnap',   cat: 'maker',      icon: '💻', title: 'Code Snapshot',   desc: 'Foto kode estetik macOS',        badge: 'DEV',      bc: 'purple' },
  { id: 'musiccard',  cat: 'maker',      icon: '🎧', title: 'Music Card',      desc: 'Now playing card estetik',       badge: 'MUSIC',    bc: 'pink' },
  { id: 'ustadz',     cat: 'maker',      icon: '🕌', title: 'Tanya Ustadz',    desc: 'Meme tanya pak ustadz',          badge: 'MEME',    bc: '' },
  { id: 'fakechat',   cat: 'maker',      icon: '💬', title: 'Fake Chat WA',    desc: 'Chat WhatsApp palsu buat meme',  badge: 'MEME',    bc: 'purple' },
  { id: 'aiart',      cat: 'maker',      icon: '🎨', title: 'AI Art Maker',    desc: 'Ngetik jadi gambar keren pake AI', badge: 'AI',      bc: 'purple' },
  { id: 'brat',       cat: 'maker',      icon: '🌿', title: 'Brat Studio',     desc: 'Stiker brat gojo, ijo, anime dll', badge: '10+ MODE', bc: 'pink' },
  { id: 'qcw',        cat: 'maker',      icon: '🫧', title: 'Quote Bubble',    desc: 'Quote chat gelembung ala WA/TG', badge: 'MEME',     bc: '' },
  { id: 'artinama',   cat: 'fun',        icon: '🔮', title: 'Arti Nama',       desc: 'Makna tersembunyi namamu',       badge: 'PRIMBON',  bc: 'purple' },
  { id: 'cocok',      cat: 'fun',        icon: '💞', title: 'Kecocokan Jodoh', desc: 'Cek sial dua nama, eh cocok',    badge: 'PRIMBON',  bc: 'pink' },
  { id: 'zodiak',     cat: 'fun',        icon: '♈', title: 'Ramalan Zodiak',  desc: 'Detail zodiak lengkap sekalian', badge: 'PRIMBON',  bc: '' },
  { id: 'qrcode',     cat: 'tools',      icon: '🔳', title: 'QR Generator',    desc: 'Teks/link jadi QR code',         badge: 'INSTANT',  bc: '' },
  { id: 'calc',       cat: 'tools',      icon: '🧮', title: 'Calculator',      desc: 'Hitung cepat & aman',            badge: 'MATH',     bc: 'purple' },
  { id: 'password',   cat: 'tools',      icon: '🔐', title: 'Password Gen',    desc: 'Password random super aman',     badge: 'SECURE',   bc: 'pink' },
  { id: 'morse',      cat: 'tools',      icon: '📡', title: 'Morse Code',      desc: 'Konversi morse + audio',         badge: 'AUDIO',    bc: '' },
  { id: 'base64',     cat: 'tools',      icon: '🔁', title: 'Base64',          desc: 'Encode & decode teks',           badge: 'TEXT',     bc: 'purple' },
  { id: 'wordcount',  cat: 'tools',      icon: '📝', title: 'Word Counter',    desc: 'Hitung kata, huruf & kalimat',   badge: 'TEXT',     bc: 'pink' },
  { id: 'fancytext',  cat: 'tools',      icon: '✍️', title: 'Fancy Text',      desc: 'Teks gaya unicode buat bio/chat', badge: 'UNICODE', bc: '' },
  { id: 'stalktt',    cat: 'tools',      icon: '🕵️', title: 'Stalk TikTok',    desc: 'Kepoin profil & statistik akun', badge: 'STALK',   bc: 'pink' },
  { id: 'ipgeo',      cat: 'tools',      icon: '🌐', title: 'Cek IP',          desc: 'Lacak lokasi alamat IP',         badge: 'GEO',     bc: 'purple' },
  { id: 'tts',        cat: 'tools',      icon: '🗣️', title: 'Text to Speech',  desc: 'Teks dibacain jadi suara',       badge: 'AUDIO',   bc: '' },
  { id: 'picker',     cat: 'tools',      icon: '🎰', title: 'Random Picker',   desc: 'Spin & undian nama acak',        badge: 'FUN',     bc: 'pink' },
  { id: 'units',      cat: 'tools',      icon: '📐', title: 'Unit Converter',  desc: 'Panjang, berat, suhu, data',     badge: 'CONV',    bc: '' },
  { id: 'webshot',    cat: 'tools',      icon: '📸', title: 'Web Screenshot',  desc: 'Jepret tampilan website',        badge: 'WEB',     bc: 'purple' },
  { id: 'vault',      cat: 'tools',      icon: '🗃️', title: 'Riwayat Download', desc: 'Jejak unduhanmu (offline)',    badge: 'LOCAL',   bc: '' },
  { id: 'ghstalk',    cat: 'tools',      icon: '🐙', title: 'GitHub Stalk',    desc: 'Kepoin profil GitHub',           badge: 'STALK',   bc: 'purple' },
  { id: 'sholat',     cat: 'tools',      icon: '🕌', title: 'Jadwal Sholat',   desc: 'Jadwal sholat seluruh Indonesia', badge: 'RELIGI', bc: 'pink' },
  { id: 'fotolink',   cat: 'tools',      icon: '🔗', title: 'Foto Jadi Link',  desc: 'Upload foto langsung jadi link', badge: 'CDN',    bc: 'purple' },
  { id: 'stalkpin',   cat: 'tools',      icon: '📌', title: 'Stalk Pinterest', desc: 'Kepoin profil Pinterest orang',  badge: 'STALK',  bc: 'pink' },
  { id: 'cekrandom',  cat: 'tools',      icon: '🎯', title: 'Cek Random',      desc: 'Cek bucin, wibu, hoki harianmu', badge: 'FUN',     bc: '' },
  { id: 'lirik',      cat: 'tools',      icon: '🎵', title: 'Lirik Lagu',      desc: 'Cari lirik lagu whatsapp-storyable', badge: 'SEARCH', bc: 'purple' },
  { id: 'pinsearch',  cat: 'tools',      icon: '📌', title: 'Cari Pinterest',  desc: 'Cari gambar estetik dari Pinterest', badge: 'SEARCH', bc: 'pink' },
  { id: 'stalkff',    cat: 'tools',      icon: '🔥', title: 'Stalk Free Fire', desc: 'Kepoin akun FF dari UID',        badge: 'STALK',   bc: '' },
  { id: 'stalkroblox', cat: 'tools',     icon: '🤖', title: 'Stalk Roblox',    desc: 'Profil Roblox lengkap + stats',  badge: 'STALK',   bc: 'purple' },
  { id: 'asmaul',     cat: 'tools',      icon: '🕌', title: 'Asmaul Husna',    desc: '99 nama Allah beserta artinya',  badge: 'RELIGI',  bc: 'pink' },
  { id: 'minigames',  cat: 'fun',        icon: '🎮', title: 'Mini Games',      desc: 'Tebak kata, cak lontong & kawan2', badge: '1600+ SOAL', bc: 'purple' },
  { id: 'tod',        cat: 'fun',        icon: '😈', title: 'Truth or Dare',   desc: 'Berani jujur atau berani aksi?', badge: 'PARTY',   bc: 'pink' },
  { id: 'quotesb',    cat: 'fun',        icon: '💌', title: 'Quotes Bucin',    desc: 'Stok kata bucin & renungan',     badge: 'CAPTION', bc: '' },
  { id: 'khodam',     cat: 'fun',        icon: '🧿', title: 'Cek Khodam',      desc: 'Khodam kamu siapa hari ini?',    badge: 'GAIB',    bc: 'purple' },
  { id: 'simi',       cat: 'fun',        icon: '🤖', title: 'Simi Chat',       desc: 'Ngobrol sama AI julid',          badge: 'AI',      bc: '' },
  { id: 'libur',      cat: 'fun',        icon: '📅', title: 'Hari Apa Ini',    desc: 'Hari besar nasional + libur',    badge: 'INFO',    bc: 'pink' },
  { id: 'ppcouple',   cat: 'fun',        icon: '💑', title: 'PP Couple',       desc: 'Duo avatar couple kamu & dia',   badge: 'COUPLE',  bc: 'purple' },
  { id: 'randomanime',cat: 'fun',        icon: '✨', title: 'Random Anime',    desc: 'Pull gacha gambar anime',        badge: 'ANIME',   bc: '' },
  { id: 'aimath',     cat: 'tools',      icon: '🧮', title: 'AI Matematika',   desc: 'Soal dijawab step by step',      badge: 'AI',      bc: 'pink' },
  { id: 'signpad',    cat: 'maker',      icon: '✍️', title: 'Tanda Tangan',    desc: 'Gambar TTD digital online',      badge: 'CANVAS',  bc: '' },
  { id: 'hdphoto',    cat: 'maker',      icon: '🔍', title: 'HD Foto',         desc: 'Upscale & tajemin foto langsung di HP', badge: 'ENHANCE', bc: 'purple' },
  { id: 'cuaca',      cat: 'tools',      icon: '🌤️', title: 'Cek Cuaca',       desc: 'Ramalan cuaca kotamu hari ini',  badge: 'WEATHER', bc: 'purple' },
  { id: 'umur',       cat: 'fun',        icon: '🎂', title: 'Kalkulator Umur', desc: 'Seberapa tua sih kamu',          badge: 'FUN',     bc: 'pink' },
  { id: 'animetop',   cat: 'fun',        icon: '🏆', title: 'Top Anime',       desc: 'Ranking anime terbaik & yang lagi tayang', badge: 'JIKAN', bc: 'purple' },
  { id: 'pokedex',    cat: 'tools',      icon: '⚡', title: 'Pokédex',         desc: 'Cari Pokémon: stats, tipe & artwork', badge: 'POKÉAPI', bc: '' },
  { id: 'negara',     cat: 'tools',      icon: '🌍', title: 'Info Negara',     desc: 'Bendera, ibu kota, populasi & peta', badge: 'DUNIA',   bc: 'pink' },
  { id: 'nekopic',    cat: 'fun',        icon: '🐱', title: 'Anime Random+',   desc: 'Waifu, neko & gif anime multi kategori', badge: '12 MODE', bc: '' },
  { id: 'trivia',     cat: 'fun',        icon: '🧠', title: 'Kuis Trivia',     desc: '10 soal pilihan ganda, jangan nyerah', badge: 'QUIZ',    bc: 'purple' },
  { id: 'arcade',     cat: 'fun',        icon: '🐍', title: 'Arcade Zone',     desc: 'Snake klasik + tes refleks kilat',  badge: 'OFFLINE', bc: 'pink' },
  { id: 'freegames',  cat: 'fun',        icon: '🎁', title: 'Game Gratisan',   desc: 'Koleksi game PC & browser yang legal gratis', badge: 'FREE', bc: '' },
];

const CAT_LABEL = { downloader: '⬇️ Downloader', maker: '🎨 Maker', tools: '🛠️ Tools', fun: '🎲 Fun' };

// Jumlah tools di hero stat ngikut otomatis, ga perlu edit manual
$('#statTools').dataset.count = TOOLS.length;
// sinkronin angka stat TOOLS sama isi array (biar ga usah edit 2 tempat)
(() => {
  const st = document.getElementById('statTools');
  if (st && typeof TOOLS !== 'undefined') st.dataset.count = TOOLS.length;
})();
animateCounters();

/* ================== POLISH EXTRAS (easter egg & fun) ====================== */

// 🥚 klik logo 5x → mode rahasia glitch 40 detik
(() => {
  let n = 0, t;
  document.querySelectorAll('.brand-logo, .foot-logo').forEach((el) => el.addEventListener('click', () => {
    n++; clearTimeout(t); t = setTimeout(() => (n = 0), 2500);
    if (n >= 5) {
      n = 0;
      document.body.classList.add('glitch-mode');
      toast('MODE RAHASIA 🫢🔓 ON selama 40 detik — enjoy glitch-nya');
      setTimeout(() => document.body.classList.remove('glitch-mode'), 40_000);
    }
  }));
})();

// 💜 kalimat footer random biar kerasa hidup
(() => {
  const el = $('#footFun');
  if (!el) return;
  const LINES = [
    '— dibikin jam 2 pagi ditemenin playlist sad songs 🌙',
    '— isinya: scraper bot WA + doa + kopi saset ☕',
    '— kalo nemu tool rusak, sabar, dev-nya juga manusia wkwk',
    '— yg baca sampe sini fix anaknya kepo banget 🫵',
    '— request? gas bilang, jangan diliatin doang 🔥',
    '— best view: malem² lampu mati scroll-scroll snednark 😌',
  ];
  el.textContent = LINES[(Math.random() * LINES.length) | 0];
})();

// ✨ glow kursor ambient (cuma di desktop, HP ga perlu)
(() => {
  if (!matchMedia('(pointer:fine)').matches) return;
  const g = document.createElement('div');
  g.id = 'cursorGlow';
  document.body.appendChild(g);
  addEventListener('mousemove', (e) => {
    g.style.transform = `translate(${e.clientX - 160}px, ${e.clientY - 160}px)`;
  }, { passive: true });
})();

/* ==================== VAULT (riwayat download lokal) ====================== */

// Lazy-load paket data game/quotes dari bot WA (201KB, diambil cuma pas dibutuhin)
let _gdPromise = null;
function loadGamedata() {
  if (window.GAMEDATA) return Promise.resolve(window.GAMEDATA);
  _gdPromise ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'js/gamedata.js';
    s.onload = () => (window.GAMEDATA ? res(window.GAMEDATA) : rej(new Error('paket data gagal dimuat')));
    s.onerror = () => rej(new Error('paket data gagal dimuat, cek jaringan'));
    document.head.appendChild(s);
  });
  return _gdPromise;
}

const VAULT_KEY = 'kyy_vault';
function vaultGet() {
  try { return JSON.parse(localStorage.getItem(VAULT_KEY)) || []; } catch { return []; }
}
function vaultAdd(entry) {
  try {
    const v = vaultGet();
    v.unshift({ ...entry, at: Date.now() });
    localStorage.setItem(VAULT_KEY, JSON.stringify(v.slice(0, 30)));
  } catch { /* abaikan */ }
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'baru aja';
  if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  return Math.floor(s / 86400) + ' hari lalu';
}
function shortNum(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' M';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' jt';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' rb';
  return String(n);
}
const PLATFORM_EMOJI = { tiktok: '🎵', instagram: '📸', youtube: '▶️', facebook: '📘', twitter: '🐦' };

/* ============================ GRID & FILTER =============================== */

let activeFilter = 'all';
let searchQuery = '';

function renderGrid() {
  const grid = $('#toolsGrid');
  const items = TOOLS.filter((t) => {
    const okCat = activeFilter === 'all' || t.cat === activeFilter;
    const q = searchQuery.toLowerCase();
    const okSearch = !q || (t.title + ' ' + t.desc + ' ' + t.cat).toLowerCase().includes(q);
    return okCat && okSearch;
  });
  $('#emptyState').hidden = items.length > 0;
  grid.innerHTML = items.map((t, i) => `
    <div class="tool-card" data-tool="${t.id}" style="animation-delay:${i * 45}ms">
      <div class="tool-top">
        <div class="tool-icon">${t.icon}</div>
        <span class="tool-badge ${t.bc}">${t.badge}</span>
      </div>
      <h3>${t.title}</h3>
      <p>${t.desc}</p>
      <span class="tool-open">Buka tools <b>→</b></span>
    </div>`).join('');
}

$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  $$('.tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.filter;
  renderGrid();
});

$('#searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderGrid();
});

// Glow mengikuti kursor + buka modal
$('#toolsGrid').addEventListener('mousemove', (e) => {
  const card = e.target.closest('.tool-card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - r.left}px`);
  card.style.setProperty('--my', `${e.clientY - r.top}px`);
});
$('#toolsGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.tool-card');
  if (card) openTool(card.dataset.tool);
});

renderGrid();

/* ============================ MODAL SYSTEM ================================ */

const backdrop = $('#modalBackdrop');

function openModal(title, html) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  backdrop.hidden = true;
  document.body.style.overflow = '';
  $('#modalBody').innerHTML = '';
}
$('#modalClose').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !backdrop.hidden) closeModal(); });

function openTool(id) {
  const t = TOOLS.find((x) => x.id === id);
  openModal(`${t.icon} ${t.title}`, TOOL_UI[id].html);
  TOOL_UI[id].mount?.();
}

/* ======================= SHARED: DOWNLOADER UI ============================ */

const PLACEHOLDERS = {
  aio: 'Tempel link TikTok / IG / YouTube / FB / X di sini…',
  tiktok: 'https://www.tiktok.com/@user/video/1234567890',
  instagram: 'https://www.instagram.com/reel/AbCdEfGh/',
  youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  facebook: 'https://www.facebook.com/watch/?v=1234567890 atau fb.watch/xxx',
  twitter: 'https://x.com/user/status/1234567890',
};

function downloaderHtml(id) {
  const sample = {
    aio: 'Deteksi otomatis: TikTok, Instagram, YouTube, Facebook, X/Twitter, Threads, Reddit, Pinterest.',
    tiktok: 'Support video biasa & slideshow foto. Dapat link: HD, No-Watermark, dan MP3.',
    instagram: 'Support post, reel, carousel & story.',
    youtube: 'Dapat link MP4 & MP3 sekaligus + metadata video.',
    facebook: 'Support video publik, reels FB & link fb.watch.',
    twitter: 'Support video & GIF dari X/Twitter.',
  }[id];
  return `
    <div class="field">
      <label>🔗 URL ${CAT_LABEL.downloader}</label>
      <div class="input-row">
        <input class="input" id="dlUrl" placeholder="${PLACEHOLDERS[id]}" spellcheck="false" inputmode="url"/>
        <button class="btn btn-primary btn-sm" id="dlGo">⚡ Proses</button>
      </div>
    </div>
    <p style="font-size:.78rem;color:var(--muted)">${sample}</p>
    <div id="dlResult"></div>`;
}

function mediaIcon(type) {
  return type === 'video' ? '🎬' : type === 'audio' ? '🎵' : '🖼️';
}
function mediaLabel(m) {
  if (m.type === 'video') return 'Video';
  if (m.type === 'audio') return 'Audio (MP3)';
  return 'Gambar';
}

function renderDlResult(box, d) {
  const thumb = d.thumbnail
    ? `<img class="result-thumb" src="${esc(d.thumbnail)}" alt="thumbnail" referrerpolicy="no-referrer" onerror="this.style.display='none'"/>`
    : '';
  const stats = d.stats
    ? Object.entries(d.stats).filter(([, v]) => v).map(([k, v]) => `${k}: <b>${Number(v).toLocaleString('id-ID')}</b>`).join(' · ')
    : '';
  box.innerHTML = `
    <div class="result-box">
      <div class="result-media">
        ${thumb}
        <div class="result-meta">
          <h4>${esc(d.title || 'Media')}</h4>
          ${d.author ? `<p>👤 ${esc(d.author)}</p>` : ''}
          ${d.duration ? `<p>⏱️ Durasi: ${d.duration}s</p>` : ''}
          ${stats ? `<p>📊 ${stats}</p>` : ''}
          <p class="src">sumber: ${esc(d.source || '-')} · ${d.tookMs || d._ms || 0}ms</p>
        </div>
      </div>
      <div class="dl-list">
        ${(d.media || []).map((m, i) => `
          <a class="dl-item ${m.type}" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">
            <span class="dl-ico">${mediaIcon(m.type)}</span>
            <span class="dl-info">
              <span class="dl-type">${mediaLabel(m)} ${m.label ? '— ' + esc(m.label) : ''}</span><br/>
              <span class="dl-q">${esc(m.quality || 'original')}</span>
            </span>
            <span class="dl-arrow">⬇</span>
          </a>`).join('')}
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:12px">💡 Klik item untuk membuka file di tab baru, lalu simpan/download dari sana.</p>
    </div>`;
}

function mountDownloader(id, endpoint) {
  const target = endpoint || `/downloader/${id}`;
  const input = $('#dlUrl'), go = $('#dlGo'), box = $('#dlResult');
  const run = async () => {
    const url = input.value.trim();
    if (!url) return toast('Masukin URL dulu ya 🔗', 'error');
    box.innerHTML = `<div class="loader-wrap"><div class="loader"></div><p>Menghubungi server & mengambil data… jangan tutup halaman ⏳</p></div>`;
    go.disabled = true;
    try {
      const d = await api(target, { url });
      renderDlResult(box, d);
      vaultAdd({
        platform: d.platform || id,
        title: (d.title || 'Media').slice(0, 90),
        url: d.media?.[0]?.url || url,
      });
      toast('Media berhasil diambil! 🎉');
    } catch (e) {
      box.innerHTML = `<div class="result-box" style="border-color:rgba(248,113,113,.4)">
        <b style="color:var(--red)">❌ Gagal mengambil media</b>
        <p style="font-size:.83rem;color:var(--muted);margin-top:6px">${esc(e.message)}</p>
        <p style="font-size:.75rem;color:var(--muted);margin-top:8px">Coba periksa: link valid & publik (bukan private), atau coba lagi beberapa saat.</p>
      </div>`;
      toast('Gagal: ' + e.message, 'error');
    } finally {
      go.disabled = false;
    }
  };
  go.addEventListener('click', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  input.focus();
}

/* ========================= CANVAS HELPERS ================================= */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ========================= TOOL UI REGISTRY =============================== */

const TOOL_UI = {

  /* -------------------------- DOWNLOADER GROUP --------------------------- */
  aio:       { html: downloaderHtml('aio'),       mount: () => mountDownloader('aio') },
  tiktok:    { html: downloaderHtml('tiktok'),    mount: () => mountDownloader('tiktok') },
  instagram: { html: downloaderHtml('instagram'), mount: () => mountDownloader('instagram') },
  youtube:   { html: downloaderHtml('youtube'),   mount: () => mountDownloader('youtube') },
  facebook:  { html: downloaderHtml('facebook'),  mount: () => mountDownloader('facebook', '/downloader/aio') },
  twitter:   { html: downloaderHtml('twitter'),   mount: () => mountDownloader('twitter', '/downloader/aio') },

  /* ---------------------------- QR GENERATOR ---------------------------- */
  qrcode: {
    html: `
      <div class="field">
        <label>📝 Teks / Link untuk QR</label>
        <textarea class="textarea" id="qrText" rows="3" placeholder="https://contoh.com atau teks apa saja…"></textarea>
      </div>
      <div class="color-row">
        <label>Warna QR: <input type="color" id="qrDark" value="#0b0e1d"/></label>
        <label>Latar: <input type="color" id="qrLight" value="#ffffff"/></label>
        <label>Ukuran:
          <select class="input" id="qrSize" style="width:auto;padding:6px 12px">
            <option value="256">256px</option><option value="512" selected>512px</option><option value="1024">1024px</option>
          </select>
        </label>
      </div>
      <button class="btn btn-primary" id="qrGo">🔳 Generate QR</button>
      <div id="qrResult"></div>`,
    mount() {
      $('#qrGo').addEventListener('click', async () => {
        const text = $('#qrText').value.trim();
        if (!text) return toast('Isi teks/link dulu 📝', 'error');
        const box = $('#qrResult');
        box.innerHTML = `<div class="loader-wrap"><div class="loader"></div><p>Membuat QR…</p></div>`;
        try {
          const d = await api('/tools/qrcode', {
            text, size: +$('#qrSize').value,
            colorDark: $('#qrDark').value, colorLight: $('#qrLight').value,
          });
          box.innerHTML = `
            <div class="qr-preview"><img src="${d.dataUrl}" alt="QR Code"/></div>
            <button class="btn btn-ghost btn-sm" id="qrDl">💾 Download PNG</button>`;
          $('#qrDl').addEventListener('click', () => downloadDataUrl(d.dataUrl, 'kyy-qrcode.png'));
          toast('QR Code siap! 🔳');
        } catch (e) { box.innerHTML = ''; toast(e.message, 'error'); }
      });
    },
  },

  /* --------------------------- PASSWORD GEN ------------------------------ */
  password: {
    html: `
      <div class="range-row">
        <span style="font-size:.85rem;color:var(--muted)">Panjang</span>
        <input type="range" id="pwLen" min="4" max="64" value="16"/>
        <span class="range-val" id="pwLenVal">16</span>
      </div>
      <div class="switch-row">
        <label class="switch"><input type="checkbox" id="pwUpper" checked/> Huruf Besar (A-Z)</label>
        <label class="switch"><input type="checkbox" id="pwLower" checked/> Huruf Kecil (a-z)</label>
        <label class="switch"><input type="checkbox" id="pwNum" checked/> Angka (0-9)</label>
        <label class="switch"><input type="checkbox" id="pwSym" checked/> Simbol (!@#$)</label>
      </div>
      <button class="btn btn-primary" id="pwGo">🎲 Generate Password</button>
      <div id="pwResult"></div>`,
    mount() {
      $('#pwLen').addEventListener('input', (e) => ($('#pwLenVal').textContent = e.target.value));
      $('#pwGo').addEventListener('click', async () => {
        try {
          const d = await api('/tools/password', {
            length: +$('#pwLen').value,
            upper: $('#pwUpper').checked, lower: $('#pwLower').checked,
            numbers: $('#pwNum').checked, symbols: $('#pwSym').checked,
          });
          const colors = ['#f87171', '#f87171', '#fb923c', '#fbbf24', '#34d399', '#22d3ee'];
          const c = colors[d.score] || '#22d3ee';
          $('#pwResult').innerHTML = `
            <div class="result-box">
              <div class="copy-row">
                <input class="input" id="pwOut" value="${esc(d.password)}" readonly/>
                <button class="btn btn-ghost btn-sm" id="pwCopy">📋</button>
              </div>
              <div class="strength-bar"><div class="strength-fill" style="width:${d.score * 20}%;background:${c}"></div></div>
              <span class="strength-label" style="color:${c}">${esc(d.strength)}</span>
              <span style="font-size:.74rem;color:var(--muted)"> — entropi ±${d.entropy} bit</span>
            </div>`;
          $('#pwCopy').addEventListener('click', () => copyText(d.password));
        } catch (e) { toast(e.message, 'error'); }
      });
      $('#pwGo').click();
    },
  },

  /* ------------------------------ MORSE --------------------------------- */
  morse: {
    html: `
      <div class="seg" id="morseMode">
        <button class="active" data-mode="encode">Teks → Morse</button>
        <button data-mode="decode">Morse → Teks</button>
      </div>
      <div class="field">
        <label id="morseLabel">Masukkan teks biasa</label>
        <textarea class="textarea" id="morseIn" rows="3" placeholder="Halo dunia"></textarea>
      </div>
      <button class="btn btn-primary" id="morseGo">📡 Konversi</button>
      <div id="morseResult"></div>`,
    mount() {
      let mode = 'encode';
      $('#morseMode').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#morseMode button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        mode = b.dataset.mode;
        $('#morseLabel').textContent = mode === 'encode' ? 'Masukkan teks biasa' : 'Masukkan kode morse (pisahkan huruf dgn spasi, kata dgn " / ")';
        $('#morseIn').placeholder = mode === 'encode' ? 'Halo dunia' : '.... . .-.. .-.. --- / .-- --- .-. .-.. -..';
      });
      $('#morseGo').addEventListener('click', async () => {
        const text = $('#morseIn').value.trim();
        if (!text) return toast('Isi dulu ya 📡', 'error');
        try {
          const d = await api('/tools/morse', { text, mode });
          $('#morseResult').innerHTML = `
            <div class="result-box">
              <div class="mono-out">${esc(d.result)}</div>
              <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
                <button class="btn btn-ghost btn-sm" id="morseCopy">📋 Salin</button>
                ${mode === 'encode' ? '<button class="btn btn-primary btn-sm" id="morsePlay">🔊 Putar Audio</button>' : ''}
              </div>
            </div>`;
          $('#morseCopy').addEventListener('click', () => copyText(d.result));
          $('#morsePlay')?.addEventListener('click', () => playMorse(d.result));
        } catch (e) { toast(e.message, 'error'); }
      });

      function playMorse(code) {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = playMorse._ac || (playMorse._ac = new AC());
        const dot = 0.08, freq = 700;
        let t = ac.currentTime + 0.08;
        for (const ch of code) {
          let dur = 0;
          if (ch === '.') dur = dot;
          else if (ch === '-') dur = dot * 3;
          else if (ch === ' ') { t += dot * 2; continue; }
          else if (ch === '/') { t += dot * 5; continue; }
          if (dur) {
            const osc = ac.createOscillator(), g = ac.createGain();
            osc.frequency.value = freq; osc.type = 'sine';
            g.gain.setValueAtTime(0.16, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(g).connect(ac.destination);
            osc.start(t); osc.stop(t + dur);
            t += dur + dot;
          }
        }
        toast('🔊 Memutar morse…');
      }
    },
  },

  /* ------------------------------ BASE64 -------------------------------- */
  base64: {
    html: `
      <div class="seg" id="b64Mode">
        <button class="active" data-mode="encode">Encode</button>
        <button data-mode="decode">Decode</button>
      </div>
      <div class="field">
        <textarea class="textarea" id="b64In" rows="4" placeholder="Teks di sini…"></textarea>
      </div>
      <button class="btn btn-primary" id="b64Go">🔁 Proses</button>
      <div id="b64Result"></div>`,
    mount() {
      let mode = 'encode';
      $('#b64Mode').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#b64Mode button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); mode = b.dataset.mode;
      });
      $('#b64Go').addEventListener('click', async () => {
        const text = $('#b64In').value;
        if (!text.trim()) return toast('Isi teks dulu 🔁', 'error');
        try {
          const d = await api('/tools/base64', { text, mode });
          $('#b64Result').innerHTML = `
            <div class="result-box">
              <div class="mono-out">${esc(d.result)}</div>
              <button class="btn btn-ghost btn-sm" style="margin-top:12px" id="b64Copy">📋 Salin</button>
            </div>`;
          $('#b64Copy').addEventListener('click', () => copyText(d.result));
        } catch (e) { toast(e.message, 'error'); }
      });
    },
  },

  /* ---------------------------- CALCULATOR ------------------------------ */
  calc: {
    html: `
      <div class="calc-display"><span class="sub" id="calcSub">hasil akan tampil di sini</span><span id="calcExpr">0</span></div>
      <div class="calc-grid" id="calcGrid">
        <button class="calc-btn danger" data-k="C">C</button>
        <button class="calc-btn danger" data-k="B">⌫</button>
        <button class="calc-btn op" data-k="%">%</button>
        <button class="calc-btn op" data-k="/">÷</button>
        <button class="calc-btn" data-k="7">7</button>
        <button class="calc-btn" data-k="8">8</button>
        <button class="calc-btn" data-k="9">9</button>
        <button class="calc-btn op" data-k="*">×</button>
        <button class="calc-btn" data-k="4">4</button>
        <button class="calc-btn" data-k="5">5</button>
        <button class="calc-btn" data-k="6">6</button>
        <button class="calc-btn op" data-k="-">−</button>
        <button class="calc-btn" data-k="1">1</button>
        <button class="calc-btn" data-k="2">2</button>
        <button class="calc-btn" data-k="3">3</button>
        <button class="calc-btn op" data-k="+">+</button>
        <button class="calc-btn" data-k="(">(</button>
        <button class="calc-btn" data-k="0">0</button>
        <button class="calc-btn" data-k=")">)</button>
        <button class="calc-btn" data-k=".">.</button>
        <button class="calc-btn eq" data-k="=" style="grid-column:span 4">=</button>
      </div>`,
    mount() {
      let expr = '';
      const out = $('#calcExpr'), sub = $('#calcSub');
      const refresh = () => { out.textContent = expr || '0'; sub.textContent = 'hasil akan tampil di sini'; };
      const evaluate = async () => {
        if (!expr) return;
        try {
          const d = await api('/tools/calc', { expression: expr });
          sub.textContent = `${expr} =`;
          expr = String(d.result);
          out.textContent = expr;
        } catch (e) { sub.textContent = '⚠️ ' + e.message; }
      };
      $('#calcGrid').addEventListener('click', (e) => {
        const b = e.target.closest('.calc-btn'); if (!b) return;
        const k = b.dataset.k;
        if (k === 'C') expr = '';
        else if (k === 'B') expr = expr.slice(0, -1);
        else if (k === '=') return evaluate();
        else expr += k;
        refresh();
      });
      const keyHandler = (e) => {
        if (backdrop.hidden) return removeEventListener('keydown', keyHandler);
        if (/^[0-9+\-*/%().]$/.test(e.key)) { expr += e.key; refresh(); }
        else if (e.key === 'Enter') evaluate();
        else if (e.key === 'Backspace') { expr = expr.slice(0, -1); refresh(); }
      };
      addEventListener('keydown', keyHandler);
    },
  },

  /* --------------------------- WORD COUNTER ------------------------------ */
  wordcount: {
    html: `
      <div class="field">
        <label>📝 Tulis / tempel teks di sini</label>
        <textarea class="textarea" id="wcIn" rows="7" placeholder="Ketik sesuatu… statistik muncul otomatis!"></textarea>
      </div>
      <div class="wordstat-grid">
        <div class="wordstat"><b id="wcWords">0</b><span>Kata</span></div>
        <div class="wordstat"><b id="wcChars">0</b><span>Karakter</span></div>
        <div class="wordstat"><b id="wcNoSpace">0</b><span>Tanpa Spasi</span></div>
        <div class="wordstat"><b id="wcSent">0</b><span>Kalimat</span></div>
        <div class="wordstat"><b id="wcPara">0</b><span>Paragraf</span></div>
        <div class="wordstat"><b id="wcRead">0 mnt</b><span>Waktu Baca</span></div>
      </div>`,
    mount() {
      $('#wcIn').addEventListener('input', (e) => {
        const t = e.target.value;
        const words = t.trim() ? t.trim().split(/\s+/).length : 0;
        $('#wcWords').textContent = words;
        $('#wcChars').textContent = t.length;
        $('#wcNoSpace').textContent = t.replace(/\s/g, '').length;
        $('#wcSent').textContent = (t.match(/[.!?…]+(\s|$)/g) || []).length;
        $('#wcPara').textContent = t.trim() ? t.trim().split(/\n\s*\n/).length : 0;
        const sec = Math.ceil((words / 200) * 60);
        $('#wcRead').textContent = sec < 60 ? `${sec} dtk` : `${Math.ceil(sec / 60)} mnt`;
      });
    },
  },

  /* ---------------------------- FANCY TEXT ------------------------------- */
  fancytext: {
    html: `
      <div class="field">
        <label>✍️ Ketik teks biasa</label>
        <input class="input" id="fxIn" placeholder="contoh: rifkyy sensei" maxlength="60"/>
      </div>
      <div id="fxOut"><p style="text-align:center;color:var(--muted);padding:18px;font-size:.85rem">Ketik dulu di atas, nanti muncul banyak gaya di sini ✨</p></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">💡 Klik tombol 📋 buat nyalin, terus tempel di bio IG / WA / TikTok.</p>`,
    mount() {
      const makeSet = (A, a, d) => (s) =>
        [...s].map((ch) => {
          const c = ch.codePointAt(0);
          if (c >= 65 && c <= 90) return String.fromCodePoint(A + c - 65);
          if (c >= 97 && c <= 122) return String.fromCodePoint(a + c - 97);
          if (c >= 48 && c <= 57 && d) return String.fromCodePoint(d + c - 48);
          return ch;
        }).join('');
      const SMALL = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
      const FLIP = {
        a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ',
        k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
        u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
        A: '∀', B: '𐐒', C: 'Ɔ', D: '◖', E: 'Ǝ', F: 'Ⅎ', G: 'פ', H: 'H', I: 'I', J: 'ſ',
        K: 'K', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᴚ', S: 'S', T: '⊥',
        U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
        0: '0', 1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ㄣ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6',
        '.': '˙', ',': "'", "'": ',', '?': '¿', '!': '¡', '(': ')', ')': '(',
        '[': ']', ']': '[', '<': '>', '>': '<', '{': '}', '}': '{', '_': '‾', '&': '⅋',
      };
      const STYLES = [
        ['Sans Bold', makeSet(0x1D5D4, 0x1D5EE, 0x1D7EC)],
        ['Sans Italic', makeSet(0x1D608, 0x1D622)],
        ['Bold Italic', makeSet(0x1D63C, 0x1D656)],
        ['Monospace', makeSet(0x1D670, 0x1D68A, 0x1D7F6)],
        ['Script Bold', makeSet(0x1D4D0, 0x1D4EA)],
        ['Fraktur', makeSet(0x1D56C, 0x1D586)],
        ['Vaporwave', (s) => [...s].map((ch) => {
          const c = ch.codePointAt(0);
          if (c === 32) return '　';
          return c >= 33 && c <= 126 ? String.fromCodePoint(0xFF01 + c - 33) : ch;
        }).join('')],
        ['Small Caps', (s) => [...s.toLowerCase()].map((ch) => {
          const i = ch.charCodeAt(0) - 97;
          return i >= 0 && i < 26 ? SMALL[i] : ch;
        }).join('')],
        ['Strikethrough', (s) => [...s].map((ch) => ch + '̶').join('')],
        ['Underline', (s) => [...s].map((ch) => ch + '̲').join('')],
        ['Upside Down', (s) => [...s].reverse().map((ch) => FLIP[ch] ?? ch).join('')],
        ['Leet', (s) => s.replace(/a/gi, '4').replace(/e/gi, '3').replace(/i/gi, '1')
          .replace(/o/gi, '0').replace(/s/gi, '5').replace(/t/gi, '7').replace(/g/gi, '9')],
      ];

      $('#fxIn').addEventListener('input', (e) => {
        const text = e.target.value;
        if (!text.trim()) {
          $('#fxOut').innerHTML = '<p style="text-align:center;color:var(--muted);padding:18px;font-size:.85rem">Ketik dulu di atas, nanti muncul banyak gaya di sini ✨</p>';
          return;
        }
        $('#fxOut').innerHTML = STYLES.map(([name, fn], i) => {
          const val = fn(text);
          return `<div class="fancy-row">
            <div style="flex:1;min-width:0">
              <div class="fancy-name">${name}</div>
              <div class="fancy-text">${esc(val)}</div>
            </div>
            <button class="btn btn-ghost btn-sm fx-copy" data-v="${esc(val)}">📋</button>
          </div>`;
        }).join('');
      });
      $('#fxOut').addEventListener('click', (e) => {
        const b = e.target.closest('.fx-copy');
        if (b) copyText(b.dataset.v);
      });
      $('#fxIn').focus();
    },
  },

  /* ------------------------- WINDOWS QUOTES ------------------------------ */
  winquote: {
    html: `
      <div class="field"><label>🪟 Judul jendela</label>
        <input class="input" id="wqTitle" value="System Error" maxlength="40"/></div>
      <div class="field"><label>💬 Pesan / quote</label>
        <textarea class="textarea" id="wqMsg" rows="3" maxlength="220">Waktu terus berjalan, tapi kenapa aku masih di sini menunggu kamu…</textarea></div>
      <div class="input-row">
        <div class="field" style="flex:1"><label>🔘 Teks tombol</label>
          <input class="input" id="wqBtn" value="OK" maxlength="12"/></div>
        <div class="field" style="flex:1"><label>🎨 Tema</label>
          <select class="input" id="wqTheme">
            <option value="xp">Windows XP</option>
            <option value="neon">Neon Cyber</option>
          </select></div>
      </div>
      <div class="canvas-wrap"><canvas id="wqCanvas" width="760" height="430"></canvas></div>
      <button class="btn btn-primary" id="wqDl">💾 Download PNG</button>`,
    mount() {
      const cv = $('#wqCanvas'), ctx = cv.getContext('2d');
      const W = 760, H = 430;

      function draw() {
        const theme = $('#wqTheme').value;
        const title = $('#wqTitle').value || 'System Error';
        const msg = $('#wqMsg').value || '…';
        const btnTxt = $('#wqBtn').value || 'OK';

        // Desktop background
        if (theme === 'xp') {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, '#3a6ea5'); g.addColorStop(0.6, '#6fa5dc'); g.addColorStop(1, '#245edb');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          // bukit ala bliss
          ctx.fillStyle = 'rgba(60,160,70,0.55)';
          ctx.beginPath(); ctx.moveTo(0, H);
          ctx.quadraticCurveTo(W * 0.3, H - 130, W * 0.62, H - 40);
          ctx.quadraticCurveTo(W * 0.85, H - 110, W, H - 60); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(120,140,255,0.12)';
          for (let x = 0; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
          for (let y = 0; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
          const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 420);
          g.addColorStop(0, 'rgba(168,85,247,0.22)'); g.addColorStop(1, 'transparent');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }

        // Window
        const wx = 90, wy = 70, ww = W - 180, wh = H - 150;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
        roundRect(ctx, wx, wy, ww, wh, 12);
        ctx.fillStyle = theme === 'xp' ? '#ece9d8' : 'rgba(13,16,32,0.97)';
        ctx.fill();
        ctx.restore();

        // Title bar
        const tg = ctx.createLinearGradient(wx, wy, wx + ww, wy);
        if (theme === 'xp') { tg.addColorStop(0, '#0058e6'); tg.addColorStop(0.5, '#3a93ff'); tg.addColorStop(1, '#288eff'); }
        else { tg.addColorStop(0, '#a855f7'); tg.addColorStop(0.5, '#22d3ee'); tg.addColorStop(1, '#ec4899'); }
        roundRect(ctx, wx, wy, ww, 34, 12); ctx.fillStyle = tg; ctx.fill();
        ctx.fillStyle = theme === 'xp' ? '#ece9d8' : 'rgba(13,16,32,0.97)';
        ctx.fillRect(wx, wy + 24, ww, 10);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Tahoma, Poppins, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(title, wx + 13, wy + 18);
        // close btn
        roundRect(ctx, wx + ww - 30, wy + 6, 22, 22, 5);
        ctx.fillStyle = theme === 'xp' ? '#e81123' : 'rgba(0,0,0,0.4)'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(wx + ww - 24, wy + 12); ctx.lineTo(wx + ww - 14, wy + 22);
        ctx.moveTo(wx + ww - 14, wy + 12); ctx.lineTo(wx + ww - 24, wy + 22); ctx.stroke();

        // Error icon (lingkaran merah X)
        const icx = wx + 52, icy = wy + 95;
        ctx.beginPath(); ctx.arc(icx, icy, 26, 0, Math.PI * 2);
        ctx.fillStyle = theme === 'xp' ? '#e81123' : '#ec4899'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(icx - 10, icy - 10); ctx.lineTo(icx + 10, icy + 10);
        ctx.moveTo(icx + 10, icy - 10); ctx.lineTo(icx - 10, icy + 10); ctx.stroke();

        // Pesan
        ctx.fillStyle = theme === 'xp' ? '#111' : '#e8ecf8';
        ctx.font = '16px Tahoma, Poppins, sans-serif';
        const lines = wrapLines(ctx, msg, ww - 140);
        lines.slice(0, 7).forEach((l, i) => ctx.fillText(l, wx + 100, wy + 78 + i * 24));

        // Tombol OK
        const bw = 110, bh = 32, bx = wx + ww / 2 - bw / 2, by = wy + wh - 48;
        roundRect(ctx, bx, by, bw, bh, 8);
        if (theme === 'xp') { ctx.fillStyle = '#f0ede2'; ctx.fill(); ctx.strokeStyle = '#003c74'; ctx.lineWidth = 1.5; ctx.stroke(); }
        else { ctx.fillStyle = '#a855f7'; ctx.fill(); }
        ctx.fillStyle = theme === 'xp' ? '#111' : '#fff';
        ctx.font = 'bold 14px Tahoma, Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(btnTxt, bx + bw / 2, by + bh / 2 + 1);

        // Watermark
        ctx.textAlign = 'right'; ctx.fillStyle = theme === 'xp' ? 'rgba(255,255,255,0.75)' : 'rgba(232,236,248,0.4)';
        ctx.font = '11px Poppins, sans-serif';
        ctx.fillText('⚡ All Tools KYY', W - 14, H - 12);
      }

      ['wqTitle', 'wqMsg', 'wqBtn', 'wqTheme'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#wqDl').addEventListener('click', () => {
        downloadDataUrl(cv.toDataURL('image/png'), 'kyy-windows-quote.png');
        toast('Gambar tersimpan! 🪟');
      });
      draw();
    },
  },

  /* --------------------------- MEME GENERATOR ---------------------------- */
  meme: {
    html: `
      <div class="seg" id="mmSrc">
        <button class="active" data-s="tmpl">🔥 Template Viral</button>
        <button data-s="upload">📂 Upload Sendiri</button>
        <button data-s="color">🎨 Warna Polos</button>
      </div>
      <div id="mmTmplWrap">
        <input class="input" id="mmSearch" placeholder="🔍 Cari template… mis: drake, button, doge" autocomplete="off"/>
        <div class="tmpl-grid" id="mmGrid">
          <div class="loader-wrap" style="grid-column:1/-1"><div class="loader"></div><p>Narik 100+ template meme dari internet… 🔥</p></div>
        </div>
      </div>
      <div class="drop-zone" id="mmDrop" hidden>
        📂 Klik atau drag gambar ke sini
        <input type="file" id="mmFile" accept="image/*" hidden/>
      </div>
      <div class="chip-row" id="mmTemplates" hidden>
        <span class="chip" data-tpl="purple" style="border-color:#a855f7;color:#d8b4fe">🟪 Ungu</span>
        <span class="chip" data-tpl="cyan" style="border-color:#22d3ee;color:#a5f3fc">🟦 Cyan</span>
        <span class="chip" data-tpl="sunset" style="border-color:#ec4899;color:#fbcfe8">🟥 Sunset</span>
      </div>
      <div class="field"><label>🔝 Teks atas</label><input class="input" id="mmTop" placeholder="KETIKA NGODING JAM 3 PAGI" maxlength="80"/></div>
      <div class="field"><label>🔻 Teks bawah</label><input class="input" id="mmBottom" placeholder="TIBA-TIBA SEMUA JALAN" maxlength="80"/></div>
      <div class="range-row"><span style="font-size:.85rem;color:var(--muted)">Ukuran font</span>
        <input type="range" id="mmSize" min="20" max="90" value="48"/><span class="range-val" id="mmSizeVal">48</span></div>
      <p style="font-size:.74rem;color:var(--muted);margin:-4px 0 8px">💡 Tekan & <b>geser teksnya langsung di canvas</b> buat mindahin posisinya 👆</p>
      <div class="canvas-wrap"><canvas id="mmCanvas" width="700" height="700"></canvas></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" id="mmReset">↺ Reset posisi</button>
        <button class="btn btn-primary" id="mmDl" style="flex:1">💾 Download PNG</button>
      </div>`,
    mount() {
      const cv = $('#mmCanvas'), ctx = cv.getContext('2d');
      let img = null;
      let allMemes = [];
      const TPL = {
        purple: ['#2e1065', '#a855f7', '#22d3ee'],
        cyan: ['#083344', '#22d3ee', '#a855f7'],
        sunset: ['#500724', '#ec4899', '#f59e0b'],
      };
      let tpl = TPL.purple;

      function fitCanvas() {
        if (img && img.naturalWidth) {
          const max = 900;
          const scale = Math.min(1, max / img.naturalWidth, max / img.naturalHeight);
          cv.width = Math.round(img.naturalWidth * scale);
          cv.height = Math.round(img.naturalHeight * scale);
        } else { cv.width = 700; cv.height = 700; }
      }

      const pos = { top: { x: 0.5, y: 0.1 }, bottom: { x: 0.5, y: 0.9 } };

      function drawTextBlock(text, p) {
        if (!text) return;
        const W = cv.width, H = cv.height;
        let size = +$('#mmSize').value;
        ctx.font = `900 ${size}px Impact,'Arial Black',sans-serif`;
        let lines = wrapLines(ctx, text, W - 48);
        while (lines.length * size * 1.15 > H * 0.65 && size > 16) {
          size -= 2;
          ctx.font = `900 ${size}px Impact,'Arial Black',sans-serif`;
          lines = wrapLines(ctx, text, W - 48);
        }
        ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.textBaseline = 'middle';
        ctx.strokeStyle = '#000'; ctx.lineWidth = size / 6.5; ctx.fillStyle = '#fff';
        const lh = size * 1.15;
        lines.forEach((l, i) => {
          const y = p.y * H + (i - (lines.length - 1) / 2) * lh;
          ctx.strokeText(l, p.x * W, y);
          ctx.fillText(l, p.x * W, y);
        });
      }

      function draw() {
        const W = cv.width, H = cv.height;
        ctx.clearRect(0, 0, W, H);
        if (img && img.naturalWidth) {
          ctx.drawImage(img, 0, 0, W, H);
        } else {
          const g = ctx.createLinearGradient(0, 0, W, H);
          g.addColorStop(0, tpl[0]); g.addColorStop(0.55, tpl[1]); g.addColorStop(1, tpl[2]);
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.font = '700 90px Poppins, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('MEME', W / 2, H / 2);
        }
        drawTextBlock($('#mmTop').value.toUpperCase(), pos.top);
        drawTextBlock($('#mmBottom').value.toUpperCase(), pos.bottom);
      }

      /* --- geser teks pake jari / mouse --- */
      cv.style.touchAction = 'none';
      cv.style.cursor = 'grab';
      let dragKey = null;
      const toCv = (e) => {
        const r = cv.getBoundingClientRect();
        return { x: ((e.clientX - r.left) * cv.width) / r.width, y: ((e.clientY - r.top) * cv.height) / r.height };
      };
      cv.addEventListener('pointerdown', (e) => {
        const t = toCv(e);
        const cands = [];
        if ($('#mmTop').value.trim()) cands.push('top');
        if ($('#mmBottom').value.trim()) cands.push('bottom');
        if (!cands.length) return;
        cands.sort((a, b) =>
          Math.hypot(t.x - pos[a].x * cv.width, t.y - pos[a].y * cv.height) -
          Math.hypot(t.x - pos[b].x * cv.width, t.y - pos[b].y * cv.height));
        const k = cands[0];
        const d = Math.hypot(t.x - pos[k].x * cv.width, t.y - pos[k].y * cv.height);
        if (d < cv.width * 0.28) {
          dragKey = k; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
          e.preventDefault();
        }
      });
      cv.addEventListener('pointermove', (e) => {
        if (!dragKey) return;
        const t = toCv(e);
        pos[dragKey].x = Math.min(0.96, Math.max(0.04, t.x / cv.width));
        pos[dragKey].y = Math.min(0.98, Math.max(0.02, t.y / cv.height));
        draw();
      });
      const stopDrag = () => { dragKey = null; cv.style.cursor = 'grab'; };
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => cv.addEventListener(ev, stopDrag));
      $('#mmReset').addEventListener('click', () => {
        pos.top = { x: 0.5, y: 0.1 }; pos.bottom = { x: 0.5, y: 0.9 };
        draw(); toast('Posisi teks di-reset ↺');
      });

      /* --- switching sumber gambar --- */
      const wraps = { tmpl: $('#mmTmplWrap'), upload: $('#mmDrop'), color: $('#mmTemplates') };
      $('#mmSrc').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#mmSrc button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        Object.entries(wraps).forEach(([k, el]) => (el.hidden = k !== b.dataset.s));
      });

      /* --- galeri template viral --- */
      function renderTiles(q = '') {
        const list = allMemes.filter((m) => m.name.toLowerCase().includes(q));
        $('#mmGrid').innerHTML = list.length
          ? list.map((m) => `
              <div class="tmpl-item" data-id="${m.id}" title="${esc(m.name)}">
                <img loading="lazy" crossorigin="anonymous" src="${m.url}" alt="${esc(m.name)}"/>
                <span class="tmpl-name">${esc(m.name)}</span>
              </div>`).join('')
          : `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:24px">Ga nemu template "${esc(q)}" 😅</p>`;
      }
      async function loadTemplates() {
        try {
          const d = await api('/memes');
          allMemes = d.memes;
          renderTiles();
          toast(`${d.count} template meme siap dipake 🔥`);
        } catch (e) {
          $('#mmGrid').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px">
            <p style="color:var(--red)">Gagal narik template 😢</p>
            <button class="btn btn-ghost btn-sm" style="margin-top:10px" id="mmRetry">🔄 Coba lagi</button></div>`;
          $('#mmRetry')?.addEventListener('click', () => {
            $('#mmGrid').innerHTML = `<div class="loader-wrap" style="grid-column:1/-1"><div class="loader"></div><p>Nyoba lagi…</p></div>`;
            loadTemplates();
          });
        }
      }
      $('#mmGrid').addEventListener('click', (e) => {
        const t = e.target.closest('.tmpl-item'); if (!t) return;
        $$('.tmpl-item').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        const m = allMemes.find((x) => x.id === t.dataset.id);
        if (!m) return;
        const im = new Image();
        im.crossOrigin = 'anonymous'; // i.imgflip.com kirim ACAO:* -> canvas aman
        im.onload = () => { img = im; fitCanvas(); draw(); toast(`Template "${m.name}" dipasang ✅`); };
        im.onerror = () => toast('Template gagal dimuat, coba yang lain', 'error');
        im.src = m.url;
      });
      $('#mmSearch').addEventListener('input', (e) => renderTiles(e.target.value.toLowerCase().trim()));
      loadTemplates();

      /* --- upload sendiri --- */
      const dz = $('#mmDrop'), file = $('#mmFile');
      dz.addEventListener('click', () => file.click());
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) loadImg(e.dataTransfer.files[0]); });
      file.addEventListener('change', () => file.files[0] && loadImg(file.files[0]));

      function loadImg(f) {
        if (!f.type.startsWith('image/')) return toast('File harus gambar 🖼️', 'error');
        const url = URL.createObjectURL(f);
        const im = new Image();
        im.onload = () => { img = im; fitCanvas(); draw(); toast('Gambar dimuat! Tinggal kasih teks ✍️'); };
        im.src = url;
      }

      /* --- warna polos --- */
      $('#mmTemplates').addEventListener('click', (e) => {
        const c = e.target.closest('.chip'); if (!c) return;
        img = null; tpl = TPL[c.dataset.tpl]; fitCanvas(); draw();
      });

      ['mmTop', 'mmBottom'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#mmSize').addEventListener('input', (e) => { $('#mmSizeVal').textContent = e.target.value; draw(); });
      $('#mmDl').addEventListener('click', () => { downloadDataUrl(cv.toDataURL('image/png'), 'kyy-meme.png'); toast('Meme tersimpan! 🖼️'); });
      draw();
    },
  },

  /* ----------------------------- QUOTE CARD ------------------------------ */
  quotecard: {
    html: `
      <div class="field"><label>✨ Quote</label>
        <textarea class="textarea" id="qcText" rows="3" maxlength="260">Jangan menunggu sempurna untuk memulai. Mulailah, lalu jadilah sempurna.</textarea></div>
      <div class="field"><label>✍️ Nama / penulis</label>
        <input class="input" id="qcAuthor" value="Rifkyy sensei" maxlength="40"/></div>
      <div class="field"><label>🎨 Tema gradien</label>
        <div class="swatch-row" id="qcSwatches">
          <div class="swatch active" data-t="0" style="background:linear-gradient(135deg,#a855f7,#22d3ee,#ec4899)"></div>
          <div class="swatch" data-t="1" style="background:linear-gradient(135deg,#0ea5e9,#22d3ee,#34d399)"></div>
          <div class="swatch" data-t="2" style="background:linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)"></div>
          <div class="swatch" data-t="3" style="background:linear-gradient(135deg,#1e293b,#a855f7,#0b0e1d)"></div>
          <div class="swatch" data-t="4" style="background:linear-gradient(135deg,#ec4899,#fb7185,#fbbf24)"></div>
        </div>
      </div>
      <div class="canvas-wrap"><canvas id="qcCanvas" width="800" height="800"></canvas></div>
      <button class="btn btn-primary" id="qcDl">💾 Download PNG</button>`,
    mount() {
      const cv = $('#qcCanvas'), ctx = cv.getContext('2d');
      const THEMES = [
        ['#a855f7', '#22d3ee', '#ec4899'],
        ['#0ea5e9', '#22d3ee', '#34d399'],
        ['#f59e0b', '#ec4899', '#8b5cf6'],
        ['#1e293b', '#7c3aed', '#05060f'],
        ['#ec4899', '#fb7185', '#fbbf24'],
      ];
      let theme = 0;
      const S = cv.width;

      function draw() {
        const [c1, c2, c3] = THEMES[theme];
        // bg
        ctx.fillStyle = '#0b0e1d'; ctx.fillRect(0, 0, S, S);
        const g = ctx.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c3);
        ctx.globalAlpha = 0.9; ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1;
        // overlay gelap agar teks terbaca
        const ov = ctx.createRadialGradient(S / 2, S / 2, 60, S / 2, S / 2, S * 0.75);
        ov.addColorStop(0, 'rgba(5,6,15,0.55)'); ov.addColorStop(1, 'rgba(5,6,15,0.82)');
        ctx.fillStyle = ov; ctx.fillRect(0, 0, S, S);
        // lingkaran dekor
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(S * 0.85, S * 0.14, 90, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(S * 0.12, S * 0.88, 120, 0, Math.PI * 2); ctx.stroke();
        // frame
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
        roundRect(ctx, 36, 36, S - 72, S - 72, 22); ctx.stroke();

        // tanda kutip besar
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '900 150px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('“', S / 2, 220);

        // teks quote
        const text = $('#qcText').value || '…';
        ctx.font = '600 40px Poppins, sans-serif';
        const lines = wrapLines(ctx, text, S - 190);
        let fontSize = 40;
        while (lines.length * (fontSize * 1.5) > 330 && fontSize > 22) {
          fontSize -= 2; ctx.font = `600 ${fontSize}px Poppins, sans-serif`;
          lines.length = 0; lines.push(...wrapLines(ctx, text, S - 190));
        }
        const startY = S / 2 - ((lines.length - 1) * fontSize * 1.5) / 2 + 40;
        ctx.fillStyle = '#fff';
        lines.forEach((l, i) => ctx.fillText(l, S / 2, startY + i * fontSize * 1.5));

        // penulis
        const author = $('#qcAuthor').value;
        if (author) {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = '700 26px Poppins, sans-serif';
          ctx.fillText('— ' + author, S / 2, S - 150);
          ctx.fillStyle = c2; roundRect(ctx, S / 2 - 60, S - 122, 120, 5, 3); ctx.fill();
        }
        // watermark
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 20px Poppins, sans-serif';
        ctx.fillText('⚡ ALL TOOLS KYY', S / 2, S - 66);
      }

      ['qcText', 'qcAuthor'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#qcSwatches').addEventListener('click', (e) => {
        const s = e.target.closest('.swatch'); if (!s) return;
        $$('#qcSwatches .swatch').forEach((x) => x.classList.remove('active'));
        s.classList.add('active'); theme = +s.dataset.t; draw();
      });
      $('#qcDl').addEventListener('click', () => { downloadDataUrl(cv.toDataURL('image/png'), 'kyy-quotecard.png'); toast('Quote card tersimpan! ✨'); });
      draw();
    },
  },

  /* ----------------------------- FAKE CHAT WA ----------------------------- */
  fakechat: {
    html: `
      <div class="input-row">
        <div class="field" style="flex:1.6"><label>👤 Nama kontak</label>
          <input class="input" id="fcName" value="Doi 💕" maxlength="22"/></div>
        <div class="field" style="flex:1"><label>🕐 Status</label>
          <input class="input" id="fcStatus" value="online" maxlength="20"/></div>
      </div>
      <div class="field"><label>💬 Isi chat (per baris: <b>k:</b> si kontak / <b>a:</b> aku)</label>
        <textarea class="textarea" id="fcMsgs" rows="6" spellcheck="false">k: lagi apa?
a: lagi nyoba tools baru, keren parah
k: mana-mana? buktiin dong
k: 😒
a: nih, tinggal download langsung jadi meme
k: GILA BERFUNGSI BENERAN 😭🔥</textarea></div>
      <div class="canvas-wrap"><canvas id="fcCanvas" width="640" height="600"></canvas></div>
      <button class="btn btn-primary" id="fcDl">💾 Download PNG</button>`,
    mount() {
      const cv = $('#fcCanvas'), ctx = cv.getContext('2d');
      const W = 640, FONT = '15px "Segoe UI", Poppins, Arial, sans-serif';
      const now = () => new Date().toTimeString().slice(0, 5);

      function parseMsgs() {
        const out = [];
        let side = 'k';
        for (const raw of $('#fcMsgs').value.split('\n')) {
          const s = raw.trim();
          if (!s) continue;
          if (/^[kK][:：]/.test(s)) { side = 'k'; out.push({ side, text: s.slice(2).trim() || '…' }); }
          else if (/^[aA][:：]/.test(s)) { side = 'a'; out.push({ side, text: s.slice(2).trim() || '…' }); }
          else out.push({ side, text: s });
        }
        return out.slice(0, 40);
      }

      function draw() {
        const msgs = parseMsgs();
        ctx.font = FONT;
        const items = [];
        let y = 64;
        items.push({ chip: true, y }); y += 40;
        for (const m of msgs) {
          const maxW = 390;
          const lines = wrapLines(ctx, m.text, maxW);
          const tw = Math.min(maxW, Math.max(24, ...lines.map((l) => ctx.measureText(l).width)));
          const me = m.side === 'a';
          const needTime = me ? 64 : 46;
          const w = Math.max(tw + 26, tw + needTime + 20) + 6;
          const h = lines.length * 20 + 26;
          items.push({ ...m, lines, w, h, y });
          y += h + 9;
        }
        const H = Math.max(380, y + 16);
        if (cv.height !== H) cv.height = H;

        ctx.fillStyle = '#0b141a'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.028)';
        for (let i = 0; i < 70; i++) {
          ctx.beginPath();
          ctx.arc((i * 173) % W, (i * 211) % H, (i % 3) + 1.2, 0, 7);
          ctx.fill();
        }
        ctx.fillStyle = '#1f2c34'; ctx.fillRect(0, 0, W, 54);
        ctx.fillStyle = '#e9edef'; ctx.font = '22px Poppins'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('‹', 8, 29);
        const name = ($('#fcName').value || 'Kontak').trim() || 'Kontak';
        const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        ctx.beginPath(); ctx.arc(46, 27, 18, 0, 7);
        ctx.fillStyle = `hsl(${hue} 45% 42%)`; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Poppins'; ctx.textAlign = 'center';
        ctx.fillText(name.charAt(0).toUpperCase(), 46, 28);
        ctx.textAlign = 'left'; ctx.fillStyle = '#e9edef'; ctx.font = 'bold 15px Poppins';
        ctx.fillText(name.slice(0, 20), 74, 20);
        ctx.fillStyle = '#8696a0'; ctx.font = '11.5px Poppins';
        ctx.fillText(($('#fcStatus').value || 'online').slice(0, 24), 74, 38);
        ctx.font = '14px Poppins'; ctx.textAlign = 'right';
        ctx.fillText('📹  📞  ⋮', W - 12, 29);

        for (const it of items) {
          if (it.chip) {
            ctx.font = '11px Poppins';
            const cw = ctx.measureText('Hari Ini').width + 26;
            roundRect(ctx, W / 2 - cw / 2, it.y, cw, 22, 10);
            ctx.fillStyle = '#182229'; ctx.fill();
            ctx.fillStyle = '#8696a0'; ctx.textAlign = 'center';
            ctx.fillText('Hari Ini', W / 2, it.y + 12);
            continue;
          }
          const me = it.side === 'a';
          const x = me ? W - 10 - it.w : 10;
          const col = me ? '#005c4b' : '#1f2c34';
          ctx.fillStyle = col;
          ctx.beginPath();
          if (me) { ctx.moveTo(x + it.w, it.y + 2); ctx.lineTo(x + it.w + 9, it.y - 2); ctx.lineTo(x + it.w - 2, it.y + 16); }
          else { ctx.moveTo(x, it.y + 2); ctx.lineTo(x - 9, it.y - 2); ctx.lineTo(x + 2, it.y + 16); }
          ctx.closePath(); ctx.fill();
          roundRect(ctx, x, it.y, it.w, it.h, 9); ctx.fill();
          ctx.font = FONT; ctx.fillStyle = '#e9edef'; ctx.textAlign = 'left';
          it.lines.forEach((l, i) => ctx.fillText(l, x + 13, it.y + 18 + i * 20));
          ctx.font = '10px Poppins'; ctx.textAlign = 'right';
          ctx.fillStyle = me ? '#8fe0bd' : '#8696a0';
          ctx.fillText(now() + (me ? ' ✓✓' : ''), x + it.w - 9, it.y + it.h - 10);
        }
      }

      ['fcName', 'fcStatus', 'fcMsgs'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#fcDl').addEventListener('click', () => { downloadDataUrl(cv.toDataURL('image/png'), 'kyy-fakechat.png'); toast('Fake chat tersimpan! 💬'); });
      draw();
    },
  },

  /* ---------------------------- STALK TIKTOK ----------------------------- */
  stalktt: {
    html: `
      <div class="field"><label>🕵️ Username TikTok (tanpa @)</label>
        <div class="input-row">
          <input class="input" id="stIn" placeholder="contoh: khaby.lame" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="stGo">🔎 Stalk</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-u="khaby.lame">khaby.lame</span>
        <span class="chip" data-u="mrbeast">mrbeast</span>
        <span class="chip" data-u="tiktok">tiktok</span>
      </div>
      <p style="font-size:.72rem;color:var(--muted)">Cuma bisa liat akun publik ya, akun private ya ga bisa (etika dong 😌)</p>
      <div id="stResult"></div>`,
    mount() {
      const run = async (u) => {
        if (!u) return toast('Isi username dulu 🕵️', 'error');
        $('#stResult').innerHTML = LOADER_HTML;
        try {
          const d = await api('/stalk/tiktok', { username: u });
          const v = d.user, s = d.stats;
          $('#stResult').innerHTML = `
            <div class="result-box">
              <div class="result-media">
                <img class="result-thumb" style="border-radius:50%" src="${esc(v.avatar || '')}" referrerpolicy="no-referrer" onerror="this.style.display='none'"/>
                <div class="result-meta">
                  <h4>${esc(v.nickname)} ${v.verified ? '<span style="color:var(--cyan)">✔️</span>' : ''}</h4>
                  <p>@${esc(v.username)}${v.region ? ' · 🌍 ' + esc(v.region) : ''}</p>
                  <p style="color:var(--muted);margin-top:4px">${esc(v.bio || '(ga ada bio)')}</p>
                </div>
              </div>
              <div class="wordstat-grid" style="margin-top:14px">
                <div class="wordstat"><b>${shortNum(s.followers)}</b><span>Followers</span></div>
                <div class="wordstat"><b>${shortNum(s.following)}</b><span>Following</span></div>
                <div class="wordstat"><b>${shortNum(s.likes)}</b><span>Likes</span></div>
                <div class="wordstat"><b>${shortNum(s.videos)}</b><span>Video</span></div>
                <div class="wordstat"><b>${shortNum(s.digg)}</b><span>Digg</span></div>
                <div class="wordstat"><b>${s.videos ? shortNum(Math.round(s.followers / s.videos)) : '0'}</b><span>Fans/Video</span></div>
              </div>
            </div>`;
          toast('Ketemu! Datamu aman kok 😌');
        } catch (e) {
          $('#stResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#stGo').addEventListener('click', () => run($('#stIn').value.trim()));
      $('#stIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#stIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#stIn').value = c.dataset.u; run(c.dataset.u); }));
    },
  },

  /* ------------------------------- CEK IP -------------------------------- */
  ipgeo: {
    html: `
      <div class="field"><label>🌐 Alamat IP (IPv4 / IPv6)</label>
        <div class="input-row">
          <input class="input" id="ipIn" placeholder="contoh: 8.8.8.8" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="ipGo">🔎 Lacak</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-ip="8.8.8.8">8.8.8.8 (Google)</span>
        <span class="chip" data-ip="1.1.1.1">1.1.1.1 (Cloudflare)</span>
        <span class="chip" data-ip="139.130.4.5">139.130.4.5 (AU)</span>
      </div>
      <div id="ipResult"></div>`,
    mount() {
      const run = async (ip) => {
        if (!ip) return toast('Isi IP dulu 🌐', 'error');
        $('#ipResult').innerHTML = LOADER_HTML;
        try {
          const d = await api('/tools/ipgeo', { ip });
          $('#ipResult').innerHTML = `
            <div class="result-box">
              <div class="wordstat-grid" style="margin-top:0">
                <div class="wordstat"><b>${flagEmoji((d.countryCode || '').toUpperCase())}</b><span>${esc(d.country || '?')}</span></div>
                <div class="wordstat"><b>${esc(d.city || '-')}</b><span>Kota</span></div>
                <div class="wordstat"><b>${esc(d.region || '-')}</b><span>Region</span></div>
                <div class="wordstat"><b style="font-size:.82rem;line-height:1.3">${esc(d.isp || '-')}</b><span>ISP</span></div>
                <div class="wordstat"><b style="font-size:.82rem">${esc(d.timezone || '-')}</b><span>Zona Waktu</span></div>
                <div class="wordstat"><b style="font-size:.82rem">${esc(d.ip)}</b><span>src: ${esc(d.geoSource || '-')}</span></div>
              </div>
            </div>`;
        } catch (e) { $('#ipResult').innerHTML = errBox(e.message); toast(e.message, 'error'); }
      };
      $('#ipGo').addEventListener('click', () => run($('#ipIn').value.trim()));
      $('#ipIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#ipIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#ipIn').value = c.dataset.ip; run(c.dataset.ip); }));
    },
  },

  /* --------------------------- TEXT TO SPEECH ---------------------------- */
  tts: {
    html: `
      <div class="field"><label>🗣️ Teks yang mau dibacain</label>
        <textarea class="textarea" id="ttIn" rows="3" maxlength="400">Halo! Selamat datang di All Tools KYY. Web apaan nih? Keren banget coy!</textarea></div>
      <div class="field"><label>🔊 Pilih suara</label>
        <select class="input" id="ttVoice"><option>Loading suara…</option></select></div>
      <div class="range-row"><span style="font-size:.85rem;color:var(--muted)">Cepat</span>
        <input type="range" id="ttRate" min="0.5" max="2" step="0.1" value="1"/><span class="range-val" id="ttRateV">1.0</span></div>
      <div class="range-row"><span style="font-size:.85rem;color:var(--muted)">Nada</span>
        <input type="range" id="ttPitch" min="0.5" max="2" step="0.1" value="1"/><span class="range-val" id="ttPitchV">1.0</span></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="ttPlay">▶️ Bacain</button>
        <button class="btn btn-ghost" id="ttStop">⏹️ Stop</button>
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Suara ikut browser/HP masing-masing — ada yang natural, ada yang robot 😅</p>`,
    mount() {
      const synth = window.speechSynthesis;
      if (!synth) { $('#ttPlay').disabled = true; return toast('Browser kamu ga support TTS 😢', 'error'); }
      let voices = [];
      function loadVoices() {
        voices = synth.getVoices();
        if (!voices.length) return;
        const sorted = [...voices].sort((a, b) => (b.lang.startsWith('id') ? 1 : 0) - (a.lang.startsWith('id') ? 1 : 0) || a.name.localeCompare(b.name));
        $('#ttVoice').innerHTML = sorted.map((v) => `<option value="${voices.indexOf(v)}" ${v.lang.startsWith('id') ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('');
      }
      loadVoices();
      synth.onvoiceschanged = loadVoices;
      $('#ttRate').addEventListener('input', (e) => ($('#ttRateV').textContent = (+e.target.value).toFixed(1)));
      $('#ttPitch').addEventListener('input', (e) => ($('#ttPitchV').textContent = (+e.target.value).toFixed(1)));
      $('#ttPlay').addEventListener('click', () => {
        const text = $('#ttIn').value.trim();
        if (!text) return toast('Isi teks dulu 🗣️', 'error');
        const u = new SpeechSynthesisUtterance(text);
        if (voices[+$('#ttVoice').value]) u.voice = voices[+$('#ttVoice').value];
        u.rate = +$('#ttRate').value; u.pitch = +$('#ttPitch').value;
        synth.cancel(); synth.speak(u);
        toast('🔊 Denduin!');
      });
      $('#ttStop').addEventListener('click', () => synth.cancel());
    },
  },

  /* ---------------------------- RANDOM PICKER ---------------------------- */
  picker: {
    html: `
      <div class="field"><label>🎲 Daftar nama / opsi (satu per baris)</label>
        <textarea class="textarea" id="pkIn" rows="7" spellcheck="false">Nasi Padang
Nasi Goreng
Mie Ayam
Bakso Mercon
Sate Madura
Gacoan Lv 4</textarea></div>
      <div class="pick-display" id="pkOut">❓</div>
      <button class="btn btn-primary" id="pkGo" style="width:100%">🎰 Putar Nasib!</button>`,
    mount() {
      let busy = false;
      $('#pkGo').addEventListener('click', () => {
        if (busy) return;
        const list = $('#pkIn').value.split('\n').map((s) => s.trim()).filter(Boolean);
        if (list.length < 2) return toast('Isi minimal 2 baris dulu 🎲', 'error');
        busy = true; $('#pkGo').disabled = true;
        const out = $('#pkOut');
        out.classList.remove('win');
        const iv = setInterval(() => { out.textContent = list[(Math.random() * list.length) | 0]; }, 65);
        setTimeout(() => {
          clearInterval(iv);
          const winner = list[(Math.random() * list.length) | 0];
          out.textContent = '🎉 ' + winner;
          out.classList.add('win');
          toast(`Pemenangnya: ${winner} 🏆`);
          busy = false; $('#pkGo').disabled = false;
        }, 2000 + Math.random() * 1200);
      });
    },
  },

  /* ---------------------------- UNIT CONVERTER --------------------------- */
  units: {
    html: `
      <div class="seg" id="unCat">
        <button class="active" data-c="length">📏 Panjang</button>
        <button data-c="weight">⚖️ Berat</button>
        <button data-c="temp">🌡️ Suhu</button>
        <button data-c="data">💾 Data</button>
      </div>
      <div class="input-row">
        <div class="field" style="flex:1"><label>Nilai</label><input class="input" id="unVal" type="number" value="1" step="any"/></div>
        <div class="field" style="flex:1"><label>Dari</label><select class="input" id="unFrom"></select></div>
        <div class="field" style="flex:1"><label>Ke</label><select class="input" id="unTo"></select></div>
      </div>
      <div class="mono-out" id="unOut" style="text-align:center;font-size:1.05rem">—</div>`,
    mount() {
      const DEF = {
        length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, def: ['m', 'km'] },
        weight: { mg: 1e-6, g: 0.001, kg: 1, kuintal: 100, ton: 1000, oz: 0.0283495231, lb: 0.45359237, def: ['kg', 'lb'] },
        data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776, def: ['MB', 'GB'] },
        temp: { C: '°C', F: '°F', K: 'K', def: ['C', 'F'] },
      };
      let cat = 'length';
      const toC = (v, f) => (f === 'C' ? v : f === 'F' ? (v - 32) / 1.8 : v - 273.15);
      const fromC = (v, t) => (t === 'C' ? v : t === 'F' ? v * 1.8 + 32 : v + 273.15);
      function rebuild() {
        const keys = Object.keys(DEF[cat]).filter((k) => k !== 'def');
        $('#unFrom').innerHTML = keys.map((k) => `<option ${k === DEF[cat].def[0] ? 'selected' : ''}>${k}</option>`).join('');
        $('#unTo').innerHTML = keys.map((k) => `<option ${k === DEF[cat].def[1] ? 'selected' : ''}>${k}</option>`).join('');
        calc();
      }
      function calc() {
        const v = parseFloat($('#unVal').value);
        const f = $('#unFrom').value, t = $('#unTo').value;
        if (!f || !t) return;
        if (Number.isNaN(v)) { $('#unOut').textContent = '—'; return; }
        const out = cat === 'temp' ? fromC(toC(v, f), t) : (v * DEF[cat][f]) / DEF[cat][t];
        const r = Math.abs(out) !== 0 && (Math.abs(out) < 1e-4 || Math.abs(out) >= 1e10)
          ? out.toPrecision(6) : Math.round(out * 1e6) / 1e6;
        $('#unOut').innerHTML = `${esc(String(v))} ${f} &nbsp;=&nbsp; <span class="grad-text" style="font-weight:800">${esc(String(r))} ${t}</span>`;
      }
      $('#unCat').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#unCat button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); cat = b.dataset.c; rebuild();
      });
      $('#unVal').addEventListener('input', calc);
      ['unFrom', 'unTo'].forEach((id) => $('#' + id).addEventListener('change', calc));
      rebuild();
    },
  },

  /* ---------------------------- WEB SCREENSHOT --------------------------- */
  webshot: {
    html: `
      <div class="field"><label>📸 URL website</label>
        <div class="input-row">
          <input class="input" id="wsIn" placeholder="https://contoh.com" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="wsGo">Jepret</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-u="https://google.com">google.com</span>
        <span class="chip" data-u="https://github.com">github.com</span>
        <span class="chip" data-u="https://wikipedia.org">wikipedia.org</span>
      </div>
      <p style="font-size:.74rem;color:var(--muted)">Dijepret pake layanan thum.io — web berat bisa 5–15 detik, sabar 📸</p>
      <div id="wsResult"></div>`,
    mount() {
      const run = (url) => {
        if (!looksUrl(url)) return toast('URL ga valid, harus ada https:// nya 🌐', 'error');
        const shot = `https://image.thum.io/get/width/800/crop/1100/${url}`;
        $('#wsResult').innerHTML = `<div class="loader-wrap"><div class="loader"></div><p>Lagi jepret website… 📸</p></div>`;
        const im = new Image();
        im.onload = () => {
          $('#wsResult').innerHTML = `
            <div class="qr-preview"><img src="${shot}" style="max-width:100%;width:100%" alt="screenshot"/></div>
            <a class="btn btn-ghost btn-sm" href="${shot}" target="_blank" rel="noopener noreferrer">🔍 Buka ukuran penuh ↗</a>`;
          toast('Kelar! 📸');
        };
        im.onerror = () => {
          $('#wsResult').innerHTML = errBox('Gagal jepret — webnya mungkin ngambek/nolak, coba yang lain.');
        };
        im.src = shot;
      };
      $('#wsGo').addEventListener('click', () => run($('#wsIn').value.trim()));
      $('#wsIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#wsIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#wsIn').value = c.dataset.u; run(c.dataset.u); }));
    },
  },

  /* ------------------------- IQC (iMessage fake) ------------------------- */
  // Port 1:1 plugins/canvas/iqc.js bot WA (BG 941x1672 + emoji reaksi + foto mode)
  iqc: {
    html: `
      <div class="field"><label>🎨 Tema</label>
        <div class="seg" id="iqTheme"><button class="active" data-t="dark">🌙 Gelap</button><button data-t="pink">🌸 Pink</button></div></div>
      <div class="field"><label>🖼️ Mode</label>
        <div class="seg" id="iqMode"><button class="active" data-m="text">💬 Teks</button><button data-m="foto">🖼️ Foto</button></div></div>
      <div id="iqTextArea">
        <div class="field"><label>💬 Isi chat <span style="opacity:.6">(buat meme dialog WA/iOS, bisa emoji)</span></label>
          <textarea class="input" id="iqText" rows="3" maxlength="400" spellcheck="false">kamu keren banget sih, aku aja ga bisa bikin brat gojo kayak gitu 😭🔥</textarea></div>
      </div>
      <div id="iqFotoArea" style="display:none">
        <div class="field"><label>🖼️ Foto di bubble <span style="opacity:.6">(foto kamu / meme)</span></label>
          <input type="file" id="iqFoto" accept="image/png,image/jpeg,image/webp" class="file-input"/></div>
        <div class="field"><label>💬 Caption <span style="opacity:.6">(opsional)</span></label>
          <input class="input" id="iqCaption" maxlength="200" placeholder="caption fotonya…"/></div>
      </div>
      <div class="input-row">
        <div class="field" style="flex:1"><label>🕐 Jam iPhone</label>
          <input class="input" id="iqTime" maxlength="5"/></div>
        <div class="field" style="flex:1"><label>🌀 Pill reaksi</label>
          <div class="seg" id="iqPill"><button class="active" data-p="on">ON</button><button data-p="off">OFF</button></div></div>
      </div>
      <div class="field" id="iqEmojiRow"><label>😂 Emoji pill <span style="opacity:.6">(pisah spasi, maks 6)</span></label>
        <input class="input" id="iqEmojis" maxlength="60" value="👍 ❤️ 😂 😮 😢 🙏" spellcheck="false"/></div>
      <div class="brat-stage" style="margin-top:6px">
        <canvas class="brat-canvas" id="iqCanvas" style="max-height:520px;object-fit:contain;width:100%"></canvas>
        <div class="brat-loading" id="iqLoad" style="display:none"><div class="loader"></div><span>render…</span></div>
      </div>
      <button class="btn btn-primary" id="iqDl" style="width:100%">💾 Simpan PNG (HD 941×1672)</button>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Template asli di-port 1:1 dari plugin iqc bot WA kamu sendiri — jadi hasilnya beneran kayak iPhone beneran 📸</p>`,
    mount() {
      let theme = 'dark', mode = 'text', pillOn = true, foto = null;
      const cv = $('#iqCanvas'), ld = $('#iqLoad');
      const bgCache = {};
      const loadImg = (src) => (bgCache[src] ||= new Promise((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bg gagal dimuat')); i.src = src;
      }));
      const interReady = (document.fonts
        ? Promise.all([document.fonts.load('30px "Inter"'), document.fonts.load('22px "Inter"'), document.fonts.load('27px "Inter"')]).catch(() => {})
        : Promise.resolve());

      $('#iqTime').value = (() => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'); })();
      $('#iqTheme').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#iqTheme button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); theme = b.dataset.t; draw(); });
      $('#iqMode').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return; $$('#iqMode button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); mode = b.dataset.m;
        $('#iqTextArea').style.display = mode === 'text' ? '' : 'none';
        $('#iqFotoArea').style.display = mode === 'foto' ? '' : 'none';
        draw();
      });
      $('#iqPill').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#iqPill button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); pillOn = b.dataset.p === 'on'; $('#iqEmojiRow').style.display = pillOn ? '' : 'none'; draw(); });
      $('#iqFoto').addEventListener('change', () => {
        const f = $('#iqFoto').files[0];
        if (!f) { foto = null; draw(); return; }
        const r = new FileReader();
        r.onload = () => { const i = new Image(); i.onload = () => { foto = i; draw(); }; i.src = r.result; };
        r.readAsDataURL(f);
      });
      ['iqText', 'iqTime', 'iqCaption', 'iqEmojis'].forEach((id) => { let t; $('#' + id).addEventListener('input', () => { clearTimeout(t); t = setTimeout(draw, 180); }); });

      function wrapText(ctx, text, maxW, fontSize) {
        ctx.font = `${fontSize}px "Inter", Poppins, Arial, sans-serif`;
        const lines = [];
        for (const para of String(text).replace(/\r/g, '').split('\n')) {
          const words = para.split(/\s+/).filter(Boolean);
          if (!words.length) { lines.push(''); continue; }
          let cur = '';
          for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
            if (cur) { lines.push(cur); cur = ''; }
            if (ctx.measureText(w).width <= maxW) { cur = w; } else { lines.push(w); cur = ''; }
          }
          if (cur) lines.push(cur);
        }
        return lines;
      }

      function bubblePath(ctx, x, y, w, h, rad) {
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.lineTo(x + w - rad, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
        ctx.lineTo(x + w, y + h - rad);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
        ctx.lineTo(x + rad, y + h);
        ctx.quadraticCurveTo(x + 8, y + h, x + 8, y + h - 8);
        ctx.lineTo(x + 8, y + rad);
        ctx.quadraticCurveTo(x + 8, y, x + rad, y);
        ctx.closePath();
      }
      function tailPath(ctx, x, y, h) {
        ctx.beginPath();
        ctx.moveTo(x + 12, y + h - 20);
        ctx.quadraticCurveTo(x - 2, y + h - 4, x - 8, y + h);
        ctx.quadraticCurveTo(x + 6, y + h, x + 22, y + h - 2);
        ctx.closePath();
      }
      function pillCard(ctx, x, y, emojis) {
        const emojiSize = Math.round(54 * 1.03);
        const cardH = emojiSize + Math.round(44 * 1.03);
        const cardW = Math.round(530 * 1.03);
        const cardY = y - cardH - 18;
        ctx.fillStyle = '#1c1c1e';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x + 8, cardY, cardW, cardH, [cardH / 2]);
        else { bubblePath(ctx, x + 8, cardY, cardW, cardH, cardH / 2); }
        ctx.fill();
        const startX = x + 8 + 55, spacingX = 76, emojiCY = cardY + cardH / 2 + 2;
        const list = emojis.slice(0, 6);
        list.forEach((em, i) => {
          ctx.font = `${emojiSize / 1.6}px Poppins, Arial, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(em, startX + i * spacingX, emojiCY);
        });
        ctx.fillStyle = '#8e8e93';
        ctx.font = `${Math.round(36 * 1.03)}px "Inter", Poppins, Arial, sans-serif`;
        ctx.fillText('+', startX + 6 * spacingX - 8, cardY + cardH / 2 - 2);
      }

      async function draw() {
        ld.style.display = 'flex';
        try {
          await interReady;
          const W = 941, H = 1672;
          cv.width = W; cv.height = H;
          const ctx = cv.getContext('2d');
          const bg = await loadImg(theme === 'pink' ? 'img/iqc-pink.jpg' : 'img/iqc-dark.jpg');
          // cover-draw (bg pink 906x1736 beda rasio — jangan distort!)
          const nat = bg.naturalWidth / bg.naturalHeight, tar = W / H;
          let dw, dh, dx = 0, dy = 0;
          if (nat > tar) { dh = H; dw = H * nat; dx = -(dw - W) / 2; }
          else { dw = W; dh = W / nat; dy = -(dh - H) / 2; }
          ctx.drawImage(bg, dx, dy, dw, dh);

          const timeStr = ($('#iqTime').value || '21.33').replace(':', '.');
          ctx.fillStyle = '#ffffff';
          ctx.font = '27px "Inter", Poppins, Arial, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText(timeStr, 463, 8);

          const chatFont = 30, maxW = 530, minBubW = 280, lh = chatFont + 14;
          const padX = 30, padY = 20, rad = 28, fixedX = 35, baseY = 946;
          ctx.font = '22px "Inter", Poppins, Arial, sans-serif';
          const timeW = ctx.measureText(timeStr).width;
          let finalY, bubbleH, bubW;
          const emojis = ($('#iqEmojis').value || '👍 ❤️ 😂 😮 😢 🙏').split(/\s+/).filter(Boolean).slice(0, 6);

          if (mode === 'text' || !foto) {
            const txt = $('#iqText').value.trim() || 'halo ges';
            ctx.font = `${chatFont}px "Inter", Poppins, Arial, sans-serif`;
            const lines = wrapText(ctx, txt, maxW, chatFont);
            let longest = 0;
            for (const l of lines) longest = Math.max(longest, ctx.measureText(l.trim()).width);
            bubW = Math.max(longest + padX * 2, timeW + 75, 180);
            const spaceTimeY = 12;
            bubbleH = lines.length * lh + padY + spaceTimeY + 22;
            finalY = baseY - bubbleH;
            ctx.fillStyle = '#1c1c1e';
            bubblePath(ctx, fixedX, finalY, bubW, bubbleH, rad); ctx.fill();
            tailPath(ctx, fixedX, finalY, bubbleH); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `${chatFont}px "Inter", Poppins, Arial, sans-serif`;
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            lines.forEach((l, i) => {
              ctx.fillText(l.trim(), fixedX + padX, finalY + padY + i * lh + chatFont / 2);
            });
            ctx.fillStyle = '#727278';
            ctx.font = '22px "Inter", Poppins, Arial, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(timeStr, fixedX + bubW - 22, finalY + bubbleH - 38);
          } else {
            const imgAspect = foto.naturalWidth / foto.naturalHeight;
            bubW = Math.min(Math.max(foto.naturalWidth, minBubW), maxW);
            const imgH = Math.round(bubW / imgAspect);
            bubW = Math.max(bubW, timeW + 75);
            const caption = $('#iqCaption').value.trim();
            let capLines = [];
            if (caption) { ctx.font = `${chatFont}px "Inter", Poppins, Arial, sans-serif`; capLines = wrapText(ctx, caption, bubW - padX * 2, chatFont); }
            const capH = capLines.length ? padY + capLines.length * lh : 0;
            const timeRowH = 28;
            bubbleH = imgH + capH + timeRowH + (capLines.length ? 4 : 0);
            finalY = baseY - bubbleH;
            ctx.fillStyle = '#1c1c1e';
            bubblePath(ctx, fixedX, finalY, bubW, bubbleH, rad); ctx.fill();
            tailPath(ctx, fixedX, finalY, bubbleH); ctx.fill();
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(fixedX + rad, finalY);
            ctx.lineTo(fixedX + bubW - rad, finalY);
            ctx.quadraticCurveTo(fixedX + bubW, finalY, fixedX + bubW, finalY + rad);
            ctx.lineTo(fixedX + bubW, finalY + imgH);
            ctx.lineTo(fixedX + 8, finalY + imgH);
            ctx.lineTo(fixedX + 8, finalY + rad);
            ctx.quadraticCurveTo(fixedX + 8, finalY, fixedX + rad, finalY);
            ctx.closePath(); ctx.clip();
            ctx.drawImage(foto, fixedX, finalY, bubW, imgH);
            ctx.restore();
            if (capLines.length) {
              ctx.fillStyle = '#ffffff';
              ctx.font = `${chatFont}px "Inter", Poppins, Arial, sans-serif`;
              ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
              capLines.forEach((l, i) => {
                ctx.fillText(l.trim(), fixedX + padX, finalY + imgH + padY + i * lh + chatFont / 2);
              });
            }
            ctx.fillStyle = '#727278';
            ctx.font = '22px "Inter", Poppins, Arial, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(timeStr, fixedX + bubW - 22, finalY + bubbleH - timeRowH);
          }

          if (pillOn && emojis.length) pillCard(ctx, fixedX, finalY, emojis);
        } catch (e) { toast(e.message, 'error'); }
        ld.style.display = 'none';
      }

      $('#iqDl').addEventListener('click', () => {
        downloadDataUrl(cv.toDataURL('image/png'), `kyy-iqc-${theme}.png`);
        toast('IQC tersimpan! HD maksimal katanya 📱✨');
      });
      draw();
    },
  },


  /* ------------------------------ NULIS ---------------------------------- */
  nulis: {
    html: `
      <div class="field"><label>📝 Teks yang mau ditulis</label>
        <textarea class="textarea" id="nlIn" rows="7" maxlength="1200" spellcheck="false">Hari ini aku belajar bikin web pake scraper bot WhatsApp. Ternyata seru juga, besok lanjut lagi ya 😤</textarea></div>
      <div class="input-row">
        <div class="field" style="flex:1"><label>🖊️ Tinta</label>
          <select class="input" id="nlInk">
            <option value="#1a3b8f">Biru</option><option value="#171717">Hitam</option><option value="#b03030">Merah</option><option value="#0f6f4a">Hijau</option>
          </select></div>
        <div class="field" style="flex:1"><label>↕️ Spasi</label>
          <select class="input" id="nlGap">
            <option value="34">Rapat</option><option value="42" selected>Normal</option><option value="50">Longgar</option>
          </select></div>
      </div>
      <div class="canvas-wrap"><canvas id="nlCanvas" width="720" height="900"></canvas></div>
      <button class="btn btn-primary" id="nlDl">💾 Download PNG</button>`,
    mount() {
      const cv = $('#nlCanvas'), ctx = cv.getContext('2d');
      const W = 720;
      function draw() {
        const gap = +$('#nlGap').value, ink = $('#nlInk').value;
        ctx.font = '700 26px Caveat, "Comic Sans MS", "Segoe Script", cursive';
        const paras = $('#nlIn').value.split('\n');
        const lines = [];
        for (const p of paras) {
          if (!p.trim()) { lines.push(''); continue; }
          lines.push(...wrapLines(ctx, p, W - 150));
        }
        const topPad = 100, headerH = 40;
        const H = Math.max(420, topPad + headerH + (lines.length + 2) * gap + 40);
        if (cv.height !== H) cv.height = H;
        ctx.fillStyle = '#fdfcf3'; ctx.fillRect(0, 0, W, cv.height);
        ctx.fillStyle = 'rgba(120,90,40,0.06)'; ctx.fillRect(0, 0, 9, cv.height); ctx.fillRect(W - 9, 0, 9, cv.height);
        ctx.strokeStyle = 'rgba(230,90,90,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(76, 0); ctx.lineTo(76, cv.height); ctx.stroke();
        ctx.font = '700 23px Caveat, cursive'; ctx.fillStyle = ink;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Nama : ______________________', 92, 56);
        ctx.fillText('Tgl : ____________', W - 290, 56);
        for (let i = 0; i < lines.length + 6; i++) {
          const ly = topPad + headerH + i * gap;
          ctx.strokeStyle = 'rgba(120,160,220,0.45)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
        }
        ctx.font = '700 26px Caveat, "Comic Sans MS", cursive';
        lines.forEach((ln, i) => {
          if (!ln) return;
          const by = topPad + headerH + i * gap - 8;
          let x = 92;
          for (const ch of ln) {
            const rot = Math.sin(x * 12.9898 + i * 78.233) * 0.02;
            ctx.save();
            ctx.translate(x, by + Math.cos(x * 5.5 + i) * 0.7);
            ctx.rotate(rot);
            ctx.fillStyle = ink;
            ctx.fillText(ch, 0, 0);
            ctx.restore();
            x += ctx.measureText(ch).width + 0.35;
          }
        });
      }
      ['nlIn', 'nlInk', 'nlGap'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#nlDl').addEventListener('click', () => { downloadDataUrl(cv.toDataURL('image/png'), 'kyy-nulis.png'); toast('Nulis tersimpan! 📝'); });
      draw();
    },
  },

  /* ----------------------------- CODESNAP -------------------------------- */
  codesnap: {
    html: `
      <div class="input-row">
        <div class="field" style="flex:1.3"><label>📄 Nama file</label>
          <input class="input" id="csName" value="downloader.js" maxlength="32"/></div>
        <div class="field" style="flex:1"><label>🌈 Tema</label>
          <select class="input" id="csTheme">
            <option value="neon">Neon Night</option><option value="github">GitHub Dark</option><option value="mono">Mono</option>
          </select></div>
      </div>
      <div class="field"><label>💻 Kode kamu</label>
        <textarea class="textarea" id="csCode" rows="8" spellcheck="false" style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.85rem">// scraper.js — All Tools KYY
const axios = require('axios');

async function tiktok(url) {
  const { data } = await axios.post('https://www.tikwm.com/api/', null, {
    params: { url, hd: 1 },
  });
  return data?.data; // no watermark 😎
}

module.exports = { tiktok };</textarea></div>
      <div class="canvas-wrap"><canvas id="csCanvas" width="820" height="500"></canvas></div>
      <button class="btn btn-primary" id="csDl">💾 Download PNG</button>`,
    mount() {
      const cv = $('#csCanvas'), ctx = cv.getContext('2d');
      const THEMES = {
        neon:   { bg1: '#1a1040', bg2: '#062a38', win: '#0b0e1d', head: '#171c36', tx: '#dbe4ff', num: '#3d4470', kw: '#c792ea', str: '#98e6a8', com: '#565f8c', nb: '#7cd9f7' },
        github: { bg1: '#24292f', bg2: '#0d1117', win: '#0d1117', head: '#161b22', tx: '#e6edf3', num: '#6e7681', kw: '#ff7b72', str: '#7ee787', com: '#8b949e', nb: '#79c0ff' },
        mono:   { bg1: '#252525', bg2: '#101010', win: '#141414', head: '#1f1f1f', tx: '#ededed', num: '#666666', kw: '#ffffff', str: '#cfcfcf', com: '#7d7d7d', nb: '#e0e0e0' },
      };
      const KW = new Set('const let var function return if else elif for while do switch case default break continue class extends super import from export async await new try catch finally throw typeof instanceof in of not null undefined none None True False true false this self def print lambda and or is as with pass echo void int def var val fun func fn pub mod use package fn def'.split(/\s+/));
      function tokenize(line) {
        const out = [];
        const re = /(\/\/.*|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([\s\S])/g;
        let m;
        while ((m = re.exec(line))) {
          if (m[1]) out.push(['com', m[1]]);
          else if (m[2]) out.push(['str', m[2]]);
          else if (m[3]) out.push(['nb', m[3]]);
          else if (m[4]) out.push([KW.has(m[4]) ? 'kw' : 'tx', m[4]]);
          else out.push(['tx', m[5]]);
        }
        return out;
      }
      function draw() {
        const t = THEMES[$('#csTheme').value] || THEMES.neon;
        const lines = $('#csCode').value.replace(/\t/g, '  ').split('\n').slice(0, 60);
        ctx.font = '13px "JetBrains Mono", ui-monospace, Menlo, monospace';
        const numW = 46, pad = 22, headH = 38;
        let maxW = 0;
        const toks = lines.map((l) => tokenize(l));
        for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
        const winW = Math.max(480, Math.min(1300, maxW + numW + pad * 2 + 8));
        const winH = headH + lines.length * 20 + 18;
        const W = winW + 72, H = winH + 72;
        if (cv.width !== W) cv.width = W;
        if (cv.height !== H) cv.height = H;
        const g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, t.bg1); g.addColorStop(1, t.bg2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 12;
        roundRect(ctx, 36, 36, winW, winH, 13);
        ctx.fillStyle = t.win; ctx.fill();
        ctx.restore();
        roundRect(ctx, 36, 36, winW, headH, 13); ctx.fillStyle = t.head; ctx.fill();
        ctx.fillStyle = t.win; ctx.fillRect(36, 36 + headH - 12, winW, 12);
        [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => {
          ctx.beginPath(); ctx.arc(56 + i * 20, 36 + headH / 2, 6, 0, 7);
          ctx.fillStyle = c; ctx.fill();
        });
        ctx.fillStyle = t.num; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(($('#csName').value || 'file.js').slice(0, 26), 36 + winW / 2, 36 + headH / 2 + 4);
        ctx.textBaseline = 'middle'; ctx.font = '13px "JetBrains Mono", ui-monospace, monospace';
        toks.forEach((tk, i) => {
          const y = 36 + headH + 16 + i * 20;
          ctx.fillStyle = t.num; ctx.textAlign = 'right';
          ctx.fillText(String(i + 1), 36 + numW - 10, y);
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath(); ctx.moveTo(36 + numW, 36 + headH); ctx.lineTo(36 + numW, 36 + winH); ctx.stroke();
          let x = 36 + numW + pad - 6;
          ctx.textAlign = 'left';
          for (const [type, str] of tk) {
            ctx.fillStyle = t[type === 'tx' ? 'tx' : type];
            ctx.fillText(str, x, y);
            x += ctx.measureText(str).width;
          }
        });
      }
      ['csName', 'csTheme', 'csCode'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#csDl').addEventListener('click', () => { downloadDataUrl(cv.toDataURL('image/png'), 'kyy-codesnap.png'); toast('Code snap tersimpan! 💻'); });
      draw();
    },
  },

  /* --------------------------- MUSIC CARD 2.0 ---------------------------- */
  musiccard: {
    html: `
      <div class="mc2-grid">
        <div class="input-row">
          <div class="field" style="flex:1"><label>🎵 Judul lagu</label>
            <input class="input" id="mcTitle" value="Kangen (Lo-Fi Ver.)" maxlength="44"/></div>
          <div class="field" style="flex:1"><label>🎤 Artis</label>
            <input class="input" id="mcArtist" value="Rifkyy sensei" maxlength="40"/></div>
        </div>
        <div class="input-row">
          <div class="field" style="flex:1"><label>💿 Album</label>
            <input class="input" id="mcAlbum" value="Single Gabut 2026" maxlength="44"/></div>
          <div class="field" style="width:110px;flex:none"><label>⏱️ Durasi</label>
            <input class="input" id="mcDur" value="3:42" maxlength="5"/></div>
        </div>
        <div class="field"><label>🖼️ Foto Cover (kosongin = cover otomatis)</label>
          <div class="mc2-cover-row">
            <div class="mc2-prev" id="mcPrev">🎧</div>
            <button class="btn btn-ghost btn-sm" id="mcPick">📁 Pilih Foto Cover</button>
            <button class="btn btn-ghost btn-sm" id="mcClear" hidden>🗑️</button>
            <input type="file" id="mcFile" accept="image/*" hidden />
          </div>
        </div>
        <div class="field"><label>🎚️ Progress</label>
          <div class="sl-row">
            <input type="range" id="mcProg" min="0" max="100" value="37"/><b id="mcProgV">37%</b>
          </div>
        </div>
        <div class="field"><label>🎨 Aksen</label>
          <div class="swatch-row" id="mcSw">
            <div class="swatch active" data-c="#22d3ee" style="background:#22d3ee"></div>
            <div class="swatch" data-c="#a855f7" style="background:#a855f7"></div>
            <div class="swatch" data-c="#ec4899" style="background:#ec4899"></div>
            <div class="swatch" data-c="#34d399" style="background:#34d399"></div>
            <div class="swatch" data-c="#f59e0b" style="background:#f59e0b"></div>
          </div>
        </div>
        <div class="mc2-stage"><canvas id="mcCanvas" width="1080" height="1080"></canvas></div>
        <button class="btn btn-primary w-full" id="mcDl">💾 Download PNG</button>
      </div>`,
    mount() {
      const cv = $('#mcCanvas'), ctx = cv.getContext('2d');
      const W = 1080, H = 1080;
      let accent = '#22d3ee', coverImg = null, coverUrl = null;
      const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      const parseDur = (v) => {
        const m = String(v || '').match(/^(\d{1,2}):([0-5]?\d)$/);
        return m ? (+m[1]) * 60 + (+m[2]) : 222;
      };
      // blur bohongan tapi meyakinkan: gambar kecil -> dibesarin = auto blur
      const fakeBlurBg = () => {
        const t = document.createElement('canvas');
        t.width = 56; t.height = 56;
        const tc = t.getContext('2d');
        const s = Math.max(56 / coverImg.width, 56 / coverImg.height);
        tc.drawImage(coverImg, (56 - coverImg.width * s) / 2, (56 - coverImg.height * s) / 2, coverImg.width * s, coverImg.height * s);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(t, 0, 0, W, H);
      };
      const fitCover = (dx, dy, size, r) => {
        ctx.save();
        roundRect(ctx, dx, dy, size, size, r);
        ctx.clip();
        if (coverImg) {
          const s = Math.max(size / coverImg.width, size / coverImg.height);
          ctx.drawImage(coverImg, dx + (size - coverImg.width * s) / 2, dy + (size - coverImg.height * s) / 2, coverImg.width * s, coverImg.height * s);
        } else {
          const cg = ctx.createLinearGradient(dx, dy, dx + size, dy + size);
          cg.addColorStop(0, accent); cg.addColorStop(1, '#12141f');
          ctx.fillStyle = cg; ctx.fillRect(dx, dy, size, size);
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '230px Poppins'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🎧', dx + size / 2, dy + size / 2 + 10);
        }
        ctx.restore();
      };
      function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.textBaseline = 'alphabetic';
        // --- background: cover blur / aurora ---
        if (coverImg) {
          fakeBlurBg();
          ctx.fillStyle = 'rgba(6,8,18,.68)'; ctx.fillRect(0, 0, W, H);
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, '#141722'); g.addColorStop(1, '#090a12');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        // glow aksen di sekitar cover
        const glow = ctx.createRadialGradient(W / 2, 380, 60, W / 2, 380, 560);
        glow.addColorStop(0, accent + '3d'); glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
        // --- cover ---
        const cs = 520, cx = (W - cs) / 2, cy = 96;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
        roundRect(ctx, cx, cy, cs, cs, 36); ctx.fillStyle = '#12141f'; ctx.fill();
        ctx.restore();
        fitCover(cx, cy, cs, 36);
        // bingkai tipis aksen
        roundRect(ctx, cx + 2, cy + 2, cs - 4, cs - 4, 34);
        ctx.strokeStyle = accent + '55'; ctx.lineWidth = 2; ctx.stroke();
        // --- teks (auto ngecilin font kalo kepanjangan) ---
        const title = ($('#mcTitle').value || 'Lagu').trim();
        ctx.textAlign = 'center';
        let f = 58;
        ctx.font = `700 ${f}px Poppins`;
        while (f > 36 && ctx.measureText(title).width > 900) { f -= 3; ctx.font = `700 ${f}px Poppins`; }
        ctx.fillStyle = '#fff';
        ctx.fillText(title.slice(0, 48), W / 2, 742);
        const artist = ($('#mcArtist').value || 'Artis').slice(0, 40);
        f = 34; ctx.font = `500 ${f}px Poppins`;
        while (f > 24 && ctx.measureText(artist).width > 760) { f -= 2; ctx.font = `500 ${f}px Poppins`; }
        ctx.fillStyle = 'rgba(255,255,255,.72)';
        ctx.fillText(artist, W / 2, 796);
        const album = ($('#mcAlbum').value || '').slice(0, 44);
        ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.font = '400 25px Poppins';
        ctx.fillText(album, W / 2, 834);
        // --- progress ---
        const total = parseDur($('#mcDur').value), pct = +$('#mcProg').value / 100;
        const bx = 140, bw = 800, by = 892;
        roundRect(ctx, bx, by, bw, 9, 5); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fill();
        roundRect(ctx, bx, by, Math.max(9, bw * pct), 9, 5); ctx.fillStyle = accent; ctx.fill();
        ctx.beginPath(); ctx.arc(bx + bw * pct, by + 4.5, 15, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(bx + bw * pct, by + 4.5, 7, 0, 7); ctx.fillStyle = accent; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '500 22px "JetBrains Mono", monospace';
        ctx.textAlign = 'left'; ctx.fillText(fmt(total * pct), bx, by + 46);
        ctx.textAlign = 'right'; ctx.fillText('-' + fmt(total * (1 - pct)), bx + bw, by + 46);
        // --- kontrol ---
        const yy = 1004;
        ctx.textAlign = 'center';
        ctx.fillStyle = accent; ctx.font = '30px Poppins'; ctx.globalAlpha = .75;
        ctx.fillText('🔀', bx + 16, yy + 10); ctx.fillText('🔁', bx + bw - 16, yy + 10);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '44px Poppins';
        ctx.fillText('⏮', bx + 250, yy + 13); ctx.fillText('⏭', bx + bw - 250, yy + 13);
        ctx.beginPath(); ctx.arc(W / 2, yy, 52, 0, 7); ctx.fillStyle = accent; ctx.fill();
        ctx.fillStyle = '#0b0c14'; ctx.font = '52px Poppins';
        ctx.fillText('⏸', W / 2, yy + 18);
      }
      ['mcTitle', 'mcArtist', 'mcAlbum', 'mcDur'].forEach((id) => $('#' + id).addEventListener('input', draw));
      $('#mcProg').addEventListener('input', (e) => { $('#mcProgV').textContent = e.target.value + '%'; draw(); });
      $('#mcSw').addEventListener('click', (e) => {
        const s = e.target.closest('.swatch'); if (!s) return;
        $$('#mcSw .swatch').forEach((x) => x.classList.remove('active'));
        s.classList.add('active'); accent = s.dataset.c; draw();
      });
      // --- foto cover ---
      $('#mcPick').addEventListener('click', () => $('#mcFile').click());
      $('#mcClear').addEventListener('click', () => {
        coverImg = null; if (coverUrl) URL.revokeObjectURL(coverUrl); coverUrl = null;
        $('#mcPrev').innerHTML = '🎧'; $('#mcClear').hidden = true; draw();
      });
      $('#mcFile').addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) return toast('Itu bukan gambar 😭', 'error');
        if (coverUrl) URL.revokeObjectURL(coverUrl);
        coverUrl = URL.createObjectURL(f);
        const im = new Image();
        im.onload = () => {
          coverImg = im;
          $('#mcPrev').innerHTML = `<img src="${coverUrl}" alt="cover" />`;
          $('#mcClear').hidden = false;
          draw();
          toast('Cover kepake! 🖼️');
        };
        im.onerror = () => toast('Gambarnya ga kebaca 😭', 'error');
        im.src = coverUrl;
      });
      $('#mcDl').addEventListener('click', () => { downloadDataUrl(cv.toDataURL('image/png'), 'kyy-musiccard.png'); toast('Music card tersimpan! 🎧'); });
      draw();
    },
  },

  /* ---------------------------- TANYA USTADZ ----------------------------- */
  ustadz: {
    html: `
      <div class="field"><label>🕌 Pertanyaan buat pak ustadz</label>
        <div class="input-row">
          <input class="input" id="uzIn" placeholder="contoh: kenapa aku ganteng" maxlength="100"/>
          <button class="btn btn-primary btn-sm" id="uzGo">Tanya</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-q="kenapa aku ganteng">kenapa aku ganteng</span>
        <span class="chip" data-q="bolehkah ngoding sambil rebahan">ngoding sambil rebahan?</span>
        <span class="chip" data-q="apakah itu sunnah rasul">itu sunnah rasul?</span>
      </div>
      <div id="uzResult"></div>`,
    mount() {
      const run = async (q) => {
        if (!q) return toast('Isi pertanyaan dulu 🕌', 'error');
        $('#uzResult').innerHTML = `<div class="loader-wrap"><div class="loader"></div><p>Pak ustadz lagi jawab…</p></div>`;
        try {
          const d = await api('/tools/ustadz', { text: q });
          $('#uzResult').innerHTML = `
            <div class="qr-preview"><img src="${esc(d.image)}" style="max-width:100%" alt="tanya ustadz" onerror="this.parentElement.innerHTML='<p style=color:var(--red)>Gambar gagal dimuat 😢</p>'"/></div>
            <a class="btn btn-ghost btn-sm" href="${esc(d.image)}" target="_blank" rel="noopener noreferrer">💾 Simpan gambar ↗</a>`;
        } catch (e) { $('#uzResult').innerHTML = errBox(e.message); toast(e.message, 'error'); }
      };
      $('#uzGo').addEventListener('click', () => run($('#uzIn').value.trim()));
      $('#uzIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#uzIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#uzIn').value = c.dataset.q; run(c.dataset.q); }));
    },
  },

  /* ---------------------------- JADWAL SHOLAT ---------------------------- */
  sholat: {
    html: `
      <div class="field"><label>🕌 Nama kota / kabupaten</label>
        <div class="input-row">
          <input class="input" id="shKota" placeholder="contoh: Pati" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="shGo">🔎 Cari</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-k="pati">Pati</span>
        <span class="chip" data-k="jakarta">Jakarta</span>
        <span class="chip" data-k="semarang">Semarang</span>
        <span class="chip" data-k="jepara">Jepara</span>
        <span class="chip" data-k="surabaya">Surabaya</span>
        <span class="chip" data-k="makassar">Makassar</span>
      </div>
      <div id="shCities"></div>
      <div id="shResult"></div>`,
    mount() {
      const showJadwal = async (kotaId) => {
        $('#shResult').innerHTML = LOADER_HTML;
        $('#shCities').innerHTML = '';
        try {
          const d = await api('/sholat/jadwal', { kotaId });
          const LABEL = { imsak: 'Imsak', subuh: 'Subuh', terbit: 'Terbit', dhuha: 'Dhuha', dzuhur: 'Dzuhur', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' };
          $('#shResult').innerHTML = `
            <div class="result-box">
              <h4 style="font-family:var(--font-head)">🕌 ${esc(d.lokasi)}</h4>
              <p style="font-size:.78rem;color:var(--muted)">${esc(d.daerah)} · ${esc(d.tanggal)}</p>
              <div class="wordstat-grid" style="margin-top:12px;grid-template-columns:repeat(4,1fr)">
                ${Object.entries(LABEL).map(([k, v]) => `
                  <div class="wordstat"><b>${esc(d.jadwal[k] || '--:--')}</b><span>${v}</span></div>`).join('')}
              </div>
            </div>`;
        } catch (e) { $('#shResult').innerHTML = errBox(e.message); toast(e.message, 'error'); }
      };
      const cari = async (kota) => {
        if (!kota) return toast('Isi nama kota dulu 🕌', 'error');
        $('#shCities').innerHTML = LOADER_HTML;
        $('#shResult').innerHTML = '';
        try {
          const d = await api('/sholat/cari', { kota });
          if (d.cities.length === 1) return showJadwal(d.cities[0].id);
          $('#shCities').innerHTML = `<div class="chip-row" style="margin-bottom:14px">
            ${d.cities.slice(0, 10).map((c) => `<span class="chip" data-id="${c.id}">${esc(c.lokasi)}</span>`).join('')}
          </div>`;
          $$('#shCities .chip').forEach((c) => c.addEventListener('click', () => showJadwal(c.dataset.id)));
          toast(`${d.count} kota ketemu, pilih salah satu 👇`);
        } catch (e) { $('#shCities').innerHTML = ''; $('#shResult').innerHTML = errBox(e.message); toast(e.message, 'error'); }
      };
      $('#shGo').addEventListener('click', () => cari($('#shKota').value.trim()));
      $('#shKota').addEventListener('keydown', (e) => { if (e.key === 'Enter') cari($('#shKota').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => {
        if (c.dataset.k) c.addEventListener('click', () => { $('#shKota').value = c.dataset.k; cari(c.dataset.k); });
      });
    },
  },

  /* ---------------------------- GITHUB STALK ----------------------------- */
  ghstalk: {
    html: `
      <div class="field"><label>🐙 Username GitHub</label>
        <div class="input-row">
          <input class="input" id="ghIn" placeholder="contoh: torvalds" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="ghGo">🔎 Stalk</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-u="torvalds">torvalds</span>
        <span class="chip" data-u="sindresorhus">sindresorhus</span>
        <span class="chip" data-u="github">github</span>
      </div>
      <div id="ghResult"></div>`,
    mount() {
      const run = async (u) => {
        if (!u) return toast('Isi username dulu 🐙', 'error');
        $('#ghResult').innerHTML = LOADER_HTML;
        try {
          const d = await api('/stalk/github', { username: u });
          $('#ghResult').innerHTML = `
            <div class="result-box">
              <div class="result-media">
                <img class="result-thumb" style="border-radius:50%" src="${esc(d.avatar)}" alt="avatar"/>
                <div class="result-meta">
                  <h4>${esc(d.name)}</h4>
                  <p style="color:var(--cyan)">@${esc(d.login)}</p>
                  ${d.bio ? `<p style="color:var(--muted)">${esc(d.bio)}</p>` : ''}
                  ${d.company ? `<p>🏢 ${esc(d.company)}</p>` : ''}
                  ${d.location ? `<p>📍 ${esc(d.location)}</p>` : ''}
                </div>
              </div>
              <div class="wordstat-grid" style="margin-top:14px">
                <div class="wordstat"><b>${shortNum(d.repos)}</b><span>Repos</span></div>
                <div class="wordstat"><b>${shortNum(d.followers)}</b><span>Followers</span></div>
                <div class="wordstat"><b>${shortNum(d.following)}</b><span>Following</span></div>
                <div class="wordstat"><b>${shortNum(d.gists)}</b><span>Gists</span></div>
                <div class="wordstat"><b>${new Date(d.joined).getFullYear()}</b><span>Gabung</span></div>
                <div class="wordstat"><a href="${esc(d.url)}" target="_blank" rel="noopener" style="color:var(--cyan)">↗ Buka</a><span>Profil</span></div>
              </div>
            </div>`;
        } catch (e) { $('#ghResult').innerHTML = errBox(e.message); toast(e.message, 'error'); }
      };
      $('#ghGo').addEventListener('click', () => run($('#ghIn').value.trim()));
      $('#ghIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#ghIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => {
        if (c.dataset.u) c.addEventListener('click', () => { $('#ghIn').value = c.dataset.u; run(c.dataset.u); });
      });
    },
  },

  /* ---------------------------- CEK RANDOM ------------------------------- */
  cekrandom: {
    html: `
      <div class="field"><label>🎯 Mau cek apa hari ini?</label>
        <div class="seg" id="ckCat">
          <button class="active" data-c="bucin">Bucin</button>
          <button data-c="ganteng">Ganteng</button>
          <button data-c="wibu">Wibu</button>
          <button data-c="hoki">Hoki</button>
          <button data-c="pintar">Pintar</button>
        </div></div>
      <div class="field"><label>🧑 Nama kamu <span style="opacity:.6">(kosongin = beda tiap putar)</span></label>
        <input class="input" id="ckName" placeholder="contoh: Rifky" maxlength="24"/></div>
      <div class="pick-display" id="ckOut">❓</div>
      <div class="strength-bar"><div class="strength-fill" id="ckBar" style="width:0%"></div></div>
      <p id="ckCap" style="text-align:center;color:var(--muted);font-size:.9rem;min-height:24px;margin-bottom:10px"></p>
      <button class="btn btn-primary" id="ckGo" style="width:100%">🎲 Cek Sekarang</button>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Kalo pake nama, hasilnya stabil seharian. Ini mah buat seru-seruan aja, jangan baper 😹</p>`,
    mount() {
      const LABELS = { bucin: 'Level BUCIN', ganteng: 'Level GANTENG', wibu: 'Level WIBU', hoki: 'Level HOKI', pintar: 'Level PINTAR' };
      const CAPS = [
        [20, 'Yah… lain kali aja ya 😭'],
        [40, 'Lumayan lah 😅'],
        [60, 'Boleh juga 👍'],
        [80, 'Wih mantap jiwa 🔥'],
        [95, 'DEWA INI MAH 👑'],
        [101, 'CHEAT! KODE CURI 🏆'],
      ];
      let cat = 'bucin';
      const seedInt = (str) => {
        let h = 2166136261;
        for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
        return h >>> 0;
      };
      $('#ckCat').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#ckCat button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); cat = b.dataset.c;
      });
      $('#ckGo').addEventListener('click', () => {
        const name = $('#ckName').value.trim();
        let pct;
        if (name) {
          const day = new Date().toISOString().slice(0, 10);
          pct = (seedInt(`${name.toLowerCase()}|${cat}|${day}`) % 100) + 1;
        } else pct = ((Math.random() * 100) | 0) + 1;
        const out = $('#ckOut'), bar = $('#ckBar'), cap = $('#ckCap');
        out.classList.remove('win');
        const t0 = performance.now();
        (function anim(now) {
          const k = Math.min(1, (now - t0) / 1000);
          const cur = Math.round(pct * (1 - Math.pow(1 - k, 3)));
          out.textContent = cur + '%';
          bar.style.width = cur + '%';
          bar.style.background = 'linear-gradient(90deg,var(--purple),var(--cyan),var(--pink))';
          if (k < 1) requestAnimationFrame(anim);
          else {
            out.classList.add('win');
            const c = CAPS.find(([mx]) => pct < mx)[1];
            cap.textContent = `${LABELS[cat]}${name ? ' ' + name.toUpperCase() : ' kamu'}: ${pct}% — ${c}`;
          }
        })(performance.now());
      });
    },
  },

  /* --------------------------- BRAT STUDIO 🌿 ----------------------------- */
  // Port langsung dari bot WA: src/lib/ourin-brat.js + plugins/sticker/brat*.js
  brat: {
    html: `
      <div class="field"><label>🌿 Pilih varian brat <span style="opacity:.6">(dari bot WA lu sendiri)</span></label>
        <div class="brat-pills" id="brPills"></div></div>
      <div class="field"><label>✍️ Teks brat <span style="opacity:.6">(bisa pake emoji 😂)</span></label>
        <textarea class="input" id="brText" rows="2" maxlength="200" placeholder="ketik sesuatu… misal: gw ngoding lo ngodingin gue"></textarea></div>
      <div class="brat-stage">
        <canvas class="brat-canvas" id="brCanvas" width="512" height="512"></canvas>
        <img class="brat-canvas" id="brImg" style="display:none" alt="hasil brat"/>
        <div class="brat-loading" id="brLoad" style="display:none"><div class="loader"></div><span>lagi bikin…</span></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="brDl" style="flex:1">💾 Simpan PNG</button>
        <button class="btn btn-ghost" id="brRnd">🎲 Contoh</button>
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Varian <b>Cewek</b> dirender di server (butuh 3–5 detik), sisanya langsung jadi di HP kamu, ga nunggu ✅</p>`,
    mount() {
      // nilai koordinat = port persis dari plugin bot (bratgreen, bratwhite, bratanime, bahlil, patrick, squidward, gojo, vermeil)
      const VARIANTS = [
        { id: 'ijo',     label: '🌿 Ijo',      cfg: { bg: '#8ACE00', W: 512, H: 512, maxW: 450, maxH: 450, cx: 256, cy: 256, maxF: 130, minF: 12, dec: 5, lh: 1.1, color: '#000', bold: true } },
        { id: 'putih',   label: '⚪ Putih HD', cfg: { bg: '#FFFFFF', W: 512, H: 512, maxW: 450, maxH: 450, cx: 256, cy: 256, maxF: 130, minF: 12, dec: 5, lh: 1.1, color: '#000', bold: true } },
        { id: 'miring',  label: '🌀 Miring',   cfg: { img: 'img/brat/white.jpg', maxW: 480, maxH: 280, cx: (w, h) => w / 2 + 10, cy: (w, h) => h / 2 + 285, rot: -7.5, maxF: 130, minF: 12, dec: 5, lh: 1.1, color: '#000', bold: true } },
        { id: 'anime',   label: '🎌 Anime',    cfg: { img: 'img/brat/anime.jpg', W: 800, H: 800, maxW: 460, maxH: 210, cx: 400, cy: 590, maxF: 72, minF: 14, dec: 3, lh: 1.45, color: '#000', bold: true } },
        { id: 'bahlil',  label: '⛏️ Bahlil',   cfg: { img: 'img/brat/bahlil.jpg', maxW: 660, maxH: 140, cx: 460, cy: 895, maxF: 110, minF: 14, dec: 5, lh: 1.1, color: '#000', bold: true } },
        { id: 'patrick', label: '⭐ Patrick',   cfg: { img: 'img/brat/patrick.jpg', maxW: 260, maxH: 160, cx: 460, cy: 599, maxF: 70, minF: 12, dec: 1, lh: 1.05, color: '#000', bold: true } },
        { id: 'squid',   label: '🦑 Squidward', cfg: { img: 'img/brat/squidward.jpg', maxW: 230, maxH: 110, cx: 370, cy: 370, maxF: 50, minF: 10, dec: 1, lh: 1.1, color: '#000', bold: true } },
        { id: 'gojo',    label: '🕶️ Gojo',     cfg: { img: 'img/brat/gojo.jpg', zone: { a: 660, b: 1180, c: 270, d: 990 }, maxF: 90, minF: 22, lh: 1.18, color: '#111111', bold: false, font: 'Poppins' } },
        { id: 'vermeil', label: '🦋 Vermeil',   cfg: { img: 'img/brat/vermeil.jpg', zone: { a: 655, b: 1118, c: 282, d: 993 }, maxF: 90, minF: 22, lh: 1.18, color: '#111111', bold: false, font: 'Poppins' } },
        { id: 'ttp',     label: '🌈 TTP',       cfg: { bg: 'transparent', W: 512, H: 512, maxW: 470, maxH: 470, cx: 256, cy: 256, maxF: 160, minF: 12, dec: 5, lh: 1.0, grad: ['#22d3ee', '#a855f7', '#ec4899'], bold: true } },
        { id: 'cewek',   label: '👧 Cewek',     cfg: { api: 'cewek' } },
      ];
      const SAMPLES = ['gw ngoding lo ngodingin gue', 'bilang sayang dulu dong', 'jangan gila ya', 'ini mah gampang banget woi', 'mager banget njir', 'lo udah dapet hoki hari ini?', 'halo gaes balik lagi sama gw', 'turu dulu gas ah'];
      let v = VARIANTS[0];
      const cv = $('#brCanvas'), imgEl = $('#brImg'), loadEl = $('#brLoad'), tx = $('#brText');
      tx.value = SAMPLES[0];

      $('#brPills').innerHTML = VARIANTS.map((x) => `<button class="brat-pill ${x.id === v.id ? 'active' : ''}" data-v="${x.id}">${x.label}</button>`).join('');
      $('#brPills').addEventListener('click', (e) => {
        const b = e.target.closest('.brat-pill'); if (!b) return;
        $$('.brat-pill').forEach((p) => p.classList.remove('active'));
        b.classList.add('active');
        v = VARIANTS.find((x) => x.id === b.dataset.v);
        render();
      });

      // cache bg image biar ga download ulang tiap render
      const imgCache = {};
      const loadImg = (src) => (imgCache[src] ||= new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('Background brat gagal dimuat 😭'));
        i.src = src;
      }));
      const poppinsReady = document.fonts
        ? Promise.all([document.fonts.load('90px "Poppins"'), document.fonts.load('bold 90px "Poppins"')]).catch(() => {})
        : Promise.resolve();

      // word-wrap per kata, kata kepanjangan dipotong per huruf (port wrapParagraph + splitLongWord bot)
      function wrapText(ctx, text, maxW) {
        const lines = [];
        for (const para of String(text).replace(/\r/g, '').split('\n')) {
          const words = para.split(/\s+/).filter(Boolean);
          if (!words.length) { lines.push(''); continue; }
          let cur = '';
          for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
            if (cur) { lines.push(cur); cur = ''; }
            if (ctx.measureText(w).width <= maxW) { cur = w; continue; }
            let part = '';
            for (const ch of Array.from(w)) {
              if (!part || ctx.measureText(part + ch).width <= maxW) part += ch;
              else { lines.push(part); part = ch; }
            }
            cur = part;
          }
          if (cur) lines.push(cur);
        }
        return lines;
      }

      function fontOf(cfg, s) {
        return `${cfg.bold === false ? '' : 'bold '}${s}px ${cfg.font ? `'${cfg.font}',` : ''}Arial, "Segoe UI Emoji", sans-serif`;
      }

      async function render() {
        const text = tx.value.trim() || 'halo ges';
        if (v.cfg.api) { renderApi(text); return; }
        imgEl.style.display = 'none'; cv.style.display = 'block';
        loadEl.style.display = 'flex';
        try {
          const cfg = v.cfg;
          if (cfg.font) await poppinsReady;
          let bg = null;
          if (cfg.img) bg = await loadImg(cfg.img);
          const W = cfg.W || bg.naturalWidth, H = cfg.H || bg.naturalHeight;
          cv.width = W; cv.height = H;
          const ctx = cv.getContext('2d');
          ctx.clearRect(0, 0, W, H);
          if (bg) ctx.drawImage(bg, 0, 0, W, H);
          else if (cfg.bg && cfg.bg !== 'transparent') { ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, W, H); }

          if (cfg.zone) {
            // mode zona aman ala bratlocal.js (gojo & vermeil)
            const z = cfg.zone;
            const zw = z.d - z.c, zh = z.b - z.a, zx = (z.c + z.d) / 2, zy = (z.a + z.b) / 2;
            let s = cfg.maxF, lines = [];
            for (; s >= cfg.minF; s--) {
              ctx.font = fontOf(cfg, s);
              lines = wrapText(ctx, text, zw);
              if (lines.length * Math.ceil(s * cfg.lh) <= zh) break;
            }
            const maxLines = Math.max(1, Math.floor(zh / Math.ceil(s * cfg.lh)));
            if (lines.length > maxLines) {
              lines = lines.slice(0, maxLines);
              let last = lines[maxLines - 1];
              while (last.length && ctx.measureText(last + '…').width > zw) last = last.slice(0, -1);
              lines[maxLines - 1] = last + '…';
            }
            const lineH = Math.ceil(s * cfg.lh);
            const total = lines.length * lineH;
            ctx.font = fontOf(cfg, s);
            ctx.fillStyle = cfg.color;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            let y = zy - total / 2 + lineH / 2;
            for (const ln of lines) { ctx.fillText(ln, zx, y); y += lineH; }
          } else {
            // mode klasik ala ourin-brat.js (auto kecilin font sampe muat)
            let s = cfg.maxF, lines = [];
            for (; s > cfg.minF; s -= cfg.dec || 2) {
              ctx.font = fontOf(cfg, s);
              lines = wrapText(ctx, text, cfg.maxW);
              if (lines.length * s * cfg.lh <= cfg.maxH) break;
            }
            ctx.font = fontOf(cfg, s);
            const cx = typeof cfg.cx === 'function' ? cfg.cx(W, H) : cfg.cx;
            const cy = typeof cfg.cy === 'function' ? cfg.cy(W, H) : cfg.cy;
            ctx.save();
            ctx.translate(cx, cy);
            if (cfg.rot) ctx.rotate((cfg.rot * Math.PI) / 180);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (cfg.grad) {
              const g = ctx.createLinearGradient(-cfg.maxW / 2, -s, cfg.maxW / 2, s);
              cfg.grad.forEach((c, i) => g.addColorStop(i / (cfg.grad.length - 1), c));
              ctx.fillStyle = g;
              ctx.lineWidth = Math.max(6, s / 10); ctx.strokeStyle = 'rgba(0,0,0,.9)';
            } else ctx.fillStyle = cfg.color;
            const lineH = s * cfg.lh, total = lines.length * lineH;
            let y = -total / 2 + lineH / 2;
            for (const ln of lines) {
              if (cfg.grad) { ctx.strokeText(ln, 0, y); }
              ctx.fillText(ln, 0, y);
              y += lineH;
            }
            ctx.restore();
          }
        } catch (e) { toast(e.message, 'error'); }
        loadEl.style.display = 'none';
      }

      let apiBusy = false;
      async function renderApi(text) {
        if (apiBusy) return;
        apiBusy = true;
        cv.style.display = 'block'; imgEl.style.display = 'none';
        loadEl.style.display = 'flex';
        try {
          const d = await api('/tools/brat', { text: text.slice(0, 120), type: v.cfg.api });
          imgEl.src = `data:${d.mime};base64,${d.image}`;
          imgEl.style.display = 'block'; cv.style.display = 'none';
          toast('Brat cewek jadi! 👧');
        } catch (e) {
          toast(e.message, 'error');
        }
        loadEl.style.display = 'none'; apiBusy = false;
      }

      let t;
      tx.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 200); });
      $('#brRnd').addEventListener('click', () => { tx.value = SAMPLES[(Math.random() * SAMPLES.length) | 0]; render(); });
      $('#brDl').addEventListener('click', () => {
        if (v.cfg.api) {
          if (!imgEl.src) return toast('Belum ada hasilnya 😭', 'error');
          downloadDataUrl(imgEl.src, `kyy-brat-${v.id}.png`);
        } else {
          downloadDataUrl(cv.toDataURL('image/png'), `kyy-brat-${v.id}.png`);
        }
        toast('Brat tersimpan! Tinggal jadiin stiker WA 🌿');
      });
      render();
    },
  },

  /* ------------------------- QUOTE BUBBLE 🫧 ------------------------------ */
  // Port plugins/sticker/qc.js
  qcw: {
    html: `
      <div class="field"><label>🧑 Nama di quote</label>
        <input class="input" id="qbName" maxlength="30" placeholder="contoh: Rifkyy" value=""/></div>
      <div class="field"><label>💬 Isi quote <span style="opacity:.6">(maks 90 karakter)</span></label>
        <textarea class="input" id="qbText" rows="2" maxlength="90" placeholder="jangan judge gue sebelum lo jadi programmer full-stack…"></textarea></div>
      <div class="field"><label>🎨 Warna bubble</label>
        <div class="swch-grid" id="qbColors"></div></div>
      <div class="field"><label>🖼️ Foto profil <span style="opacity:.6">(opsional, diupload lewat uploader situs)</span></label>
        <input type="file" id="qbAva" accept="image/png,image/jpeg,image/webp" class="file-input"/>
        <div class="dz-preview" id="qbAvaPrev" style="display:none"></div></div>
      <button class="btn btn-primary" id="qbGo" style="width:100%">✨ Bikin Quote</button>
      <div id="qbResult" style="margin-top:14px"></div>`,
    mount() {
      const COLORS = [['pink', '#f68ac9'], ['blue', '#6cace4'], ['red', '#f44336'], ['green', '#4caf50'], ['purple', '#9c27b0'], ['orange', '#ff9800'], ['teal', '#008080'], ['dark', '#1b1429'], ['darkblue', '#0d47a1'], ['black', '#000000'], ['lightblue', '#03a9f4'], ['lightpink', '#FFC0CB'], ['deeppink', '#FF1493'], ['salmon', '#FFA07A'], ['magenta', '#FF00FF'], ['chocolate', '#A52A2A'], ['yellow', '#ffeb3b'], ['wheat', '#F5DEB3'], ['tan', '#D2B48C'], ['ash', '#9e9e9e'], ['white', '#ffffff']];
      let color = localStorage.getItem('kyy_qb_color') || 'dark';
      $('#qbName').value = localStorage.getItem('kyy_qb_name') || '';
      $('#qbColors').innerHTML = COLORS.map(([k, c]) => `<button class="swch ${k === color ? 'active' : ''}" data-c="${k}" style="background:${c}" title="${k}"></button>`).join('');
      $('#qbColors').addEventListener('click', (e) => {
        const b = e.target.closest('.swch'); if (!b) return;
        $$('.swch').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); color = b.dataset.c;
        localStorage.setItem('kyy_qb_color', color);
      });

      let avatarB64 = null, avatarMime = null;
      $('#qbAva').addEventListener('change', () => {
        const f = $('#qbAva').files[0];
        if (!f) { avatarB64 = null; $('#qbAvaPrev').style.display = 'none'; return; }
        if (f.size > 8 * 1024 * 1024) return toast('Foto kebanyakan gede, maks 8MB 😭', 'error');
        const r = new FileReader();
        r.onload = () => {
          avatarB64 = String(r.result).split(',')[1];
          avatarMime = f.type || 'image/png';
          $('#qbAvaPrev').innerHTML = `<img src="${r.result}" alt="ava"/><span>siap dipake 👍</span>`;
          $('#qbAvaPrev').style.display = 'flex';
        };
        r.readAsDataURL(f);
      });

      $('#qbGo').addEventListener('click', async () => {
        const name = $('#qbName').value.trim() || 'User';
        const text = $('#qbText').value.trim();
        if (!text) return toast('Isi quote-nya dulu 💬', 'error');
        localStorage.setItem('kyy_qb_name', name);
        $('#qbResult').innerHTML = LOADER_HTML;
        try {
          let photoUrl = '';
          if (avatarB64) {
            const up = await api('/tools/upload', { b64: avatarB64, mime: avatarMime, name: 'ava' });
            photoUrl = up.url;
          }
          const d = await api('/tools/qc', { name, text, color, photoUrl });
          const src = `data:${d.mime};base64,${d.image}`;
          $('#qbResult').innerHTML = `
            <div class="result-box" style="text-align:center">
              <img src="${src}" class="qc-result" alt="quote"/>
              <div class="btn-row" style="margin-top:14px">
                <button class="btn btn-primary" id="qbDl" style="flex:1">💾 Simpan PNG</button>
              </div>
            </div>`;
          $('#qbDl').addEventListener('click', () => { downloadDataUrl(src, 'kyy-quote.png'); toast('Quote tersimpan! 🫧'); });
          toast('Quote jadi! 🫧');
        } catch (e) {
          $('#qbResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      });
    },
  },

  /* ------------------------ FOTO JADI LINK 🔗 ------------------------------ */
  fotolink: {
    html: `
      <div class="dz" id="upDz">
        <div style="font-size:2.2rem">🖼️</div>
        <p style="margin:8px 0 4px;font-weight:600">Tap buat pilih foto</p>
        <p style="font-size:.75rem;color:var(--muted)">atau drag & drop kesini — maks 12MB</p>
        <input type="file" id="upFile" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none"/>
      </div>
      <div class="dz-preview" id="upPrev" style="display:none"></div>
      <button class="btn btn-primary" id="upGo" style="width:100%;margin-top:12px" disabled>🔗 Upload & Ambil Link</button>
      <div id="upResult" style="margin-top:14px"></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Link-nya permanen & langsung bisa dibuka. Cocok buat foto profil Quote Bubble atau meme pakai link 😉</p>`,
    mount() {
      const dz = $('#upDz'), fi = $('#upFile'), go = $('#upGo');
      let file = null;
      const setFile = (f) => {
        if (!f) return;
        if (!/^image\//.test(f.type)) return toast('Itu bukan gambar woi 🤨', 'error');
        if (f.size > 12 * 1024 * 1024) return toast('Kegedean, maks 12MB ya', 'error');
        file = f;
        const r = new FileReader();
        r.onload = () => {
          $('#upPrev').innerHTML = `<img src="${r.result}" alt="preview"/><span>${esc(f.name)} · ${(f.size / 1024).toFixed(0)} KB</span>`;
          $('#upPrev').style.display = 'flex';
          go.disabled = false;
        };
        r.readAsDataURL(f);
      };
      dz.addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => setFile(fi.files[0]));
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('over'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); setFile(e.dataTransfer.files[0]); });

      go.addEventListener('click', async () => {
        if (!file) return;
        $('#upResult').innerHTML = LOADER_HTML;
        try {
          const dataUrl = await new Promise((res) => {
            const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file);
          });
          const d = await api('/tools/upload', { b64: String(dataUrl).split(',')[1], mime: file.type, name: file.name });
          $('#upResult').innerHTML = `
            <div class="result-box">
              <p style="font-size:.8rem;color:var(--muted)">✅ Udah jadi link nih (${esc(d.provider)}, ${(d.size / 1024).toFixed(0)} KB)${d.expires ? ` · ⏳ hangus ${esc(d.expires)}` : ' · permanen'}</p>
              <div class="input-row" style="margin-top:8px">
                <input class="input" id="upLink" readonly value="${esc(d.url)}"/>
                <button class="btn btn-primary btn-sm" id="upCopy">📋</button>
              </div>
              <div class="dz-preview" style="margin-top:10px"><img src="${esc(d.url)}" alt="hasil" style="max-height:160px"/></div>
              <div class="btn-row" style="margin-top:12px">
                <a class="btn btn-ghost" href="${esc(d.url)}" target="_blank" rel="noopener" style="flex:1">🔗 Buka Link</a>
              </div>
            </div>`;
          $('#upCopy').addEventListener('click', () => copyText(d.url));
          toast('Link kelar! 🔗');
        } catch (e) {
          $('#upResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      });
    },
  },

  /* ------------------------ STALK PINTEREST 📌 ----------------------------- */
  stalkpin: {
    html: `
      <div class="field"><label>📌 Username Pinterest</label>
        <div class="input-row">
          <input class="input" id="spIn" placeholder="contoh: dims" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="spGo">🔎 Stalk</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-u="dims">dims</span>
        <span class="chip" data-u="pinterest">pinterest</span>
        <span class="chip" data-u="canva">canva</span>
      </div>
      <p style="font-size:.72rem;color:var(--muted)">Yang ke-block atau private ya gamungkin keliatan, gitu aturannya 😌</p>
      <div id="spResult"></div>`,
    mount() {
      const run = async (u) => {
        if (!u) return toast('Isi username dulu 📌', 'error');
        $('#spResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/stalk/pinterest?username=${encodeURIComponent(u)}`);
          const v = d.user;
          $('#spResult').innerHTML = `
            <div class="result-box">
              <div class="result-media">
                <img class="result-thumb" style="border-radius:50%" src="${esc(v.avatar)}" referrerpolicy="no-referrer" onerror="this.style.display='none'"/>
                <div class="result-meta">
                  <h4>${esc(v.name)}</h4>
                  <p>@${esc(v.username)}</p>
                  ${v.bio ? `<p style="color:var(--muted);margin-top:4px">${esc(v.bio)}</p>` : ''}
                  ${v.website ? `<p style="margin-top:4px">🔗 <a href="${esc(v.website)}" target="_blank" rel="noopener" style="color:var(--cyan)">${esc(v.website)}</a></p>` : ''}
                </div>
              </div>
              <div class="wordstat-grid" style="margin-top:14px">
                <div class="wordstat"><b>${shortNum(v.stats.followers)}</b><span>Followers</span></div>
                <div class="wordstat"><b>${shortNum(v.stats.following)}</b><span>Following</span></div>
                <div class="wordstat"><b>${shortNum(v.stats.pins)}</b><span>Pin</span></div>
                <div class="wordstat"><b>${shortNum(v.stats.boards)}</b><span>Board</span></div>
              </div>
              <div class="btn-row" style="margin-top:14px">
                <a class="btn btn-primary" href="${esc(v.url)}" target="_blank" rel="noopener" style="flex:1">📌 Buka Profil</a>
              </div>
            </div>`;
          toast('Ketemu! 📌');
        } catch (e) {
          $('#spResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#spGo').addEventListener('click', () => run($('#spIn').value.trim()));
      $('#spIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#spIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#spIn').value = c.dataset.u; run(c.dataset.u); }));
    },
  },

  /* ----------------------------- FUN SECTION 🎲 ---------------------------- */
  artinama: {
    html: `
      <div class="field"><label>🔮 Nama kamu</label>
        <div class="input-row">
          <input class="input" id="anName" placeholder="contoh: rifky" maxlength="40"/>
          <button class="btn btn-primary btn-sm" id="anGo">✨ Cek</button>
        </div></div>
      <p style="font-size:.72rem;color:var(--muted)">Primbon jawa, dibaca buat seru-seruan ya, jangan dijadiin alasan mutusin pacar 😹</p>
      <div id="anResult"></div>`,
    mount() {
      const run = async () => {
        const nama = $('#anName').value.trim();
        if (!nama) return toast('Isi nama dulu dong 🔮', 'error');
        $('#anResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/primbon?type=artinama&nama=${encodeURIComponent(nama)}`);
          const r = d.result;
          $('#anResult').innerHTML = `
            <div class="result-box">
              <h4 style="margin-bottom:10px">🔮 Arti nama "${esc(r.nama || nama)}"</h4>
              <div class="fun-text">${String(r.arti || '(kosong)').split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
            </div>`;
          toast('Kebaca! 🔮');
        } catch (e) {
          $('#anResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#anGo').addEventListener('click', run);
      $('#anName').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  cocok: {
    html: `
      <div class="field"><label>😎 Nama kamu</label>
        <input class="input" id="clA" maxlength="40" placeholder="nama kamu"/></div>
      <div class="field"><label>🥰 Nama dia</label>
        <input class="input" id="clB" maxlength="40" placeholder="nama dia"/></div>
      <button class="btn btn-primary" id="clGo" style="width:100%">💞 Cek Kecocokan</button>
      <div id="clResult" style="margin-top:14px"></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Angka kecocokan stabil buat pasangan nama yang sama, jadi bisa lu screenshot buat bahan gebetan 😌</p>`,
    mount() {
      const seedInt = (str) => {
        let h = 2166136261;
        for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
        return h >>> 0;
      };
      $('#clGo').addEventListener('click', async () => {
        const a = $('#clA').value.trim(), b = $('#clB').value.trim();
        if (!a || !b) return toast('Isi dua nama dulu 💞', 'error');
        $('#clResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/primbon?type=cocok&nama1=${encodeURIComponent(a)}&nama2=${encodeURIComponent(b)}`);
          const r = d.result;
          const pct = 55 + (seedInt([a, b].join('|').toLowerCase()) % 46); // 55–100 biar ga sadis 😹
          const CAPS = [[60, 'Hmm masih temen rasa lebih 🫂'], [75, 'Lumayan nih, ada chemistry ✨'], [90, 'Wih cocok bener, lanjutin! 🌹'], [101, 'JODOH GAS KEBUL 🚀💍']];
          const cap = CAPS.find(([mx]) => pct < mx)[1];
          $('#clResult').innerHTML = `
            <div class="result-box" style="text-align:center">
              <p style="font-size:.85rem;color:var(--muted)">💞 Kecocokan</p>
              <div class="love-names"><span>${esc(r.nama_anda || a)}</span><b>×</b><span>${esc(r.nama_pasangan || b)}</span></div>
              <div class="pick-display love-pct" id="clPct">0%</div>
              <div class="strength-bar"><div class="strength-fill" id="clBar" style="width:0%"></div></div>
              <p style="color:var(--cyan);font-weight:600;margin:10px 0 16px">${cap}</p>
              ${r.sisi_positif ? `<div class="fun-text" style="text-align:left"><p><b style="color:var(--cyan)">✨ Sisi positif:</b> ${esc(r.sisi_positif)}</p></div>` : ''}
              ${r.sisi_negatif ? `<div class="fun-text" style="text-align:left;margin-top:8px"><p><b style="color:var(--pink)">⚡ Sisi minus:</b> ${esc(r.sisi_negatif)}</p></div>` : ''}
            </div>`;
          const bar = $('#clBar'), out = $('#clPct'), t0 = performance.now();
          (function anim(now) {
            const k = Math.min(1, (now - t0) / 1100);
            const cur = Math.round(pct * (1 - Math.pow(1 - k, 3)));
            out.textContent = cur + '%'; bar.style.width = cur + '%';
            bar.style.background = 'linear-gradient(90deg,var(--cyan),var(--purple),var(--pink))';
            if (k < 1) requestAnimationFrame(anim); else out.classList.add('win');
          })(performance.now());
          toast(cap);
        } catch (e) {
          $('#clResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      });
    },
  },

  zodiak: {
    html: `
      <div class="field"><label>♈ Pilih zodiak</label>
        <div class="zil-grid" id="zlGrid"></div></div>
      <div id="zlResult"></div>`,
    mount() {
      const SIGNS = [['aries', '♈'], ['taurus', '♉'], ['gemini', '♊'], ['cancer', '♋'], ['leo', '♌'], ['virgo', '♍'], ['libra', '♎'], ['scorpio', '♏'], ['sagitarius', '♐'], ['capricorn', '♑'], ['aquarius', '♒'], ['pisces', '♓']];
      $('#zlGrid').innerHTML = SIGNS.map(([k, e]) => `<button class="zil-btn" data-z="${k}"><b>${e}</b><span>${k}</span></button>`).join('');
      $('#zlGrid').addEventListener('click', async (e) => {
        const btn = e.target.closest('.zil-btn'); if (!btn) return;
        $$('.zil-btn').forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
        const z = btn.dataset.z;
        $('#zlResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/primbon?type=zodiak&zodiak=${encodeURIComponent(z)}`);
          const r = d.result;
          const body = typeof r === 'string' ? r : Object.entries(r || {}).filter(([, val]) => typeof val === 'string' && val.trim()).map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`).join('\n') || 'Kosong 😶';
          $('#zlResult').innerHTML = `
            <div class="result-box">
              <h4 style="margin-bottom:10px">${SIGNS.find(([k]) => k === z)[1]} ${z[0].toUpperCase() + z.slice(1)}</h4>
              <div class="fun-text">${body.split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
            </div>`;
        } catch (e) {
          $('#zlResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      });
    },
  },

  /* ================= BATCH 3.0: GAMES & SEARCH (port bot) ================== */

  /* --------------------------- MINI GAMES 🎮 ------------------------------- */
  // Soal di-port dari src/data/*.json bot WA lu sendiri
  minigames: {
    html: `
      <div id="gmWrap"><div class="loader-wrap"><div class="loader"></div><p>Lagi nyiapin 1600+ soal…</p></div></div>`,
    mount() {
      const MODES = [
        { id: 'tebakkata', label: '📝 Tebak Kata', hint: 'Sekumpulan petunjuk jadi 1 jawaban' },
        { id: 'caklontong', label: '🧢 Cak Lontong', hint: 'Jawabannya nyeleneh, mikir full 😹' },
        { id: 'siapakahaku', label: '🕵️ Siapakah Aku', hint: 'Aku-aku-an detektif' },
        { id: 'asahotak', label: '🧠 Asah Otak', hint: 'Pengetahuan umum & logika' },
        { id: 'susunkata', label: '🔤 Susun Kata', hint: 'Huruf acak, susun jadi kata' },
        { id: 'riddle', label: '🧩 Teka-Teki', hint: 'Riddle klasik' },
      ];
      const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
      const fSeed = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
      let G, mode = 'tebakkata', cur = null, score = 0, streak = 0, usedHint = false, locked = false;

      loadGamedata().then((g) => { G = g; renderHome(); newRound(); }).catch((e) => {
        $('#gmWrap').innerHTML = errBox(e.message);
      });

      function bank() { return G.games[mode] || []; }
      function renderHome() {
        $('#gmWrap').innerHTML = `
          <div class="brat-pills" id="gmPills">${MODES.map((m) => `<button class="brat-pill ${m.id === mode ? 'active' : ''}" data-m="${m.id}">${m.label}</button>`).join('')}</div>
          <div class="gm-stat">
            <span>🏆 Skor: <b id="gmScore">${score}</b></span>
            <span>🔥 Streak: <b id="gmStreak">${streak}</b></span>
            <span>📚 Soal: <b>${bank().length}</b></span>
          </div>
          <div class="gm-card">
            <p class="gm-type" id="gmType"></p>
            <h3 class="gm-soal" id="gmSoal"></h3>
            <p class="gm-hint" id="gmHint" style="display:none"></p>
          </div>
          <div class="input-row" style="margin-top:12px">
            <input class="input" id="gmAns" placeholder="tulis jawabanmu…" autocomplete="off"/>
            <button class="btn btn-primary btn-sm" id="gmCek">✔️ Cek</button>
          </div>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn btn-ghost btn-sm" id="gmHintBtn" style="flex:1">💡 Hint</button>
            <button class="btn btn-ghost btn-sm" id="gmSkip" style="flex:1">🏳️ Nyerah</button>
          </div>
          <div id="gmMsg" class="gm-msg" style="display:none"></div>`;
        $('#gmPills').addEventListener('click', (e) => {
          const b = e.target.closest('.brat-pill'); if (!b) return;
          mode = b.dataset.m; score = 0; streak = 0;
          renderHome(); newRound();
        });
        $('#gmCek').addEventListener('click', cek);
        $('#gmAns').addEventListener('keydown', (e) => { if (e.key === 'Enter') cek(); });
        $('#gmHintBtn').addEventListener('click', showHint);
        $('#gmSkip').addEventListener('click', surrender);
      }

      function newRound() {
        const b = bank();
        cur = b[(Math.random() * b.length) | 0];
        usedHint = false; locked = false;
        const typeEl = $('#gmType'), soalEl = $('#gmSoal'), hintEl = $('#gmHint'), msgEl = $('#gmMsg');
        msgEl.style.display = 'none'; msgEl.className = 'gm-msg';
        hintEl.style.display = 'none';
        $('#gmAns').value = '';
        const m = MODES.find((x) => x.id === mode);
        typeEl.textContent = m.label + ' — ' + m.hint;
        if (mode === 'susunkata') {
          const letters = cur.soal.replace(/\s*-\s*/g, ' ').split(' ').filter(Boolean);
          soalEl.innerHTML = `<span style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">` +
            letters.map((l) => `<span class="gm-tile">${esc(l)}</span>`).join('') + `</span>` +
            (cur.tipe ? `<span style="display:block;margin-top:10px;font-size:.8rem;color:var(--muted)">tipe: ${esc(cur.tipe)}</span>` : '');
        } else {
          soalEl.textContent = cur.soal;
        }
      }

      function cek() {
        if (locked) return;
        const g = norm($('#gmAns').value);
        if (!g) return toast('Isi jawaban dulu 😗', 'error');
        const a = norm(cur.jawaban);
        const win = g === a || (a.includes(g) && g.length >= 4) || (g.includes(a) && a.length >= 4);
        const msgEl = $('#gmMsg');
        if (win) {
          locked = true;
          score += usedHint ? 5 : 10;
          streak++;
          $('#gmScore').textContent = score;
          $('#gmStreak').textContent = streak;
          msgEl.className = 'gm-msg win';
          msgEl.innerHTML = `🎉 BENER! Jawabannya: <b>${esc(cur.jawaban)}</b>` +
            (cur.desc ? `<p class="gm-desc">🧢 ${esc(cur.desc)}</p>` : '') +
            `<button class="btn btn-primary btn-sm" id="gmNext" style="margin-top:10px">▶️ Soal Lanjut</button>`;
          msgEl.style.display = 'block';
          $('#gmNext').addEventListener('click', newRound);
          toast('Pro max ini mah 🔥');
        } else {
          streak = 0;
          $('#gmStreak').textContent = streak;
          msgEl.className = 'gm-msg lose';
          msgEl.textContent = '😭 Salah… mikir keras lagi vlok';
          msgEl.style.display = 'block';
        }
      }

      function showHint() {
        if (locked || usedHint) return;
        usedHint = true;
        const ans = String(cur.jawaban).trim();
        const chars = Array.from(ans);
        const nReveal = Math.max(1, Math.ceil(chars.length * 0.4));
        const idx = chars.map((_, i) => i).filter((i) => /[a-zA-Z0-9]/.test(chars[i]));
        const seeded = ((fSeed(cur.jawaban + mode) % 97) + 97);
        for (let i = idx.length - 1; i > 0; i--) { const j = (seeded * (i + 7)) % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        const reveal = new Set(idx.slice(0, nReveal));
        const masked = chars.map((c, i) => (c === ' ' ? ' ' : reveal.has(i) ? c : '•')).join('');
        const hintEl = $('#gmHint');
        hintEl.textContent = `💡 ${ans.length} huruf: ${masked}`;
        hintEl.style.display = 'block';
      }

      function surrender() {
        if (locked) return;
        locked = true; streak = 0;
        $('#gmStreak').textContent = streak;
        const msgEl = $('#gmMsg');
        msgEl.className = 'gm-msg info';
        msgEl.innerHTML = `🏳️ Jawabannya: <b>${esc(cur.jawaban)}</b>` +
          (cur.desc ? `<p class="gm-desc">🧢 ${esc(cur.desc)}</p>` : '') +
          `<button class="btn btn-primary btn-sm" id="gmNext2" style="margin-top:10px">▶️ Soal Baru</button>`;
        msgEl.style.display = 'block';
        $('#gmNext2').addEventListener('click', newRound);
      }
    },
  },

  /* ------------------------- TRUTH OR DARE 😈 ------------------------------ */
  tod: {
    html: `
      <div id="tdWrap"><div class="loader-wrap"><div class="loader"></div><p>Bentar, ngumpulin kartu…</p></div></div>`,
    mount() {
      loadGamedata().then((G) => {
        $('#tdWrap').innerHTML = `
          <div class="tod-card" id="tdCard"><div class="tod-emoji">❓</div><p class="tod-text">Pilih kartumu berani…</p></div>
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-primary" id="tdTruth" style="flex:1">😇 Truth</button>
            <button class="btn btn-primary" id="tdDare" style="flex:1;background:linear-gradient(135deg,var(--pink),var(--purple))">😈 Dare</button>
          </div>
          <p style="font-size:.72rem;color:var(--muted);margin-top:12px;text-align:center">Truth ${G.truth.length} kartu · Dare ${G.dare.length} kartu — jangan baper, jangan ngambek 😹</p>`;
        let lastT = -1, lastD = -1;
        const rndIdx = (len, last) => { let i; do { i = (Math.random() * len) | 0; } while (i === last && len > 1); return i; };
        const reveal = (emoji, text, cc) => {
          const card = $('#tdCard');
          card.style.setProperty('--cc', cc);
          card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');
          card.innerHTML = `<div class="tod-emoji">${emoji}</div><p class="tod-text">${esc(text)}</p>`;
        };
        $('#tdTruth').addEventListener('click', () => { lastT = rndIdx(G.truth.length, lastT); reveal('😇 TRUTH', G.truth[lastT], 'var(--cyan)'); });
        $('#tdDare').addEventListener('click', () => { lastD = rndIdx(G.dare.length, lastD); reveal('😈 DARE', G.dare[lastD], 'var(--pink)'); });
      }).catch((e) => { $('#tdWrap').innerHTML = errBox(e.message); });
    },
  },

  /* --------------------------- QUOTES BUCIN 💌 ----------------------------- */
  quotesb: {
    html: `
      <div id="qtWrap"><div class="loader-wrap"><div class="loader"></div><p>Nyangkut di fase galau…</p></div></div>`,
    mount() {
      loadGamedata().then((G) => {
        let tab = 'bucin';
        const draw = () => {
          $('#qtWrap').innerHTML = `
            <div class="seg" id="qtSeg" style="margin-bottom:14px">
              <button class="${tab === 'bucin' ? 'active' : ''}" data-t="bucin">😘 Bucin (${G.bucin.length})</button>
              <button class="${tab === 'renungan' ? 'active' : ''}" data-t="renungan">🕊️ Renungan (${G.renungan.length})</button>
            </div>
            <div id="qtBody"></div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-primary" id="qtNext" style="flex:1">🎲 Ganti ${tab === 'bucin' ? 'Quotes' : 'Gambar'}</button>
              <button class="btn btn-ghost" id="qtCopy">📋 Salin</button>
            </div>`;
          $('#qtSeg').addEventListener('click', (e) => {
            const b = e.target.closest('button'); if (!b) return;
            tab = b.dataset.t; draw(); next();
          });
          $('#qtNext').addEventListener('click', next);
          $('#qtCopy').addEventListener('click', () => {
            const txt = $('#qtBody .fun-text')?.textContent || $('#qtBody img')?.src || '';
            if (txt) copyText(txt);
          });
          next();
        };
        function next() {
          if (tab === 'bucin') {
            const q = G.bucin[(Math.random() * G.bucin.length) | 0];
            $('#qtBody').innerHTML = `<div class="result-box" style="text-align:center"><div class="love-names" style="font-size:1rem;line-height:1.8">“${esc(q)}”</div></div>`;
          } else {
            const u = G.renungan[(Math.random() * G.renungan.length) | 0];
            $('#qtBody').innerHTML = `<div class="result-box" style="text-align:center"><img src="${esc(u)}" class="qc-result" alt="renungan" loading="lazy" onerror="this.parentElement.innerHTML='<p class=\\'fun-text\\'>Gambar lagi sibuk, coba ganti lagi 🕊️</p>'"/></div>`;
          }
        }
        draw();
      }).catch((e) => { $('#qtWrap').innerHTML = errBox(e.message); });
    },
  },

  /* ----------------------------- CEK KHODAM 🧿 ----------------------------- */
  khodam: {
    html: `
      <div class="field"><label>🧿 Nama kamu <span style="opacity:.6">(kosongin = random tiap cek)</span></label>
        <input class="input" id="khName" maxlength="30" placeholder="tulis nama, yang bener ya 😌"/></div>
      <div class="kh-reveal" id="khOut"><div class="kh-emoji">🧿</div><p>Khodammu masih ngumpet…</p></div>
      <button class="btn btn-primary" id="khGo" style="width:100%">✨ Panggil Khodam</button>
      <div id="khDesc" style="margin-top:12px"></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Kalo pake nama, khodamnya stabil seharian (dia betah sama kamu). Ini mah becandaan ya gais, jangan dibawa serius amat 😹</p>`,
    mount() {
      loadGamedata().then((G) => {
        const seedInt = (str) => { let h = 2166136261; for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
        $('#khGo').addEventListener('click', () => {
          const name = $('#khName').value.trim();
          const k = name
            ? G.khodam[seedInt(name.toLowerCase() + '|' + new Date().toISOString().slice(0, 10)) % G.khodam.length]
            : G.khodam[(Math.random() * G.khodam.length) | 0];
          const out = $('#khOut');
          out.classList.remove('show'); void out.offsetWidth;
          out.innerHTML = `<div class="kh-emoji">🧿</div><h3 class="kh-name">${esc(k.name)}</h3>`;
          out.classList.add('show');
          $('#khDesc').innerHTML = `<div class="result-box" style="text-align:center"><p class="fun-text">${esc(k.meaning)}</p>${name ? `<p style="font-size:.75rem;color:var(--muted);margin-top:8px">Khodam buat <b>${esc(name)}</b> hari ini</p>` : ''}</div>`;
          toast(`Khodam ${k.name} udah manggil 🧿`);
        });
      }).catch((e) => { toast(e.message, 'error'); });
    },
  },

  /* ----------------------------- LIRIK LAGU 🎵 ----------------------------- */
  lirik: {
    html: `
      <div class="field"><label>🎵 Cari lagu</label>
        <div class="input-row">
          <input class="input" id="lyIn" placeholder="judul + nama artis, bebas" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="lyGo">🔎 Cari</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-q="mata ke hati">mata ke hati</span>
        <span class="chip" data-q="penjaga hati">penjaga hati</span>
        <span class="chip" data-q="monokrom tulus">monokrom</span>
      </div>
      <div id="lyResult"></div>`,
    mount() {
      const run = async (q) => {
        if (!q) return toast('Judul lagunya mana? 🎵', 'error');
        $('#lyResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/search/lyrics?q=${encodeURIComponent(q)}`);
          const r = d.result;
          $('#lyResult').innerHTML = `
            <div class="result-box">
              <div class="result-media">
                ${r.thumbnail ? `<img class="result-thumb" src="${esc(r.thumbnail)}" referrerpolicy="no-referrer" alt="cover" onerror="this.style.display='none'"/>` : ''}
                <div class="result-meta">
                  <h4>${esc(r.title)}</h4>
                  <p>🎤 ${esc(r.artist)}</p>
                  ${r.album ? `<p>💿 ${esc(r.album)}</p>` : ''}
                </div>
              </div>
              <div class="lyric-box">${esc(r.lyric)}</div>
              <div class="btn-row" style="margin-top:12px">
                <button class="btn btn-primary" id="lyCopy" style="flex:1">📋 Salin Lirik</button>
              </div>
            </div>`;
          $('#lyCopy').addEventListener('click', () => copyText(`${r.title} — ${r.artist}\n\n${r.lyric}`));
          toast('Lirik ketemu! 🎤');
        } catch (e) {
          $('#lyResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#lyGo').addEventListener('click', () => run($('#lyIn').value.trim()));
      $('#lyIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#lyIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#lyIn').value = c.dataset.q; run(c.dataset.q); }));
    },
  },

  /* --------------------------- CARI PINTEREST 📌 --------------------------- */
  pinsearch: {
    html: `
      <div class="field"><label>📌 Cari apa?</label>
        <div class="input-row">
          <input class="input" id="psIn" placeholder="misal: aesthetic anime wallpaper" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="psGo">🔎 Cari</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-q="aesthetic anime">aesthetic anime</span>
        <span class="chip" data-q="wallpaper hd">wallpaper hd</span>
        <span class="chip" data-q="cute cat">cute cat</span>
      </div>
      <p style="font-size:.72rem;color:var(--muted)">Tap gambar buat buka full size-nya. Ideal buat bahan meme & brat 😌</p>
      <div id="psResult"></div>`,
    mount() {
      const run = async (q) => {
        if (!q) return toast('Isi kata kunci dulu 📌', 'error');
        $('#psResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/search/pinterest?q=${encodeURIComponent(q)}`);
          const r = d.result;
          $('#psResult').innerHTML = `
            <div class="ps-grid">
              ${r.images.map((x) => `
                <a class="ps-item" href="${esc(x.img)}" target="_blank" rel="noopener">
                  <img src="${esc(x.img)}" loading="lazy" referrerpolicy="no-referrer" alt="${esc(x.title || 'pin')}" onerror="this.parentElement.remove()"/>
                </a>`).join('')}
            </div>
            <p style="font-size:.75rem;color:var(--muted);margin-top:8px">📌 ${r.count} gambar buat "${esc(r.query)}"</p>`;
          toast(`${r.count} gambar ketemu! 📌`);
        } catch (e) {
          $('#psResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#psGo').addEventListener('click', () => run($('#psIn').value.trim()));
      $('#psIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#psIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#psIn').value = c.dataset.q; run(c.dataset.q); }));
    },
  },

  /* --------------------------- STALK FREE FIRE 🔥 -------------------------- */
  stalkff: {
    html: `
      <div class="field"><label>🔥 UID Free Fire</label>
        <div class="input-row">
          <input class="input" id="ffIn" placeholder="misal: 195090825" inputmode="numeric" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="ffGo">🔎 Stalk</button>
        </div></div>
      <p style="font-size:.72rem;color:var(--muted)">UID-nya angka panjang di profil FF, bukan nickname ya 🔥</p>
      <div id="ffResult"></div>`,
    mount() {
      const run = async () => {
        const uid = $('#ffIn').value.trim();
        if (!uid) return toast('Isi UID dulu 🔥', 'error');
        $('#ffResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/stalk/ff?uid=${encodeURIComponent(uid)}`);
          const v = d.user;
          $('#ffResult').innerHTML = `
            <div class="result-box">
              <div class="result-meta" style="margin-bottom:12px">
                <h4>🔥 ${esc(v.name)}</h4>
                <p style="color:var(--muted)">UID ${esc(v.uid)} · Region ${esc(v.region)}</p>
              </div>
              <div class="wordstat-grid">
                <div class="wordstat"><b>${esc(String(v.level))}</b><span>Level</span></div>
                <div class="wordstat"><b>${shortNum(v.likes)}</b><span>❤️ Likes</span></div>
                <div class="wordstat"><b>${esc(v.region)}</b><span>Region</span></div>
              </div>
              ${v.createdAt ? `<p style="font-size:.78rem;color:var(--muted);margin-top:12px">📅 Dibuat: ${esc(String(v.createdAt).slice(0, 10))}</p>` : ''}
              ${v.lastLogin ? `<p style="font-size:.78rem;color:var(--muted)">🕐 Login terakhir: ${esc(String(v.lastLogin).slice(0, 10))}</p>` : ''}
            </div>`;
          toast('Ketemu player-nya! 🔥');
        } catch (e) {
          $('#ffResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#ffGo').addEventListener('click', run);
      $('#ffIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
    },
  },

  /* --------------------------- STALK ROBLOX 🤖 ----------------------------- */
  stalkroblox: {
    html: `
      <div class="field"><label>🤖 Username Roblox</label>
        <div class="input-row">
          <input class="input" id="rbIn" placeholder="misal: builderman" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="rbGo">🔎 Stalk</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-u="builderman">builderman</span>
        <span class="chip" data-u="roblox">roblox</span>
      </div>
      <div id="rbResult"></div>`,
    mount() {
      const run = async (u) => {
        if (!u) return toast('Isi username dulu 🤖', 'error');
        $('#rbResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/stalk/roblox?username=${encodeURIComponent(u)}`);
          const v = d.user;
          $('#rbResult').innerHTML = `
            <div class="result-box">
              <div class="result-media">
                <img class="result-thumb" src="${esc(v.avatar)}" referrerpolicy="no-referrer" alt="avatar" onerror="this.style.display='none'"/>
                <div class="result-meta">
                  <h4>${esc(v.displayName)} ${v.verified ? '<span style="color:var(--cyan)">✔️</span>' : ''} ${v.banned ? '<span style="color:var(--pink)">🚫</span>' : ''}</h4>
                  <p>@${esc(v.username)} · ID ${v.id}</p>
                  ${v.bio ? `<p style="color:var(--muted);margin-top:4px">${esc(v.bio)}</p>` : ''}
                  ${v.created ? `<p style="font-size:.75rem;color:var(--muted);margin-top:4px">📅 Join: ${esc(String(v.created).slice(0, 10))}</p>` : ''}
                </div>
              </div>
              <div class="wordstat-grid" style="margin-top:14px">
                <div class="wordstat"><b>${shortNum(v.stats.followers)}</b><span>Followers</span></div>
                <div class="wordstat"><b>${shortNum(v.stats.following)}</b><span>Following</span></div>
                <div class="wordstat"><b>${shortNum(v.stats.friends)}</b><span>Friends</span></div>
              </div>
              <div class="btn-row" style="margin-top:14px">
                <a class="btn btn-primary" href="${esc(v.url)}" target="_blank" rel="noopener" style="flex:1">🤖 Buka Profil</a>
              </div>
            </div>`;
          toast('Ketemu! 🤖');
        } catch (e) {
          $('#rbResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#rbGo').addEventListener('click', () => run($('#rbIn').value.trim()));
      $('#rbIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#rbIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#rbIn').value = c.dataset.u; run(c.dataset.u); }));
    },
  },

  /* --------------------------- ASMAUL HUSNA 🕌 ----------------------------- */
  asmaul: {
    html: `
      <div class="field"><label>🔎 Cari nama <span style="opacity:.6">(tap kartu buat liat artinya)</span></label>
        <input class="input" id="ahSearch" placeholder="misal: rahman / maha agung"/></div>
      <div id="ahWrap"><div class="loader-wrap"><div class="loader"></div><p>Memuat 99 nama…</p></div></div>`,
    mount() {
      loadGamedata().then((G) => {
        const render = (q = '') => {
          const list = G.asmaul.filter((x) => !q || x.latin.toLowerCase().includes(q) || x.arti.toLowerCase().includes(q));
          $('#ahWrap').innerHTML = `<div class="ah-grid">` + list.map((x, i) => `
            <button class="ah-card" data-i="${G.asmaul.indexOf(x)}">
              <span class="ah-num">${G.asmaul.indexOf(x) + 1}</span>
              <b class="ah-ar">${esc(x.arabic)}</b>
              <span class="ah-latin">${esc(x.latin)}</span>
              <span class="ah-arti" style="display:none">${esc(x.arti)}</span>
            </button>`).join('') + `</div>
          ${list.length ? '' : '<p class="fun-text" style="text-align:center;margin-top:10px">Ga ketemu 🕌</p>'}`;
        };
        render();
        $('#ahSearch').addEventListener('input', (e) => render(e.target.value.trim().toLowerCase()));
        $('#ahWrap').addEventListener('click', (e) => {
          const c = e.target.closest('.ah-card'); if (!c) return;
          const arti = c.querySelector('.ah-arti');
          const visible = arti.style.display !== 'none';
          $$('.ah-card .ah-arti').forEach((a) => (a.style.display = 'none'));
          if (!visible) arti.style.display = 'block';
        });
      }).catch((e) => { $('#ahWrap').innerHTML = errBox(e.message); });
    },
  },

  /* ===================== BATCH 4.0: AI ZONE 🎨🤖 =========================== */

  /* --------------------------- AI ART MAKER 🎨 ------------------------------ */
  // Port src/scraper/seaart.js fluxImage -> yuulabs flux
  aiart: {
    html: `
      <div class="field"><label>🎨 Prompt gambar <span style="opacity:.6">(inggris/indonesia bebas)</span></label>
        <textarea class="input" id="aiPrompt" rows="2" maxlength="480" placeholder="misal: anak sma nongkrong di angkringan, style cyberpunk neon, ultra detail"></textarea></div>
      <div class="field"><label>📐 Rasio</label>
        <div class="seg" id="aiRatio">
          <button class="active" data-r="1:1">⬛ 1:1</button>
          <button data-r="3:4">📱 3:4</button>
          <button data-r="16:9">🖥️ 16:9</button>
          <button data-r="9:16">🎬 9:16</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-p="kucing astronot melayang di luar angkasa, style realis, detail tinggi">🐱 astronot</span>
        <span class="chip" data-p="gunung bromo sunrise sinematik, photography, moody">🌋 bromo</span>
        <span class="chip" data-p="cute anime girl kucing telinga, pastel, studio ghibli style">🌸 anime</span>
      </div>
      <button class="btn btn-primary" id="aiGo" style="width:100%">✨ Generate</button>
      <div id="aiStage" style="margin-top:14px"></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Butuh 5–20 detik, sabar ya, AI-nya lagi mukjizatin… sabar dikit juga kok 😌✨</p>`,
    mount() {
      let ratio = '1:1';
      $('#aiRatio').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        $$('#aiRatio button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); ratio = b.dataset.r;
      });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#aiPrompt').value = c.dataset.p; }));
      $('#aiGo').addEventListener('click', async () => {
        const prompt = $('#aiPrompt').value.trim();
        if (prompt.length < 4) return toast('Prompt-nya kurang panjang woi 🎨', 'error');
        const btn = $('#aiGo');
        btn.disabled = true; btn.textContent = '🎨 Lagi gambar…';
        $('#aiStage').innerHTML = LOADER_HTML;
        try {
          const d = await api('/ai/image', { prompt, ratio });
          const r = d.result;
          const src = r.image ? `data:${r.mime};base64,${r.image}` : r.url;
          $('#aiStage').innerHTML = `
            <div class="result-box" style="text-align:center">
              <img src="${src}" class="qc-result" alt="AI art" style="max-height:400px"/>
              <p style="font-size:.75rem;color:var(--muted);margin-top:10px">“${esc(prompt)}” · ${esc(r.ratio)} · ${d._ms}ms</p>
              <div class="btn-row" style="margin-top:12px">
                <button class="btn btn-primary" id="aiDl" style="flex:1">💾 Simpan</button>
              </div>
            </div>`;
          $('#aiDl').addEventListener('click', () => {
            if (r.image) { downloadDataUrl(src, 'kyy-ai-art.jpg'); }
            else window.open(r.url, '_blank');
            toast('AI art tersimpan! 🎨');
          });
          toast('Jadi! Gokil sih 🔥');
        } catch (e) {
          $('#aiStage').innerHTML = errBox(e.message + ' (coba lagi ya, AI-nya kadang rebut)');
          toast(e.message, 'error');
        }
        btn.disabled = false; btn.textContent = '✨ Generate';
      });
    },
  },

  /* ----------------------------- SIMI CHAT 🤖 ------------------------------- */
  simi: {
    html: `
      <div class="chat-box" id="chatBox"></div>
      <div class="input-row" style="margin-top:12px">
        <input class="input" id="smIn" placeholder="ketik sesuatu, sok asik aja dulu…" maxlength="250" autocomplete="off"/>
        <button class="btn btn-primary btn-sm" id="smSend">📤</button>
      </div>
      <div class="chip-row" style="margin-top:8px">
        <span class="chip" data-t="halo simi lu siapa">halo simi lu siapa</span>
        <span class="chip" data-t="lu pantesnya jadi juragan ketimun">pantes jadi juragan ketimun</span>
        <span class="chip" data-t="cara move on dari mantan gimana">cara move on gimana</span>
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:8px">Simi kadang rada tolol & julid, maklum aja, dia AI jalanan 😹</p>`,
    mount() {
      const box = $('#chatBox');
      const addBubble = (who, text) => {
        box.insertAdjacentHTML('beforeend', `<div class="chat-msg ${who}">${who === 'me' ? '' : '🤖 '}${esc(text)}</div>`);
        box.scrollTop = box.scrollHeight;
      };
      addBubble('bot', 'Halooo! Gue Simi 🤖 ngomong apa ae, kalo elo nanya gue jawab, tapi ya ngelantur. Gas ngobrol!');
      const send = async () => {
        const text = $('#smIn').value.trim();
        if (!text) return;
        $('#smIn').value = '';
        addBubble('me', text);
        box.insertAdjacentHTML('beforeend', `<div class="chat-msg bot typing" id="smTyping">🤖 ngetik<span class="dots">⋯</span></div>`);
        box.scrollTop = box.scrollHeight;
        try {
          const d = await api('/ai/chat', { text });
          $('#smTyping').remove();
          addBubble('bot', d.reply);
        } catch (e) {
          $('#smTyping').remove();
          addBubble('bot', '⚠️ ' + e.message);
        }
      };
      $('#smSend').addEventListener('click', send);
      $('#smIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#smIn').value = c.dataset.t; send(); }));
    },
  },

  /* --------------------------- AI MATEMATIKA 🧮 ----------------------------- */
  aimath: {
    html: `
      <div class="field"><label>🧮 Tulis soalnya <span style="opacity:.6">(boleh ditanya verbal)</span></label>
        <textarea class="input" id="mathIn" rows="2" maxlength="780" placeholder="misal: Kalau A punya 5 kelereng, dikasih 3x lipat oleh B, tapi hilang 4, sisa berapa?"></textarea></div>
      <div class="chip-row">
        <span class="chip" data-q="turunan dari x^3 + 2x^2 - 5x + 1">turunan polinom</span>
        <span class="chip" data-q="integral dari 2x + 3">🤯 integral</span>
      </div>
      <button class="btn btn-primary" id="mathGo" style="width:100%">🧠 Kerjain</button>
      <div id="mathResult" style="margin-top:14px"></div>`,
    mount() {
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#mathIn').value = c.dataset.q; }));
      $('#mathGo').addEventListener('click', async () => {
        const text = $('#mathIn').value.trim();
        if (!text) return toast('Soalnya tulis dulu 🧮', 'error');
        $('#mathResult').innerHTML = LOADER_HTML;
        try {
          const d = await api('/ai/math', { text });
          const md = String(d.answer)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
            .replace(/\n/g, '<br/>');
          $('#mathResult').innerHTML = `
            <div class="result-box">
              <h4 style="margin-bottom:8px">🧠 Jawaban AI</h4>
              <div class="fun-text" style="line-height:1.9">${md}</div>
              <div class="btn-row" style="margin-top:12px">
                <button class="btn btn-primary" id="mathCopy" style="flex:1">📋 Salin</button>
              </div>
            </div>`;
          $('#mathCopy').addEventListener('click', () => copyText(d.answer));
        } catch (e) {
          $('#mathResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      });
    },
  },

  /* ---------------------------- HARI APA INI 📅 ----------------------------- */
  libur: {
    html: `<div id="lbWrap"><div class="loader-wrap"><div class="loader"></div><p>Intip kalender dulu…</p></div></div>`,
    mount() {
      (async () => {
        try {
          const d = await api('/tools/libur');
          const r = d.result;
          const today = r.hariIni.length
            ? r.hariIni.map((e) => `<div class="gm-card" style="margin-bottom:10px"><p class="gm-type">📅 ${esc(e.date)}</p><h3 class="gm-soal" style="font-size:1.1rem">${esc(e.event)}</h3></div>`).join('')
            : '<p class="fun-text" style="text-align:center">Hari ini hari biasa wkwk, tapi tetep spesial kalo bareng-kamu 🤩</p>';
          $('#lbWrap').innerHTML = `
            <p class="gm-type" style="text-align:center;margin-bottom:10px">🎉 HARI INI</p>
            ${today}
            <p class="gm-type" style="text-align:center;margin:18px 0 10px">🔜 BENTAR LAGI</p>
            ${r.nasional.map((e) => `
              <div class="lb-row">
                <span class="lb-date">${esc(e.date)}</span>
                <span class="lb-event">${esc(e.event)}</span>
                <span class="lb-days">${e.daysUntil !== undefined ? e.daysUntil + ' hari lagi' : ''}</span>
              </div>`).join('')}
            <p style="font-size:.72rem;color:var(--muted);margin-top:14px;text-align:center">Data dari Wikipedia via API nexray — biar ga kaget tanggal merah besok 🙂</p>`;
        } catch (e) {
          $('#lbWrap').innerHTML = errBox(e.message);
        }
      })();
    },
  },

  /* ----------------------------- PP COUPLE 💑 ------------------------------- */
  ppcouple: {
    html: `
      <div class="pp-pair">
        <div class="pp-one" id="ppCowo"><span>🧑</span></div>
        <div class="pp-one" id="ppCewe"><span>🧑‍🦰</span></div>
      </div>
      <button class="btn btn-primary" id="ppNext" style="width:100%">🎲 Pull Couple Baru</button>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" id="ppDlCowo" style="flex:1" disabled>💾 Cowo</button>
        <button class="btn btn-ghost btn-sm" id="ppDlCewe" style="flex:1" disabled>💾 Cewe</button>
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Cocok buat pp WA bareng, dipasang couple #aesthetic 💑</p>`,
    mount() {
      const load = async () => {
        $('#ppNext').disabled = true;
        $('#ppCowo').innerHTML = '<div class="loader"></div>';
        $('#ppCewe').innerHTML = '<div class="loader"></div>';
        try {
          const d = await api('/random/ppcouple');
          const r = d.result;
          const srcOf = (x) => (x.image ? `data:${x.mime};base64,${x.image}` : x.url);
          const sCowo = srcOf(r.cowo), sCewe = srcOf(r.cewe);
          $('#ppCowo').innerHTML = `<img src="${sCowo}" alt="cowo"/>`;
          $('#ppCewe').innerHTML = `<img src="${sCewe}" alt="cewe"/>`;
          $('#ppDlCowo').disabled = false; $('#ppDlCewe').disabled = false;
          $('#ppDlCowo').onclick = () => { r.cowo.image ? downloadDataUrl(sCowo, 'kyy-pp-cowo.jpg') : window.open(r.cowo.url, '_blank'); toast('💾 yang cowo tersimpan'); };
          $('#ppDlCewe').onclick = () => { r.cewe.image ? downloadDataUrl(sCewe, 'kyy-pp-cewe.jpg') : window.open(r.cewe.url, '_blank'); toast('💾 yang cewe tersimpan'); };
        } catch (e) {
          $('#ppCowo').innerHTML = '<span>😭</span>'; $('#ppCewe').innerHTML = '<span>💔</span>';
          toast(e.message, 'error');
        }
        $('#ppNext').disabled = false;
      };
      $('#ppNext').addEventListener('click', load);
      load();
    },
  },

  /* ---------------------------- RANDOM ANIME ✨ ----------------------------- */
  randomanime: {
    html: `
      <div class="brat-stage" style="display:flex;align-items:center;justify-content:center;min-height:200px" id="raStage">
        <div class="loader"></div>
      </div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-primary" id="raNext" style="flex:1">🎲 Gacha Lagi</button>
        <button class="btn btn-ghost" id="raDl" disabled>💾</button>
      </div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:10px">Gacha gambarnya random ya — dapet bagus syukur, jelek ya ulang lagi ✨</p>`,
    mount() {
      let cur = null;
      const roll = async () => {
        $('#raNext').disabled = true; $('#raDl').disabled = true;
        $('#raStage').innerHTML = '<div class="loader"></div>';
        try {
          const d = await api('/random/anime');
          cur = `data:${d.mime};base64,${d.image}`;
          $('#raStage').innerHTML = `<img class="brat-canvas" src="${cur}" alt="anime random" style="max-height:420px;object-fit:contain"/>`;
          $('#raDl').disabled = false;
        } catch (e) {
          $('#raStage').innerHTML = `<p class="fun-text" style="padding:20px;text-align:center">😭 ${esc(e.message)}</p>`;
          toast(e.message, 'error');
        }
        $('#raNext').disabled = false;
      };
      $('#raNext').addEventListener('click', roll);
      $('#raDl').addEventListener('click', () => { if (cur) { downloadDataUrl(cur, 'kyy-anime.jpg'); toast('✨ tersimpan!'); } });
      roll();
    },
  },

  /* ------------------------ BATCH 5.0: REMOVE BG ✂️ ----------------------- */
  // Port src/scraper/removebackground.js (pixelcut, keyless)
  removebg: {
    html: `
      <div class="dz" id="rbDz">
        <div style="font-size:2.2rem">✂️</div>
        <p style="margin:8px 0 4px;font-weight:600">Tap pilih foto</p>
        <p style="font-size:.75rem;color:var(--muted)">foto orang/objek paling jos, maks ~8MB</p>
        <input type="file" id="rbFile" accept="image/png,image/jpeg,image/webp" style="display:none"/>
      </div>
      <div class="dz-preview" id="rbPrev" style="display:none"></div>
      <button class="btn btn-primary" id="rbGo" style="width:100%;margin-top:12px" disabled>✨ Hapus Background</button>
      <div id="rbResult" style="margin-top:14px"></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:8px">Hasil PNG transparan — masukin ke brat/meme biar makin keren 😎</p>`,
    mount() {
      const dz = $('#rbDz'), fi = $('#rbFile'), go = $('#rbGo');
      let file = null;
      const setFile = (f) => {
        if (!f) return;
        if (!/^image\//.test(f.type)) return toast('Itu bukan gambar 🤨', 'error');
        if (f.size > 8 * 1024 * 1024) return toast('Maks 8MB ya ✂️', 'error');
        file = f;
        const r = new FileReader();
        r.onload = () => {
          $('#rbPrev').innerHTML = `<img src="${r.result}" alt="preview"/><span>${esc(f.name)}</span>`;
          $('#rbPrev').style.display = 'flex'; go.disabled = false;
        };
        r.readAsDataURL(f);
      };
      dz.addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => setFile(fi.files[0]));
      dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('over'));
      dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); setFile(e.dataTransfer.files[0]); });
      go.addEventListener('click', async () => {
        if (!file) return;
        $('#rbResult').innerHTML = LOADER_HTML;
        try {
          // resize dulu biar upload cepet (maks 1400px)
          const dataUrl = await new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => {
              const MAX = 1400;
              const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
              const cvs = document.createElement('canvas');
              cvs.width = Math.round(img.naturalWidth * k); cvs.height = Math.round(img.naturalHeight * k);
              cvs.getContext('2d').drawImage(img, 0, 0, cvs.width, cvs.height);
              res(cvs.toDataURL('image/jpeg', 0.92));
            };
            img.onerror = () => rej(new Error('gagal baca gambar'));
            const r = new FileReader(); r.onload = () => (img.src = r.result); r.readAsDataURL(file);
          });
          const d = await api('/tools/removebg', { b64: String(dataUrl).split(',')[1] });
          const src = `data:image/png;base64,${d.image}`;
          $('#rbResult').innerHTML = `
            <div class="brat-stage" style="text-align:center">
              <img src="${src}" class="brat-canvas" style="max-height:340px;object-fit:contain;width:auto;max-width:100%" alt="removebg"/>
            </div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-primary" id="rbDl" style="flex:1">💾 Simpan PNG Transparan</button>
            </div>`;
          $('#rbDl').addEventListener('click', () => { downloadDataUrl(src, 'kyy-nobg.png'); toast('Background udah lenyap! ✂️'); });
          toast('Background udah hilang! ✂️✨');
        } catch (e) {
          $('#rbResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      });
    },
  },

  /* ------------------------------ OCR 📖 ----------------------------------*/
  // Port plugins/tools/ocr.js (tesseract) — jalan 100% di browser
  ocr: {
    html: `
      <div class="dz" id="ocrDz">
        <div style="font-size:2.2rem">📖</div>
        <p style="margin:8px 0 4px;font-weight:600">Tap pilih foto bertulisan</p>
        <p style="font-size:.75rem;color:var(--muted)">screenshot tweet, buku, soal lama… apapun deh</p>
        <input type="file" id="ocrFile" accept="image/png,image/jpeg,image/webp" style="display:none"/>
      </div>
      <div class="dz-preview" id="ocrPrev" style="display:none"></div>
      <button class="btn btn-primary" id="ocrGo" style="width:100%;margin-top:12px" disabled>📖 Baca Teks</button>
      <div class="strength-bar" style="display:none" id="ocrBarWrap"><div class="strength-fill" id="ocrBar" style="width:0%"></div></div>
      <p style="font-size:.72rem;color:var(--muted);display:none;margin-top:6px" id="ocrStat"></p>
      <div id="ocrResult" style="margin-top:14px"></div>
      <p style="font-size:.72rem;color:var(--muted);margin-top:8px">OCR-nya jalan langsung di HP kamu (bukan server), pertama kali butuh download otak AI ±10MB sekali doang 😌</p>`,
    mount() {
      const dz = $('#ocrDz'), fi = $('#ocrFile'), go = $('#ocrGo');
      let file = null;
      const setFile = (f) => {
        if (!f) return;
        if (!/^image\//.test(f.type)) return toast('Itu bukan gambar 🤨', 'error');
        file = f;
        const r = new FileReader();
        r.onload = () => {
          $('#ocrPrev').innerHTML = `<img src="${r.result}" alt="preview"/><span>${esc(f.name)}</span>`;
          $('#ocrPrev').style.display = 'flex'; go.disabled = false;
        };
        r.readAsDataURL(f);
      };
      dz.addEventListener('click', () => fi.click());
      fi.addEventListener('change', () => setFile(fi.files[0]));
      const loadTess = (() => {
        let p = null;
        return () => (p ??= new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          s.onload = () => (window.Tesseract ? res() : rej(new Error('OCR lib gagal dimuat')));
          s.onerror = () => rej(new Error('Gagal download OCR lib — cek kuota/jaringan ya'));
          document.head.appendChild(s);
        }));
      })();
      go.addEventListener('click', async () => {
        if (!file) return;
        go.disabled = true;
        $('#ocrResult').innerHTML = '';
        $('#ocrBarWrap').style.display = 'block';
        $('#ocrStat').style.display = 'block';
        try {
          $('#ocrStat').textContent = 'lagi download otak AI… sabar 😴';
          await loadTess();
          const worker = await Tesseract.createWorker(['eng', 'ind'], 1, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                const k = Math.round((m.progress || 0) * 100);
                $('#ocrBar').style.width = k + '%';
                $('#ocrBar').style.background = 'linear-gradient(90deg,var(--purple),var(--cyan))';
                $('#ocrStat').textContent = `baca tulisan… ${k}%`;
              } else if (m.status) {
                $('#ocrStat').textContent = m.status + '…';
              }
            },
          });
          const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
          const { data } = await worker.recognize(dataUrl);
          await worker.terminate();
          const text = (data.text || '').trim();
          $('#ocrBarWrap').style.display = 'none'; $('#ocrStat').style.display = 'none';
          if (!text) {
            $('#ocrResult').innerHTML = errBox('Ga ada teks yang kebaca 😭 coba foto yang lebih jelas/kontras');
          } else {
            $('#ocrResult').innerHTML = `
              <div class="result-box">
                <h4 style="margin-bottom:10px">📖 Teks hasil baca</h4>
                <div class="lyric-box" style="max-height:280px">${esc(text)}</div>
                <div class="btn-row" style="margin-top:12px">
                  <button class="btn btn-primary" id="ocrCopy" style="flex:1">📋 Salin Teks</button>
                </div>
              </div>`;
            $('#ocrCopy').addEventListener('click', () => copyText(text));
            toast(`Kebaca ${text.split(/\s+/).length} kata! 📖`);
          }
        } catch (e) {
          $('#ocrBarWrap').style.display = 'none'; $('#ocrStat').style.display = 'none';
          $('#ocrResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
        go.disabled = false;
      });
    },
  },

  /* ------------------------ BATCH 6.0: POLISH ✨ ------------------------- */

  /* ------------------------- TANDA TANGAN ✍️ ------------------------------ */
  signpad: {
    html: `
      <div class="field"><label>🖊️ Warna tinta</label>
        <div class="seg" id="spColor"><button class="active" data-c="#0f172a">🖤 Hitam</button><button data-c="#1e63ff">💙 Biru</button><button data-c="#8b5cf6">💜 Ungu</button><button data-c="#ec4899">🩷 Pink</button></div></div>
      <div class="input-row">
        <div class="field" style="flex:1"><label>📏 Ketebelan <span id="spWVal">4px</span></label>
          <input type="range" id="spWidth" min="2" max="12" value="4" style="width:100%"/></div>
        <div class="field" style="flex:1"><label>📄 Kertas</label>
          <div class="seg" id="spBg"><button class="active" data-b="trans">Transparan</button><button data-b="white">Putih</button></div></div>
      </div>
      <div class="sp-stage" id="spStage"><canvas id="spCanvas" width="1024" height="560"></canvas>
        <span class="sp-watermark">✍️ coret di sini — pake jari/pen/stylus</span>
      </div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-ghost btn-sm" id="spUndo" style="flex:1">↩️ Undo</button>
        <button class="btn btn-ghost btn-sm" id="spClear" style="flex:1">🗑️ Hapus</button>
        <button class="btn btn-primary btn-sm" id="spDl" style="flex:1.4">💾 Simpan PNG</button>
      </div>`,
    mount() {
      const cv = $('#spCanvas'), ctx = cv.getContext('2d');
      let color = '#0f172a', width = 4, bgTransparent = true;
      const strokes = []; let cur = null;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      function redraw() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (const s of strokes) {
          ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
          ctx.beginPath();
          const pts = s.pts;
          if (pts.length === 1) {
            ctx.fillStyle = s.color;
            ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, s.width / 2, 0, 7); ctx.fill();
          } else {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
              const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
              ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
          }
        }
      }
      function pos(e) {
        const r = cv.getBoundingClientRect();
        const p = e.touches?.[0] || e;
        return { x: (p.clientX - r.left) * (cv.width / r.width), y: (p.clientY - r.top) * (cv.height / r.height) };
      }
      let drawing = false;
      const start = (e) => { e.preventDefault(); drawing = true; cur = { color, width, pts: [pos(e)] }; strokes.push(cur); redraw(); };
      const move = (e) => { if (!drawing || !cur) return; e.preventDefault(); cur.pts.push(pos(e)); redraw(); };
      const end = () => { drawing = false; cur = null; };
      cv.addEventListener('pointerdown', start);
      cv.addEventListener('pointermove', move);
      addEventListener('pointerup', end);
      cv.addEventListener('touchstart', start, { passive: false });
      cv.addEventListener('touchmove', move, { passive: false });
      cv.addEventListener('touchend', end);

      $('#spColor').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#spColor button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); color = b.dataset.c; });
      $('#spWidth').addEventListener('input', (e) => { width = +e.target.value; $('#spWVal').textContent = width + 'px'; });
      $('#spBg').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return; $$('#spBg button').forEach((x) => x.classList.remove('active')); b.classList.add('active'); bgTransparent = b.dataset.b === 'trans';
        $('#spStage').classList.toggle('checkered', bgTransparent);
      });
      $('#spUndo').addEventListener('click', () => { strokes.pop(); redraw(); });
      $('#spClear').addEventListener('click', () => { strokes.length = 0; redraw(); });
      $('#spDl').addEventListener('click', () => {
        if (!strokes.length) return toast('Tanda tangan dulu wkwk ✍️', 'error');
        const out = document.createElement('canvas');
        out.width = cv.width; out.height = cv.height;
        const octx = out.getContext('2d');
        if (!bgTransparent) { octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, out.width, out.height); }
        octx.drawImage(cv, 0, 0);
        downloadDataUrl(out.toDataURL('image/png'), 'kyy-ttd' + (bgTransparent ? '-transparan' : '') + '.png');
        toast('Tanda tangan tersimpan ✍️🔥');
      });
      $('#spStage').classList.add('checkered');
    },
  },

  /* ----------------------------- CEK CUACA 🌤️ ----------------------------- */
  cuaca: {
    html: `
      <div class="field"><label>🌤️ Kotamu</label>
        <div class="input-row">
          <input class="input" id="cwIn" placeholder="misal: Pati, Jakarta, Tokyo…" spellcheck="false"/>
          <button class="btn btn-primary btn-sm" id="cwGo">🔎 Cek</button>
        </div></div>
      <div class="chip-row">
        <span class="chip" data-q="Pati">🧢 Pati</span>
        <span class="chip" data-q="Jakarta">🌆 Jakarta</span>
        <span class="chip" data-q="Bandung">⛰️ Bandung</span>
        <span class="chip" data-q="Bali">🌴 Bali</span>
      </div>
      <div id="cwResult"></div>`,
    mount() {
      const run = async (q) => {
        if (!q) return toast('Isi kotanya dong 🌤️', 'error');
        $('#cwResult').innerHTML = LOADER_HTML;
        try {
          const d = await api(`/tools/cuaca?kota=${encodeURIComponent(q)}`);
          const r = d.result;
          $('#cwResult').innerHTML = `
            <div class="result-box cw-hero">
              <div class="cw-main">
                <div class="cw-icon">${r.icon}</div>
                <div>
                  <div class="cw-temp">${r.suhu}°C</div>
                  <div class="cw-desc">terasa ${r.feels}°C · ${esc(r.desc)}</div>
                  <div class="cw-loc">📍 ${esc(r.kota)}</div>
                </div>
              </div>
              <div class="wordstat-grid" style="margin-top:14px">
                <div class="wordstat"><b>💧 ${r.humidity}%</b><span>Kelembapan</span></div>
                <div class="wordstat"><b>💨 ${r.wind}</b><span>Km/jam angin</span></div>
                <div class="wordstat"><b>🌡️ ${r.minC}–${r.maxC}°</b><span>Min–Max hari ini</span></div>
              </div>
            </div>
            ${r.besok ? `
            <div class="result-box" style="margin-top:10px;text-align:center">
              <p style="font-size:.8rem;color:var(--muted)">🔮 Besok: ${r.besok.icon} ${esc(r.besok.desc)}, ${r.besok.minC}–${r.besok.maxC}°C</p>
            </div>` : ''}`;
          toast(`Cuaca ${r.icon} di ${q}!`);
        } catch (e) {
          $('#cwResult').innerHTML = errBox(e.message);
          toast(e.message, 'error');
        }
      };
      $('#cwGo').addEventListener('click', () => run($('#cwIn').value.trim()));
      $('#cwIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') run($('#cwIn').value.trim()); });
      $$('.chip', $('#modalBody')).forEach((c) => c.addEventListener('click', () => { $('#cwIn').value = c.dataset.q; run(c.dataset.q); }));
      run('Pati');
    },
  },

  /* --------------------------- KALKULATOR UMUR 🎂 -------------------------- */
  umur: {
    html: `
      <div class="field"><label>🎂 Tanggal lahir</label>
        <input class="input" type="date" id="umDate" style="color-scheme:dark"/></div>
      <button class="btn btn-primary" id="umGo" style="width:100%">✨ Hitung</button>
      <div id="umResult" style="margin-top:14px"></div>`,
    mount() {
      const SIGNS = [
        ['capricorn', '♑', 119], ['aquarius', '♒', 218], ['pisces', '♓', 320], ['aries', '♈', 420],
        ['taurus', '♉', 521], ['gemini', '♊', 621], ['cancer', '♋', 723], ['leo', '♌', 823],
        ['virgo', '♍', 923], ['libra', '♎', 1023], ['scorpio', '♏', 1122], ['sagitarius', '♐', 1222], ['capricorn', '♑', 1232],
      ];
      const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
      $('#umGo').addEventListener('click', () => {
        const v = $('#umDate').value;
        if (!v) return toast('Isi tanggal lahirnya dulu 🎂', 'error');
        const b = new Date(v + 'T00:00:00');
        if (isNaN(b) || b > new Date()) return toast('Tanggalnya aneh, yakin beneran? 😹', 'error');
        const now = new Date();
        let Y = now.getFullYear() - b.getFullYear();
        let M = now.getMonth() - b.getMonth();
        let D = now.getDate() - b.getDate();
        if (D < 0) { M--; const pm = new Date(now.getFullYear(), now.getMonth(), 0); D += pm.getDate(); }
        if (M < 0) { Y--; M += 12; }
        const totalDays = Math.floor((now - b) / 86400000);
        const totalHours = Math.floor((now - b) / 3600000);
        const mmdd = (b.getMonth() + 1) * 100 + b.getDate();
        const z = SIGNS.find(([,, mx]) => mmdd <= mx) || ['capricorn', '♑'];
        const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
        if (next <= now) next.setFullYear(now.getFullYear() + 1);
        const toBday = Math.round((next - now) / 86400000);
        const FUN = [1, 'wow', 1200];
        $('#umResult').innerHTML = `
          <div class="result-box" style="text-align:center">
            <div class="pick-display" style="font-size:2.4rem">${Y} tahun</div>
            <p style="color:var(--muted);margin:-6px 0 14px">${M} bulan ${D} hari · lahir hari <b>${HARI[b.getDay()]}</b></p>
            <div class="wordstat-grid">
              <div class="wordstat"><b>${totalDays.toLocaleString('id-ID')}</b><span>hari hidup</span></div>
              <div class="wordstat"><b>${totalHours.toLocaleString('id-ID')}</b><span>jam hidup</span></div>
              <div class="wordstat"><b>${z[1]} ${z[0]}</b><span>zodiak</span></div>
            </div>
            <div class="gm-msg info" style="margin-top:14px">🎉 ${toBday === 0 ? 'MET ULTAH HARI INI WOI 🥳🎂 tiup yaa' : `Ultahmu <b>${toBday} hari</b> lagi`} ${toBday <= 1 ? '— SANGKUTIN STIKER GRATIS! 😹' : ''}</div>
            <div class="btn-row" style="margin-top:12px">
              <button class="btn btn-primary" id="umZod" style="flex:1">${z[1]} Cek ramalan ${z[0]}</button>
            </div>
          </div>`;
        $('#umZod').addEventListener('click', () => openTool('zodiak'));
        toast('Udah tua sana, makin umur makin dewasa yak 🫵😹');
      });
    },
  },

  /* ------------------------------- VAULT --------------------------------- */
  vault: {
    html: `<div id="vlInner"></div>`,
    mount() {
      const render = () => {
        const v = vaultGet();
        $('#vlInner').innerHTML = v.length
          ? `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px">
            <span style="font-size:.82rem;color:var(--muted)">${v.length} item tersimpan offline</span>
            <button class="btn btn-ghost btn-sm" id="vlClear">🧹 Bersihin</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:9px">
            ${v.map((it) => `
              <a class="dl-item" href="${esc(it.url || '#')}" target="_blank" rel="noopener noreferrer">
                <span class="dl-ico">${PLATFORM_EMOJI[it.platform] || '⬇️'}</span>
                <span class="dl-info">
                  <span class="dl-type">${esc(it.title || 'Media')}</span><br/>
                  <span class="dl-q">${esc(it.platform || '?')} · ${timeAgo(it.at)}</span>
                </span>
                <span class="dl-arrow">↗</span>
              </a>`).join('')}
          </div>
          <p style="font-size:.72rem;color:var(--muted);margin-top:12px">📍 Jujur ya — ini disimpen di browser kamu sendiri (maks 30 item), bukan di server. Ga ada yang ngintip.</p>`
          : `<div class="empty-state" style="padding:44px 0"><span>🗃️</span><p>Belum ada riwayat. Cobain download sesuatu dulu!</p></div>`;
        $('#vlClear')?.addEventListener('click', () => {
          localStorage.removeItem(VAULT_KEY); render(); toast('Riwayat dibersihin 🧹');
        });
      };
      render();
    },
  },

  /* ======================= V3.0 — TOOLS BARU ======================= */

  // 🏆 Top Anime (Jikan / MyAnimeList)
  animetop: {
    html: `
      <p style="font-size:.8rem;color:var(--muted)">Data langsung dari database anime terbesar (MyAnimeList). Pilih mode:</p>
      <div class="mode-pills" id="atPills">
        <button class="active" data-mode="top">🏆 Top Sepanjang Masa</button>
        <button data-mode="now">📡 Lagi Tayang Musim Ini</button>
      </div>
      <div id="atGrid"></div>`,
    mount() {
      const grid = $('#atGrid');
      let mode = 'top';
      const load = async () => {
        grid.innerHTML = LOADER_HTML;
        try {
          const url = mode === 'top'
            ? 'https://api.jikan.moe/v4/top/anime?limit=24'
            : 'https://api.jikan.moe/v4/seasons/now?limit=24&sfw=true';
          const res = await fetch(url);
          if (!res.ok) throw new Error('server anime lagi sibuk');
          const { data } = await res.json();
          if (!Array.isArray(data) || !data.length) throw new Error('datanya kosong');
          grid.innerHTML = `<div class="an-grid">` + data.map((a, i) => `
            <a class="an-card" href="${esc(a.url || '#')}" target="_blank" rel="noopener noreferrer">
              <img src="${esc(a.images?.jpg?.image_url || '')}" loading="lazy" alt="${esc(a.title || '')}" />
              <div class="an-info">
                <b>${esc(a.title || '?')}</b>
                <span>⭐ ${a.score ?? '?'} · ${esc(a.type || '?')}${a.episodes ? ` · ${a.episodes} eps` : ''}</span>
              </div>
              <span class="an-rank">#${mode === 'top' ? (a.rank ?? i + 1) : i + 1}</span>
            </a>`).join('') + `</div>`;
        } catch (e) {
          grid.innerHTML = errBox(`Anime-nya lagi susah dihubungin 😭 (${e.message}) coba lagi bentar ya`);
        }
      };
      $('#atPills').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-mode]');
        if (!b) return;
        $$('#atPills button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        mode = b.dataset.mode;
        load();
      });
      load();
    },
  },

  // ⚡ Pokédex (PokeAPI)
  pokedex: {
    html: `
      <div class="field">
        <label>🔍 Nama / Nomor Pokémon</label>
        <div class="input-row">
          <input class="input" id="pxIn" placeholder="mis: pikachu / 25 / charizard…" spellcheck="false" />
          <button class="btn btn-primary btn-sm" id="pxGo">Cari</button>
          <button class="btn btn-ghost btn-sm" id="pxRnd" title="Random">🎲</button>
        </div>
      </div>
      <div id="pxOut"></div>`,
    mount() {
      const TYPES = {
        normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
        grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
        ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
        rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
        steel: '#B7B7CE', fairy: '#D685AD',
      };
      const load = async (q) => {
        const out = $('#pxOut');
        out.innerHTML = LOADER_HTML;
        try {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(String(q).toLowerCase().trim())}`);
          if (res.status === 404) throw new Error('Pokémon-nya ga ketemu 😭 coba nama/nomor lain');
          if (!res.ok) throw new Error('Pokédex lagi error, coba lagi');
          const p = await res.json();
          const img = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
          const stats = Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat]));
          const bar = (k, label, color) => {
            const v = stats[k] || 0;
            return `<div class="px-stat"><span>${label}</span><div class="px-bar"><i style="width:${Math.min(100, Math.round(v / 255 * 100))}%;background:${color}"></i></div><b>${v}</b></div>`;
          };
          out.innerHTML = `
            <div class="px-card">
              <div class="px-head">
                <img src="${esc(img)}" alt="${esc(p.name)}" class="px-img" />
                <div>
                  <div class="px-id">#${String(p.id).padStart(4, '0')}</div>
                  <h3 class="px-name">${esc(p.name)}</h3>
                  <div class="px-types">${p.types.map((t) => `<i style="background:${TYPES[t.type.name] || '#888'}">${esc(t.type.name)}</i>`).join('')}</div>
                  <div class="px-meta">📏 ${(p.height / 10).toFixed(1)} m &nbsp;·&nbsp; ⚖️ ${(p.weight / 10).toFixed(1)} kg</div>
                  <div class="px-meta">✨ ${p.abilities.map((a) => esc(a.ability.name.replace(/-/g, ' '))).join(' · ')}</div>
                </div>
              </div>
              <div class="px-stats">
                ${bar('hp', '❤️ HP', '#f87171')}
                ${bar('attack', '⚔️ ATK', '#fb923c')}
                ${bar('defense', '🛡️ DEF', '#facc15')}
                ${bar('special-attack', '🔮 SpA', '#a855f7')}
                ${bar('special-defense', '💠 SpD', '#22d3ee')}
                ${bar('speed', '💨 SPD', '#34d399')}
              </div>
            </div>`;
        } catch (e) { out.innerHTML = errBox(e.message); }
      };
      $('#pxGo').addEventListener('click', () => {
        const v = $('#pxIn').value.trim();
        if (!v) return toast('Isi nama/nomor dulu 😤', 'error');
        load(v);
      });
      $('#pxIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#pxGo').click(); });
      $('#pxRnd').addEventListener('click', () => {
        const id = 1 + Math.floor(Math.random() * 1025);
        $('#pxIn').value = id;
        load(id);
      });
    },
  },

  // 🌍 Info Negara (REST Countries)
  negara: {
    html: `
      <div class="field">
        <label>🌍 Cari Negara (bahasa Inggris ya)</label>
        <div class="input-row">
          <input class="input" id="ngIn" placeholder="mis: Indonesia, Japan, Brazil…" spellcheck="false" />
          <button class="btn btn-primary btn-sm" id="ngGo">Cari</button>
          <button class="btn btn-ghost btn-sm" id="ngRnd" title="Random">🎲</button>
        </div>
      </div>
      <div id="ngOut"></div>`,
    mount() {
      const RND = ['Indonesia', 'Japan', 'South Korea', 'Brazil', 'France', 'Egypt', 'Canada', 'Mexico', 'Italy', 'Thailand', 'Vietnam', 'India', 'Turkey', 'Germany', 'Spain', 'Argentina', 'Nigeria', 'Australia', 'Netherlands', 'Sweden', 'Norway', 'Poland', 'Portugal', 'Greece', 'Switzerland', 'Saudi Arabia', 'Qatar', 'Morocco', 'Chile', 'Colombia', 'Peru', 'Ukraine', 'China', 'United States', 'United Kingdom', 'New Zealand', 'South Africa', 'Singapore', 'Malaysia', 'Philippines', 'Iceland', 'Finland', 'Ireland', 'Czechia', 'Croatia', 'Hungary', 'Romania', 'Denmark', 'Belgium', 'Kenya', 'Ghana', 'Ethiopia', 'Nepal', 'Mongolia', 'Kazakhstan', 'Cuba', 'Jamaica', 'Fiji', 'Maldives', 'Brunei', 'Madagascar', 'Pakistan', 'Bangladesh'];
      const row = (label, val) => `<div class="ng-row"><span>${label}</span><b>${val}</b></div>`;
      const load = async (q) => {
        const out = $('#ngOut');
        out.innerHTML = LOADER_HTML;
        try {
          const res = await fetch(`https://countries.dev/name/${encodeURIComponent(q)}`);
          if (res.status === 404) throw new Error('Negaranya ga ketemu 🗺️ coba nama lain (pake bahasa Inggris)');
          if (!res.ok) throw new Error('Server dunianya lagi sibuk, coba lagi');
          const arr = await res.json();
          if (!Array.isArray(arr) || !arr.length) throw new Error('Negaranya ga ketemu 🗺️');
          out.innerHTML = arr.slice(0, 6).map((c) => {
            const cur = (c.currencies || []).map((x) => `${esc(x.name)}${x.symbol ? ` (${esc(x.symbol)})` : ''}`).join(', ') || '—';
            const lang = (c.languages || []).map((x) => esc(x.name)).join(', ') || '—';
            const maps = Array.isArray(c.latlng) && c.latlng.length === 2
              ? `<a href="https://www.google.com/maps?q=${c.latlng[0]},${c.latlng[1]}" target="_blank" rel="noopener noreferrer">Buka di Google Maps ↗</a>` : '—';
            return `
              <div class="ng-card">
                <div class="ng-head">
                  <img src="${esc(c.flags?.png || '')}" alt="Bendera ${esc(c.name || '')}" loading="lazy" />
                  <div>
                    <h3>${c.flag || '🏳️'} ${esc(c.name || '?')}</h3>
                    <small>${esc(c.nativeName || c.demonym || '')}</small>
                  </div>
                </div>
                <div class="ng-rows">
                  ${row('🏛️ Ibukota', esc(c.capital) || '—')}
                  ${row('👥 Populasi', (c.population || 0).toLocaleString('id-ID') + ' jiwa')}
                  ${row('🗺️ Wilayah', `${esc(c.region || '—')}${c.subregion ? ` · ${esc(c.subregion)}` : ''}`)}
                  ${row('📐 Luas', c.area ? c.area.toLocaleString('id-ID') + ' km²' : '—')}
                  ${row('💰 Mata Uang', cur)}
                  ${row('🗣️ Bahasa', lang)}
                  ${row('🕐 Zona Waktu', `${(c.timezones || []).length} zona (${esc((c.timezones || [])[0] || '—')})`) 
                  }
                  ${row('📍 Peta', maps)}
                </div>
              </div>`;
          }).join('');
        } catch (e) { out.innerHTML = errBox(e.message); }
      };
      $('#ngGo').addEventListener('click', () => {
        const v = $('#ngIn').value.trim();
        if (!v) return toast('Isi nama negara dulu 😤', 'error');
        load(v);
      });
      $('#ngIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#ngGo').click(); });
      $('#ngRnd').addEventListener('click', () => {
        const v = RND[(Math.random() * RND.length) | 0];
        $('#ngIn').value = v;
        load(v);
      });
    },
  },

  // 🐱 Anime Random+ (nekos.best)
  nekopic: {
    html: `
      <p style="font-size:.8rem;color:var(--muted)">Bedanya sama Random Anime biasa: bisa pilih kategori — ada waifu, neko, sampe gif interaksi 🤭</p>
      <div class="mode-pills" id="nkPills"></div>
      <div class="nk-stage" id="nkStage">
        <div class="nk-cap">Pilih kategori atau langsung pencet 🔀 Acak 👇</div>
      </div>
      <button class="btn btn-primary w-full" id="nkGo" style="margin-top:12px">🔀 Acak Gambar</button>`,
    mount() {
      const CATS = [
        ['waifu', '💃 Waifu'], ['neko', '🐱 Neko'], ['kitsune', '🦊 Kitsune'], ['husbando', '🤵 Husbando'],
        ['pat', '👋 Pat'], ['hug', '🤗 Hug'], ['slap', '🖐️ Slap'], ['smug', '😏 Smug'],
        ['dance', '🕺 Dance'], ['cry', '😭 Cry'], ['wink', '😉 Wink'], ['happy', '😄 Happy'],
      ];
      let cat = 'waifu';
      $('#nkPills').innerHTML = CATS.map(([id, label]) =>
        `<button data-cat="${id}" class="${id === cat ? 'active' : ''}">${label}</button>`).join('');
      const load = async () => {
        const st = $('#nkStage');
        st.innerHTML = LOADER_HTML;
        try {
          const res = await fetch(`https://nekos.best/api/v2/${cat}`);
          if (!res.ok) throw new Error('kucingnya kabur');
          const d = await res.json();
          const r = d?.results?.[0];
          if (!r?.url) throw new Error('gambarnya kosong');
          const cap = [r.anime_name ? `📺 ${esc(r.anime_name)}` : null,
            r.artist_name ? `🎨 ${r.artist_href ? `<a href="${esc(r.artist_href)}" target="_blank" rel="noopener noreferrer">${esc(r.artist_name)}</a>` : esc(r.artist_name)}` : null]
            .filter(Boolean).join(' · ') || '✨ sumber: nekos.best';
          st.innerHTML = `<img src="${esc(r.url)}" alt="${esc(cat)}" /><div class="nk-cap">${cap}</div>`;
        } catch (e) {
          st.innerHTML = `<div class="nk-cap" style="padding:30px 14px">❌ Gagal narik gambar (${esc(e.message)}) — pencet acak lagi aja</div>`;
        }
      };
      $('#nkPills').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-cat]');
        if (!b) return;
        $$('#nkPills button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        cat = b.dataset.cat;
        load();
      });
      $('#nkGo').addEventListener('click', load);
      load();
    },
  },

  // 🧠 Kuis Trivia (Open Trivia DB)
  trivia: {
    html: `
      <div id="tvWrap">
        <p style="font-size:.8rem;color:var(--muted)">10 soal pilihan ganda dari bank soal dunia. Jawab cepet & bener, jangan nyerah di tengah 😤</p>
        <div class="tv-setup" style="margin-top:12px">
          <div class="field" style="margin:0">
            <label>📚 Kategori</label>
            <select class="input" id="tvCat">
              <option value="0">🎲 Acak Semua</option>
              <option value="9">📖 Pengetahuan Umum</option>
              <option value="11">🎬 Film</option>
              <option value="12">🎵 Musik</option>
              <option value="15">🎮 Video Game</option>
              <option value="17">🔬 Sains & Alam</option>
              <option value="18">💻 Komputer</option>
              <option value="31" selected>🎌 Anime & Manga</option>
              <option value="21">⚽ Olahraga</option>
              <option value="23">📜 Sejarah</option>
            </select>
          </div>
          <div class="field" style="margin:0">
            <label>🌶️ Level</label>
            <div class="mode-pills" id="tvDiff" style="margin:0">
              <button class="active" data-d="">🎲 Bebas</button>
              <button data-d="easy">😴 Gampang</button>
              <button data-d="medium">🙂 Sedang</button>
              <button data-d="hard">😈 Susah</button>
            </div>
          </div>
          <button class="btn btn-primary w-full" id="tvStart">⚡ Mulai Kuis</button>
        </div>
      </div>`,
    mount() {
      const wrap = $('#tvWrap');
      const dec = (s) => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
      let qs = [], idx = 0, score = 0, diff = '', curCat = 31;
      $('#tvDiff').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-d]');
        if (!b) return;
        $$('#tvDiff button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        diff = b.dataset.d;
      });
      const askQ = () => {
        const q = qs[idx];
        const opts = [...q.incorrect_answers, q.correct_answer]
          .map((a) => ({ t: dec(a), ok: a === q.correct_answer }))
          .sort(() => Math.random() - .5);
        wrap.innerHTML = `
          <div class="tv-progress"><span>Soal <b>${idx + 1}/10</b></span><span>⭐ Skor: <b>${score}</b></span></div>
          <div class="tv-q">${dec(q.question)}</div>
          <div class="tv-opts">${opts.map((o, i) => `<button class="tv-opt" data-ok="${o.ok ? 1 : 0}"><b>${'ABCD'[i]}.</b> ${esc(o.t)}</button>`).join('')}</div>`;
        let locked = false;
        wrap.querySelectorAll('.tv-opt').forEach((btn) => btn.addEventListener('click', () => {
          if (locked) return;
          locked = true;
          const benar = btn.dataset.ok === '1';
          if (benar) score++;
          wrap.querySelectorAll('.tv-opt').forEach((b) => {
            b.disabled = true;
            if (b.dataset.ok === '1') b.classList.add('ok');
          });
          if (!benar) btn.classList.add('bad');
          setTimeout(() => { idx++; idx < qs.length ? askQ() : finish(); }, 950);
        }));
      };
      const finish = () => {
        const pesan = score >= 9 ? 'GILA KAMU JENIUS 🧠🔥' : score >= 7 ? 'Pro player kuis nih 😎' : score >= 5 ? 'Lumayan, tinggal diasah dikit 💪' : score >= 3 ? 'wkwk masih anget 😭' : 'YAAMPUN… main lagi sampe bisa 😭🙏';
        wrap.innerHTML = `
          <div class="tv-done">
            <div class="tv-score">${score}/10</div>
            <p style="margin:8px 0 18px">${pesan}</p>
            <button class="btn btn-primary w-full" id="tvAgain">🔁 Main Lagi (soal baru)</button>
          </div>`;
        $('#tvAgain').addEventListener('click', start);
      };
      const start = async () => {
        wrap.innerHTML = LOADER_HTML;
        try {
          const catEl = $('#tvCat');
          if (catEl) curCat = +catEl.value || 0;
          let url = 'https://opentdb.com/api.php?amount=10&type=multiple';
          if (curCat) url += `&category=${curCat}`;
          if (diff) url += `&difficulty=${diff}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('server soal ngambek');
          const d = await res.json();
          if (d.response_code !== 0 || !d.results?.length) throw new Error('stok soal kombinasi ini abis — ganti kategori/level ya');
          qs = d.results; idx = 0; score = 0;
          askQ();
        } catch (e) {
          wrap.innerHTML = errBox(e.message) + `<button class="btn btn-ghost w-full" id="tvBack" style="margin-top:10px">⬅️ Balik ke pengaturan</button>`;
          $('#tvBack').addEventListener('click', () => openTool('trivia'));
        }
      };
      // simpan pilihan level antar-restart via closure aman; tombol start
      const origStart = start;
      $('#tvStart').addEventListener('click', origStart);
    },
  },

  // 🐍 Arcade Zone (Snake + Tes Refleks — 100% offline)
  arcade: {
    html: `
      <div class="ac-tabs">
        <button class="active" data-g="snake">🐍 Snake</button>
        <button data-g="react">⚡ Tes Refleks</button>
      </div>
      <div id="acStage" class="snake-wrap"></div>`,
    mount() {
      const stage = $('#acStage');
      // polyfill roundRect buat browser jadul
      if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); return this; };
      }
      /* -------- game 1: SNAKE -------- */
      const snakeGame = () => {
        const HS_KEY = 'kyy_snake_hs';
        const N = 18, CELL = 20, SIZE = N * CELL;
        stage.innerHTML = `
          <canvas id="snCv" width="${SIZE}" height="${SIZE}"></canvas>
          <div class="snake-hud"><span>SKOR <b id="snScore">0</b></span><span>TERBAIK <b id="snHs">${+localStorage.getItem(HS_KEY) || 0}</b></span></div>
          <button class="btn btn-primary btn-sm" id="snStart">▶️ Mulai</button>
          <div class="snake-dpad">
            <span></span><button class="ac-btn" data-d="up">⬆️</button><span></span>
            <button class="ac-btn" data-d="left">⬅️</button><button class="ac-btn" data-d="down">⬇️</button><button class="ac-btn" data-d="right">➡️</button>
          </div>
          <p style="font-size:.7rem;color:var(--muted);margin-top:8px">Geser/swipe di kotak atau pake tombol panah ⌨️</p>`;
        const cv = $('#snCv'), ctx = cv.getContext('2d');
        let snake, dir, pend, food, score, speed, timer = null, alive = false;
        const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const setDir = (d) => {
          const [x, y] = DIRS[d] || [0, 0];
          if (x === -dir[0] && y === -dir[1]) return; // ga boleh balik badan
          pend = [x, y];
        };
        const placeFood = () => {
          do {
            food = [(Math.random() * N) | 0, (Math.random() * N) | 0];
          } while (snake.some(([x, y]) => x === food[0] && y === food[1]));
        };
        const draw = () => {
          ctx.fillStyle = '#070a18';
          ctx.fillRect(0, 0, SIZE, SIZE);
          ctx.strokeStyle = 'rgba(255,255,255,.04)';
          for (let i = 1; i < N; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
          }
          // makanan (apel glow)
          ctx.font = '15px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = '#f87171'; ctx.shadowBlur = 12;
          ctx.fillText('🍎', food[0] * CELL + CELL / 2, food[1] * CELL + CELL / 2 + 1);
          ctx.shadowBlur = 0;
          // badan ular (gradien per segmen)
          snake.forEach(([x, y], i) => {
            const t = i / Math.max(1, snake.length);
            ctx.fillStyle = i === 0 ? '#a855f7' : `hsl(${190 + t * 70}, 85%, ${62 - t * 14}%)`;
            const pad = i === 0 ? 1 : 1.5;
            ctx.beginPath();
            ctx.roundRect(x * CELL + pad, y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 6);
            ctx.fill();
          });
          // mata
          const [hx, hy] = snake[0];
          ctx.fillStyle = '#0b0e1d';
          ctx.beginPath(); ctx.arc(hx * CELL + 7, hy * CELL + 8, 2.2, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(hx * CELL + 13, hy * CELL + 8, 2.2, 0, 7); ctx.fill();
        };
        const gameOver = () => {
          alive = false;
          clearTimeout(timer); timer = null;
          const hs = +localStorage.getItem(HS_KEY) || 0;
          if (score > hs) { localStorage.setItem(HS_KEY, score); $('#snHs').textContent = score; }
          ctx.fillStyle = 'rgba(5,6,15,.82)';
          ctx.fillRect(0, 0, SIZE, SIZE);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '700 24px Poppins, sans-serif'; ctx.fillStyle = '#f87171';
          ctx.fillText('GAME OVER 💀', SIZE / 2, SIZE / 2 - 22);
          ctx.font = '600 15px Poppins, sans-serif'; ctx.fillStyle = '#e8ecf8';
          ctx.fillText(`Skor kamu: ${score}${score > 0 && score >= hs ? ' — REKOR BARU! 🏆' : ''}`, SIZE / 2, SIZE / 2 + 8);
          ctx.font = '12px Poppins, sans-serif'; ctx.fillStyle = '#9aa3c0';
          ctx.fillText('pencet ▶️ Mulai buat bales dendam', SIZE / 2, SIZE / 2 + 36);
          $('#snStart').textContent = '🔁 Main Lagi';
        };
        const step = () => {
          if (!alive) return;
          if (!document.body.contains(cv)) { alive = false; return; } // modal ke-close
          dir = pend;
          const [hx, hy] = snake[0];
          const nx = hx + dir[0], ny = hy + dir[1];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N || snake.some(([x, y]) => x === nx && y === ny)) return gameOver();
          snake.unshift([nx, ny]);
          if (nx === food[0] && ny === food[1]) {
            score++; $('#snScore').textContent = score;
            if (speed > 62) speed -= 3;
            placeFood();
          } else snake.pop();
          draw();
          timer = setTimeout(step, speed);
        };
        const start = () => {
          clearTimeout(timer);
          snake = [[8, 9], [7, 9], [6, 9]];
          dir = pend = DIRS.right;
          score = 0; speed = 135; alive = true;
          $('#snScore').textContent = '0';
          placeFood(); draw();
          timer = setTimeout(step, speed);
        };
        // layar pembuka
        ctx.fillStyle = '#070a18'; ctx.fillRect(0, 0, SIZE, SIZE);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '44px serif'; ctx.fillText('🐍', SIZE / 2, SIZE / 2 - 26);
        ctx.font = '700 18px Poppins, sans-serif'; ctx.fillStyle = '#e8ecf8';
        ctx.fillText('SNAKE KYY', SIZE / 2, SIZE / 2 + 14);
        ctx.font = '12px Poppins, sans-serif'; ctx.fillStyle = '#9aa3c0';
        ctx.fillText('pencet ▶️ Mulai — jangan gigit badan sendiri', SIZE / 2, SIZE / 2 + 40);
        $('#snStart').addEventListener('click', start);
        stage.querySelectorAll('.ac-btn').forEach((b) => {
          b.addEventListener('click', () => setDir(b.dataset.d));
          b.addEventListener('touchstart', (e) => { e.preventDefault(); setDir(b.dataset.d); }, { passive: false });
        });
        // swipe di canvas
        let tx = 0, ty = 0;
        cv.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
        cv.addEventListener('touchmove', (e) => {
          const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
          if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
          setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          tx = e.touches[0].clientX; ty = e.touches[0].clientY;
          e.preventDefault();
        }, { passive: false });
        // keyboard (selama modal kebuka)
        const keyH = (e) => {
          if (!document.body.contains(cv)) { removeEventListener('keydown', keyH); return; }
          const map = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
          if (map[e.key]) { e.preventDefault(); setDir(map[e.key]); }
        };
        addEventListener('keydown', keyH);
      };
      /* -------- game 2: TES REFLEKS -------- */
      const reactGame = () => {
        const BEST_KEY = 'kyy_rx_best';
        stage.innerHTML = `
          <div class="rx-box" id="rxBox">
            <span style="font-size:2rem">⚡</span>
            <span>Tes Refleks</span>
            <small>Klik kotak ini, tunggu sampe HIJAU, terus klik secepatnya. Kalo keburu = gagal wkwk</small>
          </div>
          <div class="rx-log" id="rxLog">rekor terbaikmu: ${(+localStorage.getItem(BEST_KEY)) ? localStorage.getItem(BEST_KEY) + ' ms 🏆' : 'belum ada'}</div>`;
        const box = $('#rxBox'), log = $('#rxLog');
        let state = 'idle', t0 = 0, tout = null, tries = [];
        const komentar = (ms) => ms < 200 ? 'KECEPATAN CAHAYA 🤯' : ms < 260 ? 'kilat banget ⚡' : ms < 330 ? 'cepet juga 😎' : ms < 450 ? 'lumayan lah 👍' : 'ketiduran ya? 😴';
        box.addEventListener('click', () => {
          if (state === 'idle' || state === 'done') {
            state = 'wait';
            box.className = 'rx-box wait';
            box.innerHTML = `<span style="font-size:2rem">✋</span><span>Tunggu warna HIJAU…</span><small>jangan keburu diklik, nanti gagal</small>`;
            tout = setTimeout(() => {
              state = 'go'; t0 = performance.now();
              box.className = 'rx-box go';
              box.innerHTML = `<span style="font-size:2rem">💚</span><span style="font-size:1.3rem">KLIK SEKARANG!!!</span>`;
            }, 1400 + Math.random() * 2400);
          } else if (state === 'wait') {
            clearTimeout(tout);
            state = 'done';
            box.className = 'rx-box';
            box.innerHTML = `<span style="font-size:2rem">😂</span><span>Keburu wkwk 🤏</span><small>kalem bang… klik lagi buat coba ulang</small>`;
          } else if (state === 'go') {
            const ms = Math.round(performance.now() - t0);
            state = 'done';
            tries.push(ms); tries = tries.slice(-5);
            const best = +localStorage.getItem(BEST_KEY) || Infinity;
            if (ms < best) localStorage.setItem(BEST_KEY, ms);
            const avg = Math.round(tries.reduce((a, b) => a + b, 0) / tries.length);
            box.className = 'rx-box';
            box.innerHTML = `<div class="rx-ms grad-text">${ms} ms</div><span>${komentar(ms)}</span><small>klik lagi buat lanjut</small>`;
            log.innerHTML = `5 terakhir: ${tries.join(', ')} ms · rata2: ${avg} ms · rekor: <b style="color:var(--green)">${localStorage.getItem(BEST_KEY)} ms 🏆</b>`;
          }
        });
      };
      $$('.ac-tabs button').forEach((b) => b.addEventListener('click', () => {
        $$('.ac-tabs button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        (b.dataset.g === 'snake' ? snakeGame : reactGame)();
      }));
      snakeGame();
    },
  },

  // 🎁 Game Gratisan (FreeToGame)
  freegames: {
    html: `
      <p style="font-size:.8rem;color:var(--muted)">Kumpulan game yang <b>beneran gratis & legal</b> — tinggal klik langsung main. Bukan bajakan, bukan tipu-tipu.</p>
      <div class="mode-pills" id="fgPills" style="margin-top:12px"></div>
      <div id="fgGrid"></div>`,
    mount() {
      const grid = $('#fgGrid'), pills = $('#fgPills');
      let data = [];
      const render = (genre) => {
        const list = data.filter((g) => genre === 'Semua' || g.genre === genre);
        grid.innerHTML = `<div class="fg-grid">` + list.slice(0, 24).map((g) => `
          <a class="fg-card" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">
            <img src="${esc(g.thumb)}" loading="lazy" alt="${esc(g.title)}" />
            <div class="fg-body">
              <b>${esc(g.title)}</b>
              <span class="fg-meta">${/Windows/i.test(g.platform) ? '💻' : ''}${/Web/i.test(g.platform) ? '🌐' : ''} ${esc(g.genre || '')} · ${esc(g.publisher || '')}</span>
              <p>${esc(g.desc || '')}</p>
              <span class="fg-btn">🎮 Main Gratis ↗</span>
            </div>
          </a>`).join('') + `</div>`;
      };
      const load = async () => {
        grid.innerHTML = LOADER_HTML;
        try {
          const d = await api('/games/free');
          data = d.result || [];
          if (!data.length) throw new Error('listnya kosong');
          const genres = ['Semua', ...new Set(data.map((g) => g.genre).filter(Boolean))].slice(0, 8);
          pills.innerHTML = genres.map((g, i) => `<button data-g="${esc(g)}" class="${i === 0 ? 'active' : ''}">${esc(g)}</button>`).join('');
          render('Semua');
        } catch (e) {
          grid.innerHTML = errBox(`Gagal narik daftar game 😭 (${e.message}) — coba buka lagi nanti`);
        }
      };
      pills.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-g]');
        if (!b) return;
        $$('#fgPills button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        render(b.dataset.g);
      });
      load();
    },
  },

  // 🔍 HD Foto — upscale & pertajam 100% di browser (rahasia terjaga, ga di-upload)
  hdphoto: {
    html: `
      <p style="font-size:.8rem;color:var(--muted)">Foto dibesarin & dipertajam <b>langsung di HP kamu</b> — ga dikirim ke mana-mana, aman buat foto pribadi 🔒</p>
      <div class="hd-drop" id="hdDrop" style="margin-top:10px">
        <span class="dz-ico">🖼️</span>
        <b>Ketuk buat pilih foto</b>
        <small>jpg / png / webp — foto kecil & buram paling kerasa efeknya</small>
      </div>
      <input type="file" id="hdFile" accept="image/*" hidden />
      <div id="hdCtl" hidden>
        <div class="field" style="margin-top:14px"><label>🔍 Upscale</label>
          <div class="mode-pills" id="hdScale" style="margin:0">
            <button data-s="2" class="active">2× aman</button>
            <button data-s="3">3×</button>
            <button data-s="4">4× brutal</button>
          </div>
        </div>
        <div class="field"><label>✨ Preset</label>
          <div class="mode-pills" id="hdPreset" style="margin:0">
            <button data-p="auto" class="active">⚙️ Auto HD</button>
            <button data-p="anime">🎌 Anime</button>
            <button data-p="doc">📄 Dokumen</button>
            <button data-p="soft">🌸 Soft</button>
          </div>
        </div>
        <button class="btn btn-primary w-full" id="hdGo">⚡ Proses HD-in</button>
        <div class="hd-meta" id="hdMeta"></div>
        <div class="hd-compare" id="hdCmp" hidden>
          <img class="hd-res" id="hdRes" alt="Hasil HD" />
          <img class="hd-orig" id="hdOrig" alt="Asli" />
          <span class="hd-holdhint">tahan buat bandingin 👆</span>
        </div>
        <button class="btn btn-primary w-full" id="hdDl" hidden style="margin-top:12px">💾 Download Hasil (JPG)</button>
      </div>`,
    mount() {
      const PRESETS = {
        auto:  { sharp: .55, sat: 1.16, con: 1.07, br: 1.0 },
        anime: { sharp: .20, sat: 1.32, con: 1.02, br: 1.01 },
        doc:   { sharp: .85, sat: 1.0,  con: 1.18, br: 1.0 },
        soft:  { sharp: .32, sat: 1.10, con: .99,  br: 1.02 },
      };
      const MAX_OUT = 2400; // sisi terpanjang output biar HP ga meledak
      let img = null, srcUrl = null, scale = 2, preset = 'auto', busy = false, lastDataUrl = null;
      const tick = () => new Promise((r) => requestAnimationFrame(r));
      const drop = $('#hdDrop');

      $('#hdFile').addEventListener('change', () => {
        const f = $('#hdFile').files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) return toast('Itu bukan gambar 😭', 'error');
        if (srcUrl) URL.revokeObjectURL(srcUrl);
        srcUrl = URL.createObjectURL(f);
        const im = new Image();
        im.onload = () => {
          img = im;
          $('#hdCtl').hidden = false;
          $('#hdCmp').hidden = true;
          $('#hdDl').hidden = true;
          $('#hdMeta').innerHTML = `foto asli: <b>${im.naturalWidth}×${im.naturalHeight}px</b> — gas diproses 👇`;
          drop.querySelector('b').textContent = '🔄 Ganti foto lain';
        };
        im.onerror = () => toast('Gambarnya ga kebaca 😭', 'error');
        im.src = srcUrl;
      });
      drop.addEventListener('click', () => $('#hdFile').click());

      $('#hdScale').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-s]'); if (!b) return;
        $$('#hdScale button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); scale = +b.dataset.s;
      });
      $('#hdPreset').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-p]'); if (!b) return;
        $$('#hdPreset button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active'); preset = b.dataset.p;
      });

      $('#hdGo').addEventListener('click', async () => {
        if (!img || busy) return;
        busy = true;
        const btn = $('#hdGo');
        btn.textContent = '⏳ Lagi diproses…';
        const t0 = performance.now();
        try {
          const w0 = img.naturalWidth, h0 = img.naturalHeight;
          const real = Math.min(scale, MAX_OUT / Math.max(w0, h0));
          if (real < 1.05) throw new Error('fotonya udah gede banget 😅 coba yang lebih kecil buat di-HD-in');
          const cw = Math.round(w0 * real), ch = Math.round(h0 * real);
          const cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          const ctx = cv.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, cw, ch);
          const P = PRESETS[preset];
          const id = ctx.getImageData(0, 0, cw, ch);
          const d = id.data;
          // PASS 1: vibrance & kontras (per pixel, di-chunk biar UI ga ngelag)
          await (async () => {
            for (let y = 0; y < ch; y++) {
              let i = y * cw * 4;
              for (let x = 0; x < cw; x++, i += 4) {
                for (let c = 0; c < 3; c++) {
                  let v = d[i + c] / 255;
                  v = (v - .5) * P.con + .5;
                  d[i + c] = v * 255;
                }
                const l = d[i] * .2126 + d[i + 1] * .7152 + d[i + 2] * .0722;
                d[i]     = l + (d[i]     - l) * P.sat;
                d[i + 1] = l + (d[i + 1] - l) * P.sat;
                d[i + 2] = l + (d[i + 2] - l) * P.sat;
                if (P.br !== 1) { d[i] *= P.br; d[i + 1] *= P.br; d[i + 2] *= P.br; }
              }
              if (y % 40 === 39) await tick();
            }
          })();
          // PASS 2: unsharp sharpening (dari copy, kernel 3x3)
          if (P.sharp > 0.01) {
            const src = new Uint8ClampedArray(d);
            const a = P.sharp;
            for (let y = 1; y < ch - 1; y++) {
              let i = (y * cw + 1) * 4;
              for (let x = 1; x < cw - 1; x++, i += 4) {
                for (let c = 0; c < 3; c++) {
                  const sum = src[i + c] * (1 + 4 * a)
                    - a * (src[i - 4 + c] + src[i + 4 + c] + src[i - cw * 4 + c] + src[i + cw * 4 + c]);
                  d[i + c] = sum;
                }
              }
              if (y % 40 === 39) await tick();
            }
          }
          ctx.putImageData(id, 0, 0);
          lastDataUrl = cv.toDataURL('image/jpeg', .92);
          $('#hdRes').src = lastDataUrl;
          $('#hdOrig').src = srcUrl;
          $('#hdCmp').hidden = false;
          $('#hdDl').hidden = false;
          const dt = ((performance.now() - t0) / 1000).toFixed(1);
          $('#hdMeta').innerHTML = `${w0}×${h0} → <b>${cw}×${ch}px</b> (${real.toFixed(1)}×) · preset ${preset} · ${dt}dtk${real < scale ? ' · ⚠️ kecilin dikit biar HP aman' : ''}`;
          $('#hdCmp').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          toast('Jadi deh, makin HD! 🔍✨');
        } catch (e) {
          toast(e.message, 'error');
          $('#hdMeta').textContent = '❌ ' + e.message;
        }
        btn.textContent = '⚡ Proses HD-in';
        busy = false;
      });

      // tahan buat bandingin sebelum/sesudah
      const cmp = $('#hdCmp');
      const holdOn = (e) => { e.preventDefault(); cmp.classList.add('hold'); };
      const holdOff = () => cmp.classList.remove('hold');
      cmp.addEventListener('mousedown', holdOn);
      cmp.addEventListener('touchstart', holdOn, { passive: false });
      addEventListener('mouseup', holdOff);
      addEventListener('touchend', holdOff);

      $('#hdDl').addEventListener('click', () => {
        if (!lastDataUrl) return;
        downloadDataUrl(lastDataUrl, 'kyy-hd.jpg');
        toast('Foto HD tersimpan! 🔍');
      });
    },
  },
};

/* ============================================================================
   🌌 V3.0 — ANIMASI MASUK, REVEAL & SCROLL PROGRESS
   ========================================================================== */

// 🎬 intro loading: bar jalan -> wipe ke atas -> hero muncul
(() => {
  const el = $('#intro');
  if (!el) { document.body.classList.add('loaded'); document.body.classList.remove('intro-lock'); return; }
  const fill = $('#introFill'), pct = $('#introPct');
  let done = false;
  const MIN = matchMedia('(prefers-reduced-motion: reduce)').matches ? 450 : 2100;
  const t0 = performance.now();
  function finish() {
    if (done) return;
    done = true;
    fill.style.width = '100%';
    pct.textContent = '100%';
    el.classList.add('out');
    document.body.classList.add('loaded');
    document.body.classList.remove('intro-lock');
    setTimeout(() => el.remove(), 1050);
  }
  (function step() {
    const p = Math.min(1, (performance.now() - t0) / MIN);
    fill.style.width = (p * 100).toFixed(1) + '%';
    pct.textContent = Math.floor(p * 100) + '%';
    if (p < 1) requestAnimationFrame(step);
    else finish();
  })();
  el.addEventListener('click', finish);
  // safety: kalo ada apa-apa, 6 detik paksa kebuka
  setTimeout(finish, 6000);
})();

// 👀 reveal on scroll (elemen .rv muncul pas ke-scroll)
(() => {
  const els = $$('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach((x) => x.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: .1, rootMargin: '0px 0px -6% 0px' });
  els.forEach((x) => io.observe(x));
})();

// 📶 progress bar atas ngikutin scroll
(() => {
  const bar = $('#scrollProgress');
  if (!bar) return;
  const upd = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`;
  };
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd, { passive: true });
  upd();
})();
