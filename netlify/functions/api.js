/**
 * ============================================================================
 * ⚡ ALL TOOLS KYY — Serverless API (Netlify Functions)
 * Developer : Rifkyy sensei
 * ----------------------------------------------------------------------------
 * Semua route /api/* ditangani di sini.
 *
 * Scraper downloader di-PORT dari bot WhatsApp "NEW OURIN EDIT GWE":
 *   - src/scraper/aio.js      -> pola detectPlatform() + router + fallback
 *   - src/scraper/tiktok.js   -> TikTok (tikwm.com API + musicaldown + yuulabs)
 *   - src/scraper/ig.js       -> Instagram (fastdl.app HMAC signature)
 *   - src/scraper/ytdl.js     -> YouTube (ymcdn convert flow)
 *   - src/scraper/fbdown.js   -> pola wrapper API publik sederhana
 * ============================================================================
 */

const axios = require('axios');
const crypto = require('crypto');
const QRCode = require('qrcode');
const cheerio = require('cheerio');

/* ============================== KONFIGURASI =============================== */

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const AXIOS_OPTS = { timeout: 25000, maxRedirects: 5 };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

/* ================================ HELPERS ================================= */

const ok = (payload, statusCode = 200) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ status: true, ...payload }),
});

const fail = (message, statusCode = 400) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify({ status: false, error: message }),
});

function parseBody(event) {
  try {
    if (!event.body) return {};
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readParams(event) {
  const out = {};
  const m = (event.rawUrl || event.path || '').match(/\?(.*)$/);
  if (m) { try { new URLSearchParams(m[1]).forEach((v, k) => { out[k] = v; }); } catch { /* abaikan */ } }
  Object.assign(out, event.queryStringParameters || {});
  return out;
}

function isValidHttpUrl(str) {
  if (!str || typeof str !== 'string' || str.length > 2000) return false;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getClientIp(event) {
  const h = event.headers || {};
  const pick = (k) => h[k] || h[k.toLowerCase()];
  return (
    pick('x-nf-client-connection-ip') ||
    (pick('x-forwarded-for') || '').split(',')[0].trim() ||
    pick('client-ip') ||
    '127.0.0.1'
  );
}

/* ------------------------- Rate limiter sederhana ------------------------- */
const rateBuckets = new Map();
function rateLimit(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const b = rateBuckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > b.reset) {
    b.count = 0;
    b.reset = now + windowMs;
  }
  b.count += 1;
  rateBuckets.set(key, b);
  if (rateBuckets.size > 2000) rateBuckets.clear();
  return b.count <= limit;
}

/* ==================== PLATFORM DETECT (PORT dari aio.js) ================== */

const PLATFORM_DETECT = [
  { key: 'instagram', patterns: ['instagram.com', 'instagr.am'] },
  { key: 'youtube', patterns: ['youtube.com', 'youtu.be'] },
  { key: 'tiktok', patterns: ['tiktok.com', 'vt.tiktok.com', 'vm.tiktok.com'] },
  { key: 'facebook', patterns: ['facebook.com', 'fb.watch', 'fb.com'] },
  { key: 'pinterest', patterns: ['pinterest.com', 'pin.it'] },
  { key: 'twitter', patterns: ['twitter.com', 'x.com'] },
  { key: 'threads', patterns: ['threads.net'] },
  { key: 'reddit', patterns: ['reddit.com'] },
];

function detectPlatform(url) {
  const lower = (url || '').toLowerCase();
  for (const p of PLATFORM_DETECT) {
    if (p.patterns.some((pat) => lower.includes(pat))) return p.key;
  }
  return null;
}

/* ==================== TIKTOK (PORT dari tiktok.js/aio.js) =================
 * Sumber utama : tikwm.com/api  (no watermark + HD + MP3)  <- dari aio.js
 * Fallback 1   : musicaldown.com (scraping form + cheerio) <- dari tiktok.js
 * Fallback 2   : yuulabs API    (wrapper API publik)       <- dari tiktok.js
 * ========================================================================== */

// tikwm kadang mengembalikan path relatif "/video/..." -> jadikan absolut
const asTikwmUrl = (u) =>
  !u ? null : u.startsWith('http') ? u : 'https://www.tikwm.com' + (u.startsWith('/') ? u : '/' + u);

async function tiktokFromTikwm(url) {
  const { data } = await axios.post(
    'https://www.tikwm.com/api/',
    {},
    {
      ...AXIOS_OPTS,
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Origin: 'https://www.tikwm.com',
        Referer: 'https://www.tikwm.com/',
        'User-Agent': UA_ANDROID,
        'X-Requested-With': 'XMLHttpRequest',
      },
      params: { url, count: 12, cursor: 0, web: 1, hd: 1 },
    }
  );

  const res = data?.data;
  if (!res) throw new Error('tikwm tidak mengembalikan data');

  const media = [];
  if (res.duration === 0 && Array.isArray(res.images) && res.images.length) {
    res.images.forEach((v) => media.push({ type: 'image', url: asTikwmUrl(v) }));
  } else {
    if (res.hdplay) media.push({ type: 'video', quality: 'HD', url: asTikwmUrl(res.hdplay) });
    if (res.play) media.push({ type: 'video', quality: 'NoWM', url: asTikwmUrl(res.play) });
    if (res.wmplay) media.push({ type: 'video', quality: 'WM', url: asTikwmUrl(res.wmplay) });
  }
  if (res.music) media.push({ type: 'audio', quality: 'MP3', url: asTikwmUrl(res.music) });
  if (!media.length) throw new Error('tikwm: tidak ada media');

  return {
    platform: 'tiktok',
    source: 'tikwm',
    title: res.title || 'TikTok Video',
    author: res.author?.nickname || res.author?.unique_id || null,
    duration: res.duration || 0,
    thumbnail: asTikwmUrl(res.cover),
    stats: {
      plays: res.play_count || 0,
      likes: res.digg_count || 0,
      comments: res.comment_count || 0,
      shares: res.share_count || 0,
    },
    media,
  };
}

async function tiktokFromMusicaldown(url) {
  const client = axios.create(AXIOS_OPTS);
  const { data: html, headers } = await client.get('https://musicaldown.com/en', {
    headers: { 'user-agent': UA_ANDROID },
  });
  const $ = cheerio.load(html);

  const payload = {};
  $('#submit-form input').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value');
    if (name) payload[name] = value || '';
  });
  const urlField = Object.keys(payload).find((k) => !payload[k]);
  if (urlField) payload[urlField] = url;

  const cookieHeader = Array.isArray(headers['set-cookie'])
    ? headers['set-cookie'].map((c) => c.split(';')[0]).join('; ')
    : '';

  const { data } = await client.post(
    'https://musicaldown.com/download',
    new URLSearchParams(payload).toString(),
    {
      headers: {
        'user-agent': UA_ANDROID,
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        cookie: cookieHeader,
        origin: 'https://musicaldown.com',
        referer: 'https://musicaldown.com/',
      },
    }
  );

  const $$ = cheerio.load(data);
  const media = [];
  $$('a.download').each((_, el) => {
    const e = $$(el);
    const href = e.attr('href');
    if (!href) return;
    let type = String(e.data('event') || '').replace('_download_click', '');
    const isAudio = /mp3|music|audio/i.test(type + ' ' + e.text());
    media.push({
      type: isAudio ? 'audio' : 'video',
      quality: type || e.text().trim(),
      label: e.text().trim(),
      url: href,
    });
  });
  if (!media.length) throw new Error('musicaldown: tidak ada media');

  const style = $$('.video-header').attr('style') || '';
  const cover = style.match(/url\((.*?)\)/)?.[1] || null;

  return {
    platform: 'tiktok',
    source: 'musicaldown',
    title: $$('.video-desc').text().trim() || 'TikTok Video',
    author: $$('.video-author b').text().trim() || null,
    duration: 0,
    thumbnail: cover,
    stats: null,
    media,
  };
}

async function tiktokFromYuulabs(url) {
  const { data } = await axios.get(
    `https://api.yuulabs.web.id/api/downloader/tiktok?url=${encodeURIComponent(url)}`,
    { ...AXIOS_OPTS, headers: { 'user-agent': UA_ANDROID } }
  );
  if (!data?.status || !data?.result) throw new Error('yuulabs: response invalid');
  const r = data.result;
  const media = [];
  if (r.hdVideo) media.push({ type: 'video', quality: 'HD', url: r.hdVideo });
  if (r.videoUrl) media.push({ type: 'video', quality: 'NoWM', url: r.videoUrl });
  if (r.audioUrl) media.push({ type: 'audio', quality: 'MP3', url: r.audioUrl });
  if (!media.length) throw new Error('yuulabs: tidak ada media');
  return {
    platform: 'tiktok',
    source: 'yuulabs',
    title: r.description || 'TikTok Video',
    author: r.author || null,
    duration: 0,
    thumbnail: null,
    stats: null,
    media,
  };
}

async function handleTiktok(url) {
  const errors = [];
  for (const fn of [tiktokFromTikwm, tiktokFromMusicaldown, tiktokFromYuulabs]) {
    try {
      return await fn(url);
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error('Semua sumber TikTok gagal: ' + errors.join(' | '));
}

/* ==================== INSTAGRAM (PORT dari ig.js) =========================
 * fastdl.app dengan signature HMAC-SHA256 (reverse-engineer API privat).
 * Alur: ambil cookie -> ambil server time (/msec) -> ts = msec*1000 - 450
 *       -> sign = HMAC_SHA256(cleanUrl + ts, secretKeyHex) -> POST /api/convert
 * Fallback : savefbs.com (pola fallback dari aio.js)
 * ========================================================================== */

const FASTDL = {
  secretKeyHex:
    '34ac9a1aa6aaa7d69a7075611898f16a85d496b1d8f1c7aaa5640a2d93d7af80',
  appVersionTS: '1770240123231',
  userAgent:
    'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.7559.109 Mobile Safari/537.36',
};

async function instagramFromFastdl(igUrl) {
  const isStory = igUrl.includes('/stories/');
  let cleanUrl = igUrl.split('?')[0];
  if (!cleanUrl.endsWith('/')) cleanUrl += '/';

  const homeRes = await axios.get('https://fastdl.app/id', {
    ...AXIOS_OPTS,
    headers: { 'User-Agent': FASTDL.userAgent },
  });
  const cookieStr = (homeRes.headers['set-cookie'] || [])
    .map((c) => c.split(';')[0])
    .join('; ');

  const msecRes = await axios.get('https://fastdl.app/msec', {
    ...AXIOS_OPTS,
    headers: { 'User-Agent': FASTDL.userAgent, Cookie: cookieStr },
  });
  const serverTime = Math.floor(Number(msecRes.data.msec) * 1000);
  const ts = serverTime - 450;

  const signatureSource = isStory
    ? JSON.stringify({ url: cleanUrl }) + ts
    : cleanUrl + ts;
  const signature = crypto
    .createHmac('sha256', Buffer.from(FASTDL.secretKeyHex, 'hex'))
    .update(signatureSource)
    .digest('hex');

  let response;
  if (isStory) {
    response = await axios.post(
      'https://api-wh.fastdl.app/api/v1/instagram/story',
      { url: cleanUrl, ts, _ts: FASTDL.appVersionTS, _tsc: 0, _sv: 2, _s: signature },
      {
        ...AXIOS_OPTS,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': FASTDL.userAgent,
          Origin: 'https://fastdl.app',
          Referer: 'https://fastdl.app/id/story-saver',
          Cookie: cookieStr,
        },
      }
    );
  } else {
    const params = new URLSearchParams();
    params.append('sf_url', cleanUrl);
    params.append('ts', String(ts));
    params.append('_ts', FASTDL.appVersionTS);
    params.append('_tsc', '0');
    params.append('_sv', '2');
    params.append('_s', signature);
    response = await axios.post(
      'https://api-wh.fastdl.app/api/convert',
      params.toString(),
      {
        ...AXIOS_OPTS,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': FASTDL.userAgent,
          Origin: 'https://fastdl.app',
          Referer: 'https://fastdl.app/id',
          Cookie: cookieStr,
        },
      }
    );
  }

  const data = response.data;
  const media = [];

  if (isStory && Array.isArray(data?.result) && data.result[0]) {
    const r = data.result[0];
    if (r.video_versions?.length)
      media.push({ type: 'video', url: r.video_versions[0].url_wrapped || r.video_versions[0].url });
    else if (r.image_versions2?.candidates?.length)
      media.push({
        type: 'image',
        url: r.image_versions2.candidates[0].url_wrapped || r.image_versions2.candidates[0].url,
      });
    if (!media.length) throw new Error('fastdl(story): tidak ada media');
    return {
      platform: 'instagram',
      source: 'fastdl',
      title: `Story @${r.user?.username || 'instagram'}`,
      author: r.user?.username || null,
      thumbnail: r.user?.profile_pic_url || null,
      media,
    };
  }

  const items = Array.isArray(data) ? data : data ? [data] : [];
  for (const item of items) {
    if (item?.url?.length) {
      media.push({ type: item.url[0].type === 'image' ? 'image' : 'video', url: item.url[0].url });
    } else if (item?.hd || item?.sd) {
      media.push({ type: 'video', quality: item.hd ? 'HD' : 'SD', url: item.hd || item.sd });
    }
  }
  if (!media.length) throw new Error('fastdl: tidak ada media');

  const first = items[0] || {};
  const meta = first.meta || {};
  return {
    platform: 'instagram',
    source: 'fastdl',
    title: meta.title || 'Instagram Media',
    author: meta.username || null,
    thumbnail: first.thumb || null,
    stats: { likes: meta.like_count || 0, comments: meta.comment_count || 0 },
    media,
  };
}

/* --------- Fallback universal: savefbs.com (PORT pola aio.js) ------------
 * Versi struktur 2026: /html kini langsung mengembalikan link unduhan
 * <a href="https://dl.tiktokio.com/download?token=...">Download (720p)</a>
 * (Parser lama dua-langkah format/token sudah usang -> disesuaikan.)
 * ========================================================================== */

const SAVEFBS_HEADERS = {
  accept: '*/*',
  'content-type': 'application/json',
  referer: 'https://savefbs.com/all-in-one-video-downloader/',
  'user-agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
};

async function downloadFromSavefbs(url, preferAudio = false) {
  const { data } = await axios.post(
    'https://savefbs.com/api/v1/aio/html',
    { vid: url, prefix: 'savefbs.com', ex: '', format: '' },
    { ...AXIOS_OPTS, headers: SAVEFBS_HEADERS }
  );
  const html = typeof data === 'string' ? data : JSON.stringify(data);
  const $ = cheerio.load(html);

  const title = $('h3.text-sm').first().text().trim() || $('h3').first().text().trim();

  // Kumpulkan semua link unduhan langsung (dedupe per URL)
  const media = [];
  const seen = new Set();
  $('a[href*="download?token="]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || seen.has(href)) return;
    seen.add(href);
    const label = $(el).text().trim();
    const isAudio = /mp3|audio/i.test(label) || /sf=\.mp3/.test(href);
    const quality =
      label.replace(/^download/i, '').replace(/[()]/g, '').trim() ||
      (isAudio ? 'MP3' : 'original');
    media.push({ type: isAudio ? 'audio' : 'video', quality, url: href });
  });
  if (!media.length) throw new Error('savefbs: tidak ada link unduhan');

  // Urutkan: default video dulu, audio terakhir (kecuali preferAudio)
  const rank = (m) => (m.type === 'audio' ? (preferAudio ? 0 : 1) : preferAudio ? 1 : 0);
  media.sort((a, b) => rank(a) - rank(b));

  return {
    platform: detectPlatform(url) || 'savefbs',
    source: 'savefbs',
    title: title || 'Downloaded Media',
    author: null,
    thumbnail: null,
    media,
  };
}

/* -------- Sumber IG tambahan (wrapper API publik, pola fbdown.js) -------- */

function sniffMediaType(u) {
  try {
    const m = String(u).match(/token=([^&]+)/);
    if (m) {
      const decoded = Buffer.from(decodeURIComponent(m[1]), 'base64').toString('utf8');
      if (/\.mp4|\.mov|video/i.test(decoded)) return 'video';
      if (/\.jpe?g|\.png|\.webp|\.heic/i.test(decoded)) return 'image';
    }
  } catch {}
  if (/\.jpe?g|\.png|\.webp/i.test(String(u))) return 'image';
  return 'video';
}

async function instagramFromYuulabs(igUrl) {
  const { data } = await axios.get(
    `https://api.yuulabs.web.id/api/downloader/instagram?url=${encodeURIComponent(igUrl)}`,
    { ...AXIOS_OPTS, headers: { 'user-agent': UA_ANDROID } }
  );
  const r = data?.result;
  if (!r?.status || !Array.isArray(r.medias) || !r.medias.length)
    throw new Error('yuulabs: tidak ada media');
  return {
    platform: 'instagram',
    source: 'yuulabs',
    title: (r.title || 'Instagram Media').split('\n')[0].slice(0, 120),
    author: r.owner || null,
    thumbnail: r.thumbnail || null,
    media: r.medias.map((u) => ({ type: sniffMediaType(u), url: u })),
  };
}

async function instagramFromAzbry(igUrl) {
  const { data } = await axios.get(
    `https://api.azbry.com/api/download/instagram?url=${encodeURIComponent(igUrl)}`,
    { ...AXIOS_OPTS, headers: { 'user-agent': UA_ANDROID } }
  );
  if (!data?.status) throw new Error(data?.message || 'azbry: status false');
  const urls = data.videos || data.images || (data.url ? [data.url] : []);
  if (!urls.length) throw new Error('azbry: tidak ada media');
  return {
    platform: 'instagram',
    source: 'azbry',
    title: data.title || 'Instagram Media',
    author: null,
    thumbnail: data.thumb || null,
    media: urls.map((u) => ({ type: data.type === 'video' ? 'video' : sniffMediaType(u), url: u })),
  };
}

async function handleInstagram(url) {
  const errors = [];
  const sources = [
    instagramFromYuulabs,
    instagramFromAzbry,
    () => instagramFromFastdl(url),
    () => downloadFromSavefbs(url),
  ];
  for (const fn of sources) {
    try {
      const out = await fn(url);
      if (out?.media?.length) return out;
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error('Semua sumber Instagram gagal: ' + errors.join(' | '));
}

/* ==================== YOUTUBE (PORT dari ytdl.js) =========================
 * Alur ymcdn: /api/v1/init -> convertURL -> poll progressURL -> downloadURL
 * Metadata   : YouTube oEmbed (title/author/thumbnail)
 * Fallback   : savefbs.com
 * ========================================================================== */

const YT_ID_REGEX =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;

function extractVideoId(url) {
  return String(url || '').match(YT_ID_REGEX)?.[1] || null;
}

async function ytMetadata(url, videoId) {
  try {
    const { data } = await axios.get('https://www.youtube.com/oembed', {
      ...AXIOS_OPTS,
      params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
    });
    return {
      title: data.title || 'YouTube Video',
      author: data.author_name || null,
      thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return {
      title: 'YouTube Video',
      author: null,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

async function ytConvertYmcdn(videoId, format) {
  const client = axios.create({
    timeout: 55000,
    headers: { 'User-Agent': UA_ANDROID, Referer: 'https://id.ytmp3.mobi/' },
  });

  const { data: init } = await client.get('https://d.ymcdn.org/api/v1/init', {
    params: { p: 'y', 23: '1llum1n471', _: Math.random() },
  });
  if (!init?.convertURL) throw new Error('ymcdn: init gagal');

  const { data: convert } = await client.get(init.convertURL, {
    params: { v: videoId, f: format, _: Math.random() },
  });
  if (!convert?.progressURL || !convert?.downloadURL)
    throw new Error('ymcdn: konversi gagal');

  let progress = 0;
  let title = convert.title || '';
  let attempts = 0;
  const maxAttempts = 15;
  while (progress < 3 && attempts < maxAttempts) {
    const { data } = await client.get(convert.progressURL);
    if ((data?.error || 0) > 0) throw new Error(`ymcdn: error server ${data.error}`);
    progress = Number(data?.progress || 0);
    title = data?.title || title;
    if (progress < 3) {
      attempts += 1;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return { title, download: convert.downloadURL, format };
}

async function handleYoutube(url) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('URL YouTube tidak valid / ID tidak ditemukan');

  const meta = await ytMetadata(url, videoId);

  // Coba mp4 & mp3 paralel (pola aio.js handleYoutube, tapi fail-safe)
  const [mp4, mp3] = await Promise.allSettled([
    ytConvertYmcdn(videoId, 'mp4'),
    ytConvertYmcdn(videoId, 'mp3'),
  ]);

  const media = [];
  if (mp4.status === 'fulfilled' && mp4.value?.download)
    media.push({ type: 'video', quality: 'MP4', url: mp4.value.download });
  if (mp3.status === 'fulfilled' && mp3.value?.download)
    media.push({ type: 'audio', quality: 'MP3', url: mp3.value.download });

  // Fallback sumber cadangan (pola aio.js) bila ymcdn gagal total
  if (!media.length) {
    try {
      const v = await downloadFromSavefbs(url, false);
      media.push(...v.media);
      try {
        const a = await downloadFromSavefbs(url, true);
        if (a.media[0]?.type === 'audio') media.push(...a.media);
      } catch {}
    } catch (e) {
      throw new Error('Semua sumber YouTube gagal: ' + e.message);
    }
  }

  return {
    platform: 'youtube',
    source: media.length ? 'ymcdn/savefbs' : 'ymcdn',
    title: (mp4.status === 'fulfilled' && mp4.value?.title) || meta.title,
    author: meta.author,
    thumbnail: meta.thumbnail,
    videoId,
    media,
  };
}

/* ==================== AIO ROUTER (PORT pola aio.js) ======================= */

async function handleAio(url) {
  const platform = detectPlatform(url);
  if (!platform) throw new Error('Platform tidak dikenali / belum didukung');

  const handlers = {
    tiktok: () => handleTiktok(url),
    instagram: () => handleInstagram(url),
    youtube: () => handleYoutube(url),
  };

  if (handlers[platform]) return handlers[platform]();

  // platform lain (facebook/twitter/threads/reddit/pinterest) -> savefbs
  try {
    return await downloadFromSavefbs(url);
  } catch (e) {
    throw new Error(`Gagal memproses ${platform}: ${e.message}`);
  }
}

/* ============================ TOOLS: MORSE ================================ */

const MORSE_MAP = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', "'": '.----.',
  '"': '.-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '/': '-..-.', '=': '-...-', '+': '.-.-.', '-': '-....-',
  _: '..--.-', '@': '.--.-.', $: '...-..-',
};
const MORSE_REVERSE = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([k, v]) => [v, k])
);

function morseEncode(text) {
  return String(text)
    .toUpperCase()
    .split(' ')
    .map((word) =>
      word
        .split('')
        .map((ch) => MORSE_MAP[ch] || '')
        .filter(Boolean)
        .join(' ')
    )
    .join(' / ');
}

function morseDecode(code) {
  return String(code)
    .split(/\s+\/\s+/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((c) => MORSE_REVERSE[c] || '')
        .join('')
    )
    .join(' ');
}

/* ========================= TOOLS: PASSWORD ================================ */

function securePick(chars, length) {
  const bytes = crypto.randomBytes(length * 4);
  const out = [];
  const max = 256 - (256 % chars.length); // anti modulo bias
  let i = 0;
  while (out.length < length) {
    if (i >= bytes.length) return out.join('');
    const b = bytes[i++];
    if (b < max) out.push(chars[b % chars.length]);
  }
  return out.join('');
}

function generatePassword({ length, upper, lower, numbers, symbols }) {
  let charset = '';
  if (lower) charset += 'abcdefghijklmnopqrstuvwxyz';
  if (upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers) charset += '0123456789';
  if (symbols) charset += '!@#$%^&*()-_=+[]{};:,.<>?';
  if (!charset) throw new Error('Pilih minimal 1 jenis karakter');

  // Pastikan tiap kategori terpilih hadir minimal 1x
  let password = securePick(charset, length);

  const entropy = length * Math.log2(charset.length);
  let strength, score;
  if (entropy < 40) { strength = 'Sangat Lemah'; score = 1; }
  else if (entropy < 60) { strength = 'Lemah'; score = 2; }
  else if (entropy < 80) { strength = 'Sedang'; score = 3; }
  else if (entropy < 110) { strength = 'Kuat'; score = 4; }
  else { strength = 'Sangat Kuat 💪'; score = 5; }

  return { password, entropy: Math.round(entropy), strength, score, charsetSize: charset.length };
}

/* ========================= TOOLS: CALCULATOR ==============================
 * Evaluasi ekspresi AMAN — whitelist karakter + recursive descent parser.
 * Operator: + - * / % (modulo), kurung (), unary minus, desimal.
 * ========================================================================== */

function safeEvaluate(expr) {
  if (typeof expr !== 'string' || !expr.trim()) throw new Error('Ekspresi kosong');
  if (expr.length > 200) throw new Error('Ekspresi terlalu panjang (maks 200 karakter)');
  if (!/^[0-9+\-*/%().\s]*$/.test(expr))
    throw new Error('Karakter tidak diizinkan. Gunakan: 0-9 + - * / % ( ) .');

  const tokens = expr.match(/\d+\.?\d*|\.\d+|[+\-*/%()]/g) || [];
  if (!tokens.length) throw new Error('Ekspresi tidak valid');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next();
      const right = parseFactor();
      if ((op === '/' || op === '%') && right === 0)
        throw new Error('Pembagian dengan nol tidak mungkin 🙅');
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  }
  function parseFactor() {
    const t = peek();
    if (t === '-') { next(); return -parseFactor(); }
    if (t === '+') { next(); return parseFactor(); }
    if (t === '(') {
      next();
      const val = parseExpr();
      if (next() !== ')') throw new Error('Kurung tidak seimbang');
      return val;
    }
    const num = parseFloat(next());
    if (Number.isNaN(num)) throw new Error('Angka tidak valid');
    return num;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Ekspresi tidak valid (sisa token)');
  if (!Number.isFinite(result)) throw new Error('Hasil di luar jangkauan');
  return Math.round(result * 1e12) / 1e12;
}

/* ========================== TOOLS: INFO VISITOR =========================== */

const memesCache = { data: null, exp: 0 }; // cache template imgflip

const geoCache = new Map(); // ip -> { data, exp }

// Normalizer tiap provider geo (pola multi-sumber + fallback seperti aio.js)
const GEO_SOURCES = [
  {
    name: 'ipapi.co',
    url: (ip) => `https://ipapi.co/${ip}/json/`,
    parse: (d) =>
      d?.country_name
        ? { country: d.country_name, countryCode: d.country_code || '--', city: d.city || '-', region: d.region || '-', timezone: d.timezone || '-', isp: d.org || '-' }
        : null,
  },
  {
    name: 'ipwho.is',
    url: (ip) => `https://ipwho.is/${ip}`,
    parse: (d) =>
      d?.success
        ? { country: d.country, countryCode: d.country_code || '--', city: d.city || '-', region: d.region || '-', timezone: d.timezone?.id || '-', isp: d.connection?.isp || '-' }
        : null,
  },
  {
    name: 'ip-api.com',
    url: (ip) => `http://ip-api.com/json/${ip}`,
    parse: (d) =>
      d?.status === 'success'
        ? { country: d.country, countryCode: d.countryCode || '--', city: d.city || '-', region: d.regionName || '-', timezone: d.timezone || '-', isp: d.isp || '-' }
        : null,
  },
];

async function geoFromIpapi(ip) {
  if (['127.0.0.1', '::1', 'localhost'].includes(ip)) {
    return { country: 'Lokal', countryCode: 'LO', city: 'Localhost', ip };
  }
  const cached = geoCache.get(ip);
  if (cached && cached.exp > Date.now()) return cached.data;

  for (const src of GEO_SOURCES) {
    try {
      const { data } = await axios.get(src.url(encodeURIComponent(ip)), {
        timeout: 8000,
        headers: { 'User-Agent': UA_DESKTOP },
      });
      const parsed = src.parse(data);
      if (parsed) {
        const geo = { ip, geoSource: src.name, ...parsed };
        geoCache.set(ip, { data: geo, exp: Date.now() + 3600_000 });
        if (geoCache.size > 500) geoCache.clear();
        return geo;
      }
    } catch {
      /* lanjut ke sumber berikutnya */
    }
  }
  return { ip, country: 'Tidak terdeteksi', countryCode: '--', city: '-', region: '-', timezone: '-', isp: '-' };
}

function parseUserAgent(ua = '') {
  ua = String(ua);
  let device = 'Desktop';
  if (/iPad|tablet/i.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone/i.test(ua)) device = 'Mobile';

  let browser = 'Lainnya';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = 'Lainnya';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { device, browser, os, ua };
}

/* ================== MAKER/STALK ENGINE (batch 2.0) ======================== */

const makerCache = new Map();
function cacheGet(k) {
  const v = makerCache.get(k);
  if (v && v.exp > Date.now()) return v.data;
  makerCache.delete(k);
  return null;
}
function cacheSet(k, data, ttlMs) {
  if (makerCache.size > 300) makerCache.delete(makerCache.keys().next().value);
  makerCache.set(k, { data, exp: Date.now() + ttlMs });
}

/* ----------------------- V3.0: GAME GRATISAN (FreeToGame) ------------------ */
async function freeGamesList() {
  const cached = cacheGet('freegames');
  if (cached) return cached;
  const { data } = await axios.get('https://www.freetogame.com/api/games', {
    timeout: 16000,
    headers: { 'User-Agent': UA_MOBILE() },
  });
  if (!Array.isArray(data)) throw new Error('API FreeToGame tidak mengembalikan daftar');
  const list = data.slice(0, 36).map((g) => ({
    id: g.id,
    title: g.title,
    thumb: g.thumbnail,
    genre: g.genre,
    platform: g.platform,
    desc: g.short_description,
    url: g.game_url,
    date: g.release_date,
    publisher: g.publisher,
  }));
  cacheSet('freegames', list, 10 * 60 * 1000); // cache 10 menit
  return list;
}

// Multipart file upload tingkat rendah biar tidak tergantung FormData
function buildMultipartFile(boundary, filename, mime, buf) {
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
  );
  const post = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([pre, buf, post]);
}

async function getB64Image(url, opts = {}) {
  const { data } = await axios.get(url, {
    ...AXIOS_OPTS,
    timeout: opts.timeout || 30000,
    responseType: 'arraybuffer',
    headers: { 'User-Agent': UA_MOBILE(), ...(opts.headers || {}) },
  });
  const mime = data.length && data[0] === 0x89 ? 'image/png' : data.length && data[0] === 0xff ? 'image/jpeg' : 'image/png';
  return { image: Buffer.from(data).toString('base64'), mime, bytes: data.length || data.byteLength };
}
function UA_MOBILE() {
  return 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';
}

// Brat cewek (port plugins/sticker/bratcewek.js -> api.deline.web.id)
async function bratCewekImage(text) {
  const url = `https://api.deline.web.id/maker/cewekbrat?text=${encodeURIComponent(text)}`;
  return getB64Image(url, { timeout: 40000 });
}

// QC chat bubble (port plugins/sticker/qc.js -> brat.siputzx.my.id/quoted)
const QC_COLORS = {
  pink: '#f68ac9', blue: '#6cace4', red: '#f44336', green: '#4caf50',
  yellow: '#ffeb3b', purple: '#9c27b0', darkblue: '#0d47a1', lightblue: '#03a9f4',
  ash: '#9e9e9e', orange: '#ff9800', black: '#000000', white: '#ffffff',
  teal: '#008080', lightpink: '#FFC0CB', chocolate: '#A52A2A', salmon: '#FFA07A',
  magenta: '#FF00FF', tan: '#D2B48C', wheat: '#F5DEB3', deeppink: '#FF1493',
  dark: '#1b1429',
};
const QC_HOST_ALLOWED = ['c.termai.cc', 'telegra.ph', 'files.catbox.moe', 'catbox.moe', 'litter.catbox.moe', 'litterbox.catbox.moe'];
const QC_DEFAULT_AVATAR = 'https://files.catbox.moe/nwvkbt.png';

async function quoteStickerImage({ name, text, colorKey, photoUrl }) {
  const photo = photoUrl || QC_DEFAULT_AVATAR;
  const payload = {
    messages: [{
      from: { id: Math.floor(Math.random() * 90) + 10, first_name: name, last_name: '', name: '', photo: { url: photo } },
      text,
      entities: [],
      avatar: true,
      media: { url: '' },
      mediaType: '',
      replyMessage: { name: '', text: '', entities: [], chatId: Math.floor(Math.random() * 90) + 10 },
    }],
    backgroundColor: QC_COLORS[colorKey] || QC_COLORS.dark,
    width: 512, height: 512, scale: 2,
    type: 'quote', format: 'png', emojiStyle: 'apple',
  };
  const { data } = await axios.post('https://brat.siputzx.my.id/quoted', payload, {
    ...AXIOS_OPTS,
    timeout: 45000,
    responseType: 'arraybuffer',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() },
  });
  const buf = Buffer.from(data);
  if (!buf.length || (buf[0] !== 0x89 && buf[0] !== 0xff)) {
    const head = buf.slice(0, 140).toString('utf8');
    throw new Error('Server quote lagi ngambek, coba lagi bentar ya');
  }
  return { image: buf.toString('base64'), mime: buf[0] === 0x89 ? 'image/png' : 'image/jpeg', bytes: buf.length };
}

// Upload foto -> link (port plugins/sticker/smeme.js bagian uploader + fallback catbox)
async function uploadImageCdn(filename, mime, buf) {
  const boundary = () => '----KyyBoundary' + crypto.randomBytes(8).toString('hex');
  const tryTermai = async () => {
    const b = boundary();
    const { data } = await axios.post(
      'https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk',
      buildMultipartFile(b, filename, mime, buf),
      { ...AXIOS_OPTS, timeout: 40000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}`, 'User-Agent': UA_MOBILE() }, maxBodyLength: Infinity }
    );
    if (data?.status && data?.path) return { url: data.path, provider: 'termai' };
    throw new Error('termai gagal');
  };
  const tryCatbox = async () => {
    const b = boundary();
    const pre = Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
      `--${b}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
    );
    const postBuf = Buffer.from(`\r\n--${b}--\r\n`);
    const { data } = await axios.post(
      'https://catbox.moe/user/api.php',
      Buffer.concat([pre, buf, postBuf]),
      { ...AXIOS_OPTS, timeout: 60000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}` }, maxBodyLength: Infinity }
    );
    const url = String(data || '').trim();
    if (/^https:\/\//.test(url)) return { url, provider: 'catbox' };
    throw new Error('catbox ' + url.slice(0, 40));
  };
  const tryLitter = async () => {
    const b = boundary();
    const pre = Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n` +
      `--${b}\r\nContent-Disposition: form-data; name="time"\r\n\r\n24h\r\n` +
      `--${b}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
    );
    const postBuf = Buffer.from(`\r\n--${b}--\r\n`);
    const { data } = await axios.post(
      'https://litterbox.catbox.moe/resources/internals/api.php',
      Buffer.concat([pre, buf, postBuf]),
      { ...AXIOS_OPTS, timeout: 60000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}` }, maxBodyLength: Infinity }
    );
    const url = String(data || '').trim();
    if (/^https:\/\//.test(url)) return { url, provider: 'litterbox', expires: '24 jam' };
    throw new Error('litterbox ' + url.slice(0, 40));
  };
  const tryTelegraph = async () => {
    const b = boundary();
    const { data } = await axios.post(
      'https://telegra.ph/upload',
      buildMultipartFile(b, filename, mime, buf),
      { ...AXIOS_OPTS, timeout: 40000, headers: { 'Content-Type': `multipart/form-data; boundary=${b}`, 'User-Agent': UA_MOBILE() }, maxBodyLength: Infinity }
    );
    const arr = Array.isArray(data) ? data : null;
    if (arr && arr[0]?.src) return { url: 'https://telegra.ph' + arr[0].src, provider: 'telegraph' };
    throw new Error('telegraph gagal');
  };
  for (const fn of [tryTermai, tryCatbox, tryLitter, tryTelegraph]) {
    try { return await fn(); } catch { /* fallback lanjut */ }
  }
  throw new Error('Semua uploader lagi ribet hari ini 😭 coba beberapa menit lagi');
}

// Stalk Pinterest (port plugins/stalker/pintereststalk.js -> api.nexray.eu.cc)
async function pinterestProfile(username) {
  const ck = `pin:${username.toLowerCase()}`;
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/stalker/pinterest?username=${encodeURIComponent(username)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const r = data?.result;
  if (!data?.status || !r) throw new Error('Akun Pinterest tidak ditemukan 🤔');
  const user = {
    username: r.username, name: r.full_name || '-', bio: r.bio && r.bio !== '-' ? r.bio : '',
    avatar: r.image?.original || r.image?.large || '', url: r.profile_url || ('https://pinterest.com/' + r.username),
    website: r.website && r.website !== '-' ? r.website : '',
    stats: {
      pins: r.stats?.pins ?? 0,
      followers: r.stats?.followers ?? 0,
      following: r.stats?.following ?? 0,
      boards: r.stats?.boards ?? 0,
    },
  };
  cacheSet(ck, user, 10 * 60_000);
  return user;
}

// Primbon (port plugins/primbon/*.js -> api.siputzx.my.id)
async function primbonFetch(type, params) {
  let path = '';
  if (type === 'artinama') path = `/api/primbon/artinama?nama=${encodeURIComponent(params.nama || '')}`;
  else if (type === 'cocok') path = `/api/primbon/kecocokan_nama_pasangan?nama1=${encodeURIComponent(params.nama1 || '')}&nama2=${encodeURIComponent(params.nama2 || '')}`;
  else if (type === 'zodiak') path = `/api/primbon/zodiak?zodiak=${encodeURIComponent(params.zodiak || '')}`;
  else throw new Error('Tipe primbon tidak dikenal');
  const ck = `prim:${type}:${(params.nama || '')}${(params.nama1 || '')}${(params.nama2 || '')}${(params.zodiak || '')}`.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get('https://api.siputzx.my.id' + path, {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' },
  });
  if (!data?.status || !data?.data) throw new Error('Datanya lagi kosong, coba input lain');
  cacheSet(ck, data.data, 6 * 3600_000);
  return data.data;
}

/* ========================== SEARCH ENGINE (batch 3.0) ===================== */

// Lirik lagu (port plugins/search/lyrics.js -> api.nexray.eu.cc)
async function lyricsSearch(query) {
  const ck = 'lyric:' + query.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/search/lyrics?q=${encodeURIComponent(query)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const r = data?.result;
  if (!data?.status || !r) throw new Error('Liriknya ga ketemu, coba judul lain 🎵');
  const L = r.lyrics;
  const rawLyric = L && typeof L === 'object'
    ? (L.plain_lyrics || L.lyrics || L.plainLyrics || String(L.synced_lyrics || '').replace(/\[\d+[:.]\d+\S*\]\s*/g, '').trim())
    : String(L || '');
  const lyric = String(rawLyric).replace(/\[\d+[:.]\d+\S*\]\s*/g, '').trim();
  if (!lyric) throw new Error('Lagu ketemu tapi liriknya kosong 😢');
  const out = {
    title: r.title || r.name || L?.track_name || query,
    artist: r.artist || L?.artist_name || '-',
    album: L?.album_name && L.album_name !== '-' ? L.album_name : '',
    thumbnail: typeof r.thumbnail === 'string' ? r.thumbnail : (r.thumbnail?.url || ''),
    lyric: lyric.slice(0, 9000),
  };
  cacheSet(ck, out, 6 * 3600_000);
  return out;
}

// Cari gambar Pinterest (port plugins/search/pin.js -> api.siputzx.my.id)
async function pinterestSearch(query) {
  const ck = 'pinsearch:' + query.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const list = Array.isArray(data?.data) ? data.data : [];
  const images = list
    .filter((x) => x && x.image_url)
    .slice(0, 18)
    .map((x) => ({
      img: x.image_url,
      pin: x.pin || '',
      title: (x.grid_title || '').slice(0, 80),
      video: x.video_url || null,
    }));
  if (!images.length) throw new Error('Hasilnya kosong, coba kata kunci lain 📌');
  cacheSet(ck, { query, count: images.length, images }, 6 * 3600_000);
  return cacheGet(ck);
}

// Stalk Free Fire (port plugins/stalker/ffstalk.js -> api.nexray.eu.cc)
async function ffProfile(uid) {
  const ck = 'ff:' + uid;
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/stalker/freefire?uid=${encodeURIComponent(uid)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  const r = data?.result;
  if (!data?.status || !r || !r.name) throw new Error('UID tidak ditemukan 🔥 (cek lagi ya)');
  const out = {
    uid: r.uid || uid,
    name: r.name,
    level: r.level ?? '-',
    region: r.region || '-',
    likes: r.likes ?? 0,
    createdAt: r.created_at || '',
    lastLogin: r.last_login || '',
    banner: typeof r.banner_image === 'string' && r.banner_image.startsWith('http') ? r.banner_image : '',
    guild: r.guild?.name || r_guildFrom(r) || '',
  };
  cacheSet(ck, out, 10 * 60_000);
  return out;
}
function r_guildFrom() { return ''; }

/* ============================ AI ENGINE (batch 4.0) ======================= */

// Text-to-image AI (port src/scraper/seaart.js fluxImage -> yuulabs flux)
async function aiFluxImage(prompt, ratio) {
  const { data } = await axios.post(
    'https://api.yuulabs.web.id/api/ai/flux-img',
    { message: prompt, ratio },
    { headers: { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() }, timeout: 25000, maxRedirects: 5 }
  );
  if (!data?.status || !data?.result?.url)
    throw new Error(data?.message || 'AI lagi kebanyakan order, coba bentar lagi ya 🎨');
  const url = data.result.url;
  const out = { url, prompt: data.result.prompt || prompt, ratio: data.result.ratio || ratio };
  try {
    const b64 = await getB64Image(url, { timeout: 20000 });
    Object.assign(out, b64); // image + mime + bytes
  } catch { /* fallback: frontend pakai url */ }
  return out;
}

// Simi chat (port plugins/ai/simi.js -> nexray)
async function aiSimiChat(text) {
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/ai/simisimi?text=${encodeURIComponent(text)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  if (!data?.status || !data?.result) throw new Error('Simi lagi ngambek, coba bilang yang lain 🤖');
  return String(data.result);
}

// Math AI (port plugins/ai/matematika.js -> nexray mathgpt)
async function aiMathSolve(text) {
  const { data } = await axios.get(
    `https://api.nexray.eu.cc/ai/mathgpt?text=${encodeURIComponent(text)}`,
    { ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' } }
  );
  if (!data?.status || !data?.result) throw new Error('Soalnya bikin AI pusing, yang jelas ya 🧮');
  return String(data.result);
}

// Hari libur / hari besar (port plugins: nexray information/hari-libur)
async function holidaysInfo() {
  const hit = cacheGet('libur:v1');
  if (hit) return { ...hit, cached: true };
  const { data } = await axios.get('https://api.nexray.eu.cc/information/hari-libur', {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' },
  });
  const r = data?.result;
  if (!data?.status || !r) throw new Error('Data hari libur belum kebuka 📅');
  const fmt = ({ date, event, daysUntil }) => ({ date, event, daysUntil });
  const out = {
    hariIni: (r.hari_ini?.events || []).map(fmt),
    nasional: (r.mendatang?.event_nasional || []).slice(0, 10).map(fmt),
  };
  cacheSet('libur:v1', out, 6 * 3600_000);
  return out;
}

// PP couple (port plugins -> deline random/ppcouple)
async function ppCoupleRandom() {
  const { data } = await axios.get('https://api.deline.web.id/random/ppcouple', {
    ...AXIOS_OPTS, headers: { 'User-Agent': UA_MOBILE(), Accept: 'application/json' },
  });
  if (!data?.result?.cowo || !data?.result?.cewe) throw new Error('Couple-nya lagi berantem 💔 coba lagi');
  const [cowo, cewe] = await Promise.all([
    getB64Image(data.result.cowo, { timeout: 15000 }).catch(() => null),
    getB64Image(data.result.cewe, { timeout: 15000 }).catch(() => null),
  ]);
  return {
    cowo: cowo ? { ...cowo, url: data.result.cowo } : { url: data.result.cowo },
    cewe: cewe ? { ...cewe, url: data.result.cewe } : { url: data.result.cewe },
  };
}

// Cuaca (wttr.in, keyless)
const WTH_ICONS = [
  [/^113$/, '☀️'], [/^116$/, '⛅'], [/^(119|122)$/, '☁️'], [/^14[36]$/, '🌫️'],
  [/^(17[69]|2[3567]\d|3[0-8]\d|39[29])$/, '🌧️'], [/^(20\d|386)$/, '⛈️'],
  [/^(17[12]|18\d|19\d|22[0-9]|23[0-9]|35\d|36[02-9]|37\d|39)$/, '❄️'],
  [/^389$/, '⚡'],
];
function wthIcon(code) {
  for (const [re, e] of WTH_ICONS) if (re.test(String(code))) return e;
  return '🌡️';
}
async function weatherInfo(kota) {
  const ck = 'wth:' + kota.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const query = /,|\s+(jawa|sumatra|kalimantan|sulawesi|papua|bali)/i.test(kota) ? kota : kota + ', Indonesia';
  const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(query)}?format=j1`, {
    ...AXIOS_OPTS, headers: { 'User-Agent': 'curl/8.0 KYY/1.0', Accept: 'application/json' },
  });
  const c = data?.current_condition?.[0];
  if (!c?.temp_C) throw new Error('Kotanya ga ketemu ☁️ coba nama kota lain/jelas ya');
  const w0 = data.weather?.[0] || {};
  const w1 = data.weather?.[1] || {};
  const dayDesc = (w, key) => (w.hourly?.[4] || w.hourly?.[0] || {})[key];
  const avg = (w) => Math.round(((w.hourly || []).reduce((a, h) => a + (h.tempC ? +h.tempC : 0), 0)) / Math.max(1, (w.hourly || []).length));
  const out = {
    kota,
    suhu: +c.temp_C,
    feels: +c.FeelsLikeC,
    desc: c.weatherDesc?.[0]?.value || '-',
    icon: wthIcon(c.weatherCode),
    humidity: +c.humidity || 0,
    wind: +c.windspeedKmph || 0,
    minC: w0.mintempC ? Math.round(+w0.mintempC) : null,
    maxC: w0.maxtempC ? Math.round(+w0.maxtempC) : null,
  };
  if (w1.date) {
    const hc = w1.hourly?.[4] || w1.hourly?.[2] || {};
    out.besok = {
      desc: hc.weatherDesc?.[0]?.value || '-',
      icon: wthIcon(hc.weatherCode),
      minC: w1.mintempC ? Math.round(+w1.mintempC) : avg(w1),
      maxC: w1.maxtempC ? Math.round(+w1.maxtempC) : avg(w1),
    };
  }
  cacheSet(ck, out, 10 * 60_000);
  return out;
}

// Stalk Roblox (port plugins/stalker/robloxstalk.js -> API resmi keyless)
async function robloxProfile(username) {
  const ck = 'rbx:' + username.toLowerCase();
  const hit = cacheGet(ck);
  if (hit) return { ...hit, cached: true };
  const H = { 'Content-Type': 'application/json', 'User-Agent': UA_MOBILE() };
  const { data: found } = await axios.post(
    'https://users.roblox.com/v1/usernames/users',
    { usernames: [username], excludeBannedUsers: false },
    { ...AXIOS_OPTS, headers: H }
  );
  const u = found?.data?.[0];
  if (!u?.id) throw new Error('User Roblox tidak ditemukan 🤖');
  const id = u.id;
  const [info, avatar, followers, following, friends] = await Promise.allSettled([
    axios.get(`https://users.roblox.com/v1/users/${id}`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://friends.roblox.com/v1/users/${id}/followers/count`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://friends.roblox.com/v1/users/${id}/followings/count`, { ...AXIOS_OPTS, headers: H }),
    axios.get(`https://friends.roblox.com/v1/users/${id}/friends/count`, { ...AXIOS_OPTS, headers: H }),
  ]);
  const inf = info.status === 'fulfilled' ? info.value.data || {} : {};
  const av = avatar.status === 'fulfilled' ? avatar.value.data?.data?.[0]?.imageUrl || '' : '';
  const out = {
    id,
    username: u.name || username,
    displayName: inf.displayName || u.displayName || u.name || username,
    bio: (inf.description || '').slice(0, 500),
    created: inf.created || '',
    avatar: av,
    banned: inf.isBanned ?? u.isBanned ?? false,
    verified: inf.hasVerifiedBadge ?? false,
    stats: {
      followers: followers.status === 'fulfilled' ? followers.value.data?.count ?? 0 : 0,
      following: following.status === 'fulfilled' ? following.value.data?.count ?? 0 : 0,
      friends: friends.status === 'fulfilled' ? friends.value.data?.count ?? 0 : 0,
    },
    url: `https://www.roblox.com/users/${id}/profile`,
  };
  cacheSet(ck, out, 10 * 60_000);
  return out;
}

/* ================================ ROUTER ================================== */

function routeOf(event) {
  let p = (event.path || '').split('?')[0];
  p = p.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/+$/, '') || '/';
}

exports.handler = async (event) => {
  const route = routeOf(event);
  const method = (event.httpMethod || 'GET').toUpperCase();
  const startedAt = Date.now();

  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  try {
    switch (route) {
      /* ------------------------------ HEALTH ------------------------------ */
      case '/health': {
        return ok({
          service: '⚡ All Tools KYY API',
          developer: 'Rifkyy sensei',
          version: '3.0.0',
          time: new Date().toISOString(),
          node: process.version,
        });
      }

      /* --------------------------- INFO VISITOR --------------------------- */
      case '/info': {
        const ip = getClientIp(event);
        const ua = (event.headers || {})['user-agent'] || '';
        const geo = await geoFromIpapi(ip);
        const parsed = parseUserAgent(ua);
        return ok({ ...geo, ...parsed });
      }

      /* ---------------------- TEMPLATE MEME (imgflip) --------------------- */
      case '/memes': {
        if (memesCache.data && memesCache.exp > Date.now())
          return ok({ count: memesCache.data.length, memes: memesCache.data, cached: true });
        const { data } = await axios.get('https://api.imgflip.com/get_memes', {
          ...AXIOS_OPTS,
          headers: { 'User-Agent': UA_DESKTOP },
        });
        const memes = (data?.data?.memes || []).map((m) => ({
          id: m.id, name: m.name, url: m.url,
          width: m.width, height: m.height, boxCount: m.box_count,
        }));
        if (!memes.length) return fail('Gagal memuat template meme', 502);
        memesCache.data = memes;
        memesCache.exp = Date.now() + 6 * 3600_000; // cache 6 jam
        return ok({ count: memes.length, memes, cached: false });
      }

      /* --------------------- STALK TIKTOK (tikwm user info) --------------- */
      case '/stalk/tiktok': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const user = String(body.username || '').trim().replace(/^@+/, '');
        if (!/^[A-Za-z0-9._]{2,24}$/.test(user)) return fail('Username TikTok tidak valid');
        const { data } = await axios.get('https://www.tikwm.com/api/user/info', {
          ...AXIOS_OPTS,
          params: { unique_id: user },
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            Origin: 'https://www.tikwm.com',
            Referer: 'https://www.tikwm.com/',
            'User-Agent': UA_ANDROID,
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        const d = data?.data;
        if (!d?.user?.uniqueId) throw new Error(data?.msg || 'User tidak ditemukan atau akunnya private');
        return ok({
          platform: 'tiktok',
          user: {
            username: d.user.uniqueId,
            nickname: d.user.nickname || d.user.uniqueId,
            avatar: d.user.avatarLarger || d.user.avatarMedium || d.user.avatarThumb || null,
            bio: d.user.signature || '',
            verified: Boolean(d.user.verified || d.user.customVerify),
            region: d.user.region || null,
          },
          stats: {
            followers: d.stats?.followerCount || 0,
            following: d.stats?.followingCount || 0,
            likes: d.stats?.heartCount || d.stats?.heart || 0,
            videos: d.stats?.videoCount || 0,
            digg: d.stats?.diggCount || 0,
          },
        });
      }

      /* -------------------------- CEK IP (GEO LOOKUP) --------------------- */
      case '/tools/ipgeo': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const ip = String(body.ip || '').trim();
        const isV4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
        if (!isV4 && !/^[0-9a-fA-F:]{3,45}$/.test(ip)) return fail('Format IP tidak valid');
        if (isV4 && ip.split('.').some((n) => +n > 255)) return fail('IP tidak valid (oktet > 255)');
        if (/^(10\.|127\.|192\.168\.|0\.)/.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip))
          return fail('Itu IP privat/lokal jaringan sendiri, ga bisa dilacak 🏠');
        const geo = await geoFromIpapi(ip);
        return ok(geo);
      }

      /* ------------- TANYA USTADZ (PORT dari plugins/canvas/pakustad.js) -- */
      case '/tools/ustadz': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim();
        if (!text) return fail('Pertanyaannya mana? 🤔');
        if (text.length > 120) return fail('Maksimal 120 karakter');
        const { data } = await axios.get('https://api.cuki.biz.id/api/canvas/ustadz', {
          ...AXIOS_OPTS,
          params: { apikey: 'cuki-x', text },
          headers: { 'User-Agent': UA_DESKTOP },
        });
        const img = data?.results?.url;
        if (!img) throw new Error('Server ustadz lagi ngambek, coba lagi nanti');
        return ok({ image: img.replace(/^http:/, 'https:'), text });
      }

      /* --------------- JADWAL SHOLAT (PORT dari plugins/religi) ----------- */
      case '/sholat/cari': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const kota = String(body.kota || '').trim();
        if (!/^[a-zA-Z\s.'-]{2,40}$/.test(kota)) return fail('Nama kota tidak valid');
        const { data } = await axios.get(
          `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(kota.toLowerCase())}`,
          { ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP } }
        );
        const list = (data?.data || []).map((k) => ({ id: k.id, lokasi: k.lokasi }));
        if (!list.length) return fail(`Kota "${kota}" ga ketemu, coba nama lain`);
        return ok({ count: list.length, cities: list });
      }

      case '/sholat/jadwal': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        let kotaId = String(body.kotaId || '').trim();
        if (!kotaId) {
          const kota = String(body.kota || 'jakarta').trim();
          const { data } = await axios.get(
            `https://api.myquran.com/v2/sholat/kota/cari/${encodeURIComponent(kota.toLowerCase())}`,
            { ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP } }
          );
          kotaId = data?.data?.[0]?.id || '1301';
        }
        if (!/^\d+$/.test(kotaId)) return fail('ID kota tidak valid');
        // tanggal hari ini (zona Asia/Jakarta)
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(new Date());
        const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
        const { data } = await axios.get(
          `https://api.myquran.com/v2/sholat/jadwal/${kotaId}/${p.year}/${p.month}/${p.day}`,
          { ...AXIOS_OPTS, headers: { 'User-Agent': UA_DESKTOP } }
        );
        const d = data?.data;
        if (!d?.jadwal) throw new Error('Jadwal tidak ditemukan');
        return ok({
          lokasi: d.lokasi, daerah: d.daerah,
          tanggal: d.jadwal.tanggal,
          jadwal: {
            imsak: d.jadwal.imsak, subuh: d.jadwal.subuh, terbit: d.jadwal.terbit,
            dhuha: d.jadwal.dhuha, dzuhur: d.jadwal.dzuhur, ashar: d.jadwal.ashar,
            maghrib: d.jadwal.maghrib, isya: d.jadwal.isya,
          },
        });
      }

      /* ------------ GITHUB STALK (PORT dari plugins/stalker/githubstalk) -- */
      case '/stalk/github': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const user = String(body.username || '').trim();
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(user)) return fail('Username GitHub tidak valid');
        const cached = geoCache.get(`gh:${user.toLowerCase()}`);
        if (cached && cached.exp > Date.now()) return ok(cached.data);
        try {
          const { data } = await axios.get(`https://api.github.com/users/${encodeURIComponent(user)}`, {
            ...AXIOS_OPTS,
            headers: { 'User-Agent': UA_DESKTOP, Accept: 'application/vnd.github+json' },
          });
          const out = {
            login: data.login, name: data.name || data.login,
            avatar: data.avatar_url, bio: data.bio || '',
            company: data.company || null, location: data.location || null,
            blog: data.blog || null,
            repos: data.public_repos || 0, gists: data.public_gists || 0,
            followers: data.followers || 0, following: data.following || 0,
            joined: data.created_at, url: data.html_url,
          };
          geoCache.set(`gh:${user.toLowerCase()}`, { data: out, exp: Date.now() + 600_000 });
          return ok(out);
        } catch (e) {
          if (e.response?.status === 404) return fail(`User "${user}" ga ketemu di GitHub`);
          if (e.response?.status === 403) return fail('Kena rate limit GitHub, coba sejam lagi 🙏', 429);
          throw e;
        }
      }

      /* ------------------------------ TOOLS ------------------------------- */
      case '/tools/qrcode': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim();
        if (!text) return fail('Teks QR tidak boleh kosong');
        if (text.length > 2000) return fail('Teks terlalu panjang (maks 2000)');
        const size = Math.min(Math.max(parseInt(body.size) || 512, 128), 1024);
        const dark = /^#[0-9a-fA-F]{6}$/.test(body.colorDark || '') ? body.colorDark : '#0b0e1d';
        const light = /^#[0-9a-fA-F]{6}$/.test(body.colorLight || '') ? body.colorLight : '#ffffff';
        const dataUrl = await QRCode.toDataURL(text, {
          width: size,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark, light },
        });
        return ok({ dataUrl, text, size });
      }

      case '/tools/password': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const length = Math.min(Math.max(parseInt(body.length) || 16, 4), 64);
        const result = generatePassword({
          length,
          upper: body.upper !== false,
          lower: body.lower !== false,
          numbers: body.numbers !== false,
          symbols: body.symbols !== false,
        });
        return ok(result);
      }

      case '/tools/morse': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim();
        if (!text) return fail('Teks tidak boleh kosong');
        if (text.length > 500) return fail('Teks terlalu panjang (maks 500)');
        const mode = body.mode === 'decode' ? 'decode' : 'encode';
        const result = mode === 'encode' ? morseEncode(text) : morseDecode(text);
        if (!result) return fail('Tidak ada karakter yang bisa dikonversi');
        return ok({ mode, input: text, result });
      }

      case '/tools/base64': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '');
        if (!text) return fail('Teks tidak boleh kosong');
        if (text.length > 10000) return fail('Teks terlalu panjang (maks 10000)');
        const mode = body.mode === 'decode' ? 'decode' : 'encode';
        try {
          const result =
            mode === 'encode'
              ? Buffer.from(text, 'utf8').toString('base64')
              : Buffer.from(String(text).replace(/\s/g, ''), 'base64').toString('utf8');
          return ok({ mode, input: text, result });
        } catch {
          return fail('Gagal decode — input bukan Base64 yang valid');
        }
      }

      case '/tools/calc': {
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        try {
          const result = safeEvaluate(String(body.expression || ''));
          return ok({ expression: body.expression, result });
        } catch (e) {
          return fail(e.message);
        }
      }

      /* --------------------------- DOWNLOADER ----------------------------- */
      case '/downloader/tiktok':
      case '/downloader/instagram':
      case '/downloader/youtube':
      case '/downloader/aio': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);

        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const url = String(body.url || '').trim();
        if (!isValidHttpUrl(url)) return fail('URL tidak valid. Harus diawali http:// atau https://');

        const requiredPlatform = route.replace('/downloader/', '');
        const detected = detectPlatform(url);

        if (requiredPlatform !== 'aio' && detected !== requiredPlatform) {
          const nice = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' }[requiredPlatform];
          return fail(`URL sepertinya bukan link ${nice} 🤔 (terdeteksi: ${detected || 'tidak dikenal'})`);
        }

        let result;
        if (requiredPlatform === 'tiktok') result = await handleTiktok(url);
        else if (requiredPlatform === 'instagram') result = await handleInstagram(url);
        else if (requiredPlatform === 'youtube') result = await handleYoutube(url);
        else result = await handleAio(url);

        return ok({ ...result, tookMs: Date.now() - startedAt });
      }

      /* ----------------- BRAT API (brat cewek dkk, port bot WA) ------------ */
      case '/tools/brat': {
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const text = String(q.text || '').trim().slice(0, 120);
        if (!text) return fail('Teks brat tidak boleh kosong 🌿');
        const type = String(q.type || 'cewek');
        if (type !== 'cewek') return fail('Tipe brat tidak dikenal');
        const r = await bratCewekImage(text);
        return ok({ ...r, tookMs: Date.now() - startedAt });
      }

      /* ---------------- QC QUOTE CHAT (port plugins/sticker/qc.js) -------- */
      case '/tools/qc': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const name = String(body.name || 'User').trim().slice(0, 40) || 'User';
        const text = String(body.text || '').trim();
        if (!text) return fail('Teks quote tidak boleh kosong 💬');
        if (text.length > 90) return fail('Teks kepanjangan, maks 90 karakter ya');
        const colorKey = QC_COLORS[body.color] ? String(body.color) : 'dark';
        let photoUrl = null;
        if (body.photoUrl) {
          const p = String(body.photoUrl).slice(0, 300);
          if (!isValidHttpUrl(p) || !p.startsWith('https://')) return fail('URL foto harus https');
          const host = new URL(p).hostname;
          if (!QC_HOST_ALLOWED.includes(host)) return fail('Host foto tidak diizinkan (pakai uploader di sini aja 😉)');
          photoUrl = p;
        }
        const r = await quoteStickerImage({ name, text, colorKey, photoUrl });
        return ok({ ...r, tookMs: Date.now() - startedAt });
      }

      /* ------------ UPLOAD FOTO -> LINK (port bagian upload smeme.js) ------ */
      case '/tools/upload': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 15)) return fail('Terlalu banyak request, coba lagi dalam 1 menit ⏳', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const b64 = String(body.b64 || '');
        const mime = /^image\/(png|jpe?g|gif|webp)$/i.test(String(body.mime || '')) ? body.mime : 'image/png';
        if (!b64 || b64.length < 30) return fail('Data gambar kosong 🖼️');
        if (b64.length > 12_000_000 * 1.4) return fail('Foto terlalu besar, maks ~12MB ya');
        const buf = Buffer.from(b64.replace(/^data:[^,]+,/, ''), 'base64');
        const isPng = buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47;
        const isJpg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;
        const isGif = buf.length > 6 && buf.toString('ascii', 0, 4) === 'GIF8';
        const isWebp = buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
        if (!(isPng || isJpg || isGif || isWebp)) return fail('Bukan gambar yang valid 🤔');
        const ext = mime.split('/')[1].replace('jpeg', 'jpg');
        const name = (String(body.name || 'foto').split('.')[0].replace(/[^\w-]+/g, '').slice(0, 24) || 'foto') + '.' + ext;
        const r = await uploadImageCdn(name, mime, buf);
        return ok({ ...r, size: buf.length, url: r.url, tookMs: Date.now() - startedAt });
      }

      /* ---------- STALK PINTEREST (port plugins/stalker/pintereststalk) ---- */
      case '/stalk/pinterest': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const user = String(q.username || '').trim().replace(/^@+/, '');
        if (!/^[A-Za-z0-9._-]{2,30}$/.test(user)) return fail('Username Pinterest tidak valid');
        const r = await pinterestProfile(user);
        return ok({ user: r, tookMs: Date.now() - startedAt });
      }

      /* -------------- PRIMBON (port plugins/primbon/*.js) ------------------ */
      case '/primbon': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const type = String(q.type || '');
        if (type === 'artinama') {
          const nama = String(q.nama || '').trim().slice(0, 40);
          if (!/^[A-Za-z' .,-]{2,40}$/.test(nama)) return fail('Namanya aneh, huruf aja ya 🔮');
          return ok({ result: await primbonFetch('artinama', { nama }), tookMs: Date.now() - startedAt });
        }
        if (type === 'cocok') {
          const nama1 = String(q.nama1 || '').trim().slice(0, 40);
          const nama2 = String(q.nama2 || '').trim().slice(0, 40);
          if (!/^[A-Za-z' .,-]{2,40}$/.test(nama1) || !/^[A-Za-z' .,-]{2,40}$/.test(nama2))
            return fail('Isi dua nama yang bener ya 💞');
          return ok({ result: await primbonFetch('cocok', { nama1, nama2 }), tookMs: Date.now() - startedAt });
        }
        if (type === 'zodiak') {
          const z = String(q.zodiak || '').trim().toLowerCase();
          const LIST = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagitarius','sagittarius','capricorn','aquarius','pisces'];
          if (!LIST.includes(z)) return fail('Zodiak tidak dikenal, tulis yang bener (mis. leo) ♈');
          const rs = await primbonFetch('zodiak', { zodiak: z === 'sagittarius' ? 'sagitarius' : z });
          return ok({ result: rs, zodiak: z, tookMs: Date.now() - startedAt });
        }
        return fail('Tipe primbon tidak dikenal');
      }

      /* ------------ REMOVE BG (port src/scraper/removebackground.js) ------- */
      case '/tools/removebg': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 12)) return fail('Santai dulu 1 menit ya ✂️', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const buf = Buffer.from(String(body.b64 || '').replace(/^data:[^,]+,/, ''), 'base64');
        if (buf.length < 500) return fail('Gambar kosong/invalid ✂️');
        if (buf.length > 9 * 1024 * 1024) return fail('Foto kebesaran, kecilin dulu maks ~9MB');
        const boundary = '----KyyBg' + crypto.randomBytes(8).toString('hex');
        const payload = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="foto.png"\r\nContent-Type: image/png\r\n\r\n`),
          buf,
          Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="format"\r\n\r\npng\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nv1\r\n--${boundary}--\r\n`),
        ]);
        const { data, headers: hres } = await axios.post(
          'https://api2.pixelcut.app/image/matte/v1',
          payload,
          {
            timeout: 50000, maxRedirects: 5, responseType: 'arraybuffer', maxBodyLength: Infinity,
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'x-locale': 'en', 'x-client-version': 'web:pixa.com:4a5b0af2',
              'origin': 'https://www.pixa.com', 'referer': 'https://www.pixa.com/',
            },
          }
        );
        const out = Buffer.from(data);
        if (out.length < 400) {
          let txt = '';
          try { txt = JSON.parse(out.toString('utf8'))?.message || ''; } catch { txt = out.toString('utf8').slice(0, 120); }
          return fail('Server removebg lagi penuh 😭 ' + (txt || 'coba lagi bentar'), 502);
        }
        return ok({ image: out.toString('base64'), mime: 'image/png', bytes: out.length, tookMs: Date.now() - startedAt });
      }

      /* -------------- SEARCH (batch 3.0: lirik & pinterest) ---------------- */
      case '/search/lyrics': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const query = String(q.q || '').trim().slice(0, 120);
        if (!query) return fail('Judul lagunya mana? 🎵');
        return ok({ result: await lyricsSearch(query), tookMs: Date.now() - startedAt });
      }

      case '/search/pinterest': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const query = String(q.q || '').trim().slice(0, 80);
        if (!query) return fail('Kata kuncinya kosong 📌');
        return ok({ result: await pinterestSearch(query), tookMs: Date.now() - startedAt });
      }

      /* -------------- STALK GAME (batch 3.0: FF & Roblox) ------------------ */
      case '/stalk/ff': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const uid = String(q.uid || '').trim();
        if (!/^\d{6,15}$/.test(uid)) return fail('UID Free Fire harus angka 6–15 digit 🔥');
        return ok({ user: await ffProfile(uid), tookMs: Date.now() - startedAt });
      }

      case '/stalk/roblox': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const user = String(q.username || '').trim();
        if (!/^[A-Za-z0-9_]{3,20}$/.test(user)) return fail('Username Roblox tidak valid (huruf/angka/underscore)');
        return ok({ user: await robloxProfile(user), tookMs: Date.now() - startedAt });
      }

      /* ================= AI ZONE (batch 4.0) ================= */
      case '/ai/image': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`dl:${ip}`, 10)) return fail('Kebanyakan bikin gambar, dingin dulu 1 menit 🎨', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const prompt = String(body.prompt || '').trim().slice(0, 500);
        if (prompt.length < 4) return fail('Prompt terlalu pendek 🎨');
        if (/\b(ngentot|porn|nude|nsfw|sex|hentai)\b/i.test(prompt)) return fail('Prompt-nya ga sopan 🔒');
        const RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9'];
        const ratio = RATIOS.includes(body.ratio) ? body.ratio : '1:1';
        return ok({ result: await aiFluxImage(prompt, ratio), tookMs: Date.now() - startedAt });
      }

      case '/ai/chat': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`ai:${ip}`, 25)) return fail('Siminya pegal dengerin kamu, istirahat dulu 1 menit 😹', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim().slice(0, 500);
        if (!text) return fail('Ngomongin apa? 🤖');
        return ok({ reply: await aiSimiChat(text), tookMs: Date.now() - startedAt });
      }

      case '/ai/math': {
        if (method !== 'POST') return fail('Gunakan method POST', 405);
        const ip = getClientIp(event);
        if (!rateLimit(`ai:${ip}`, 25)) return fail('AI-nya butuh istirahat 1 menit 🧮', 429);
        const body = parseBody(event);
        if (!body) return fail('Body JSON tidak valid');
        const text = String(body.text || '').trim().slice(0, 800);
        if (!text) return fail('Soalnya mana? 🧮');
        // Smart fallback: kalo soal aritmatika murni, hitung lokal langsung (instan, ga perlu AI)
        if (/^[\d\s+\-*/%(),.]+$/.test(text) && /\d\s*[+\-*/]\s*\d/.test(text)) {
          try {
            const expr = text.replace(/,/g, '.');
            const result = safeEvaluate(expr);
            const steps = `Jawabannya instan nih (dihitung pake engine lokal ⚡):\n\n**${expr} = ${result}**\n\nKalo mau penjelasan AI yang lebih verbal, tulis soalnya pake kalimat ya, contoh: "berapa keliling lingkaran jari-jari 7?"`;
            return ok({ answer: steps, mode: 'local', tookMs: Date.now() - startedAt });
          } catch { /* lanjut ke AI */ }
        }
        try {
          return ok({ answer: await aiMathSolve(text), mode: 'ai', tookMs: Date.now() - startedAt });
        } catch (e) {
          return fail('AI-nya lagi rehat bentar 😴 coba soal aritmatika murni (mis. 12*7+3) atau ulang beberapa menit lagi', 503);
        }
      }

      case '/tools/libur': {
        return ok({ result: await holidaysInfo(), tookMs: Date.now() - startedAt });
      }

      case '/tools/cuaca': {
        const q = (method === 'POST' ? parseBody(event) : null) || readParams(event);
        const kota = String(q.kota || '').trim().slice(0, 80);
        if (!kota) return fail('Kotanya mana dong ☁️');
        return ok({ result: await weatherInfo(kota), tookMs: Date.now() - startedAt });
      }

      case '/random/ppcouple': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 20)) return fail('Santai dulu woy 💑', 429);
        return ok({ result: await ppCoupleRandom(), tookMs: Date.now() - startedAt });
      }

      case '/random/anime': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 20)) return fail('Santai dulu woy ✨', 429);
        const r = await getB64Image('https://api.nexray.eu.cc/random/anime?type=waifu', { timeout: 30000 });
        return ok({ ...r, tookMs: Date.now() - startedAt });
      }

      /* ------------------------- GAME GRATISAN (v3) ----------------------- */
      case '/games/free': {
        const ip = getClientIp(event);
        if (!rateLimit(`gen:${ip}`, 20)) return fail('Santai dulu woy 🎁', 429);
        return ok({ result: await freeGamesList(), tookMs: Date.now() - startedAt });
      }

      default:
        return fail(`Route tidak ditemukan: ${route}`, 404);
    }
  } catch (err) {
    console.error(`[API ERROR] ${method} ${route}:`, err.message);
    return fail(err.message || 'Terjadi kesalahan server', 502);
  }
};
