/**
 * Test harness lokal — memanggil handler Netlify Function secara langsung
 * tanpa perlu deploy. Jalankan: node test/run-tests.js
 */
const { handler } = require('../netlify/functions/api.js');

let passed = 0, failed = 0;

async function call(name, event, validate) {
  try {
    const res = await handler(event, {});
    const body = JSON.parse(res.body || '{}');
    const err = validate ? validate(res.statusCode, body) : (body.status ? null : body.error);
    if (err) {
      failed++;
      console.log(`❌ ${name}  [HTTP ${res.statusCode}]  -> ${err}`);
      console.log('   body:', JSON.stringify(body).slice(0, 300));
    } else {
      passed++;
      const preview = JSON.stringify(body).slice(0, 160);
      console.log(`✅ ${name}  [HTTP ${res.statusCode}]  -> ${preview}…`);
    }
    return body;
  } catch (e) {
    failed++;
    console.log(`❌ ${name}  EXCEPTION: ${e.message}`);
    return null;
  }
}

const post = (path, body) => ({
  httpMethod: 'POST',
  path,
  body: JSON.stringify(body),
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36 KYY-Test' },
});
const get = (path) => {
  const qsp = {};
  const m = path.match(/\?(.*)$/);
  if (m) new URLSearchParams(m[1]).forEach((v, k) => { qsp[k] = v; });
  return {
    httpMethod: 'GET',
    path,
    queryStringParameters: qsp,
    headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) Chrome/116.0 Mobile Safari/537.36', 'x-nf-client-connection-ip': '103.147.8.1' },
  };
};

(async () => {
  console.log('\n⚡ ALL TOOLS KYY — API TEST SUITE\n' + '='.repeat(60));

  // 1. Health
  await call('GET /api/health', get('/api/health'), (s, b) =>
    b.status && b.service ? null : 'health invalid');

  // 2. Info
  await call('GET /api/info', get('/api/info'), (s, b) =>
    b.status && b.device && b.browser ? null : 'info invalid');

  // 3. Password + validasi keunggulan
  await call('POST /api/tools/password', post('/api/tools/password', { length: 32, symbols: true }), (s, b) => {
    if (!b.status) return b.error;
    if (b.password.length !== 32) return 'panjang salah';
    if (b.entropy < 100) return 'entropi terlalu kecil: ' + b.entropy;
    return null;
  });

  // 4. Morse encode + decode round-trip
  const m = await call('POST /api/tools/morse (encode)', post('/api/tools/morse', { text: 'KYY', mode: 'encode' }), (s, b) =>
    b.status && b.result.includes('-.-') ? null : 'hasil morse salah');
  if (m?.result) {
    await call('POST /api/tools/morse (decode)', post('/api/tools/morse', { text: m.result, mode: 'decode' }), (s, b) =>
      b.status && b.result === 'KYY' ? null : `roundtrip gagal: "${b.result}"`);
  }

  // 5. Base64 round-trip
  const b64 = await call('POST /api/tools/base64 (encode)', post('/api/tools/base64', { text: 'Rifkyy sensei ⚡', mode: 'encode' }));
  if (b64?.result) {
    await call('POST /api/tools/base64 (decode)', post('/api/tools/base64', { text: b64.result, mode: 'decode' }), (s, b) =>
      b.status && b.result === 'Rifkyy sensei ⚡' ? null : 'roundtrip gagal');
  }

  // 6. Calculator (termasuk keamanan & error)
  await call('POST /api/tools/calc (valid)', post('/api/tools/calc', { expression: '18 + 2 * (10 - 4) / 3' }), (s, b) =>
    b.status && b.result === 22 ? null : `hasil salah: ${b.result}`);
  await call('POST /api/tools/calc (blokir karakter jahat)', post('/api/tools/calc', { expression: 'process.exit(1)' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');
  await call('POST /api/tools/calc (bagi nol)', post('/api/tools/calc', { expression: '10/0' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');

  // 7. QR Code
  await call('POST /api/tools/qrcode', post('/api/tools/qrcode', { text: 'https://all-tools-kyy.netlify.app', size: 256 }), (s, b) =>
    b.status && b.dataUrl.startsWith('data:image/png;base64,') ? null : 'dataUrl invalid');

  // 8. Validasi downloader (URL salah harus ditolak rapi)
  await call('POST /api/downloader/tiktok (URL invalid)', post('/api/downloader/tiktok', { url: 'bukan url' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');
  await call('POST /api/downloader/tiktok (platform salah)', post('/api/downloader/tiktok', { url: 'https://www.youtube.com/watch?v=x' }), (s, b) =>
    !b.status ? null : 'HARUS DITOLAK tapi diterima!');

  // 9. Downloader nyata (butuh internet — tikwm) + template meme
  if (process.argv.includes('--live')) {
    await call('POST /api/downloader/tiktok (LIVE)', post('/api/downloader/tiktok', {
      url: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
    }), (s, b) => (b.status && b.media?.length ? null : b.error || 'media kosong'));
    await call('GET /api/memes (LIVE)', get('/api/memes'), (s, b) =>
      b.status && b.memes?.length > 50 ? null : b.error || 'template kosong');
    await call('POST /api/stalk/tiktok (LIVE)', post('/api/stalk/tiktok', { username: 'tiktok' }), (s, b) =>
      b.status && b.stats && b.user?.username === 'tiktok' ? null : b.error || 'data stalk kosong');
    await call('POST /api/tools/ipgeo (LIVE)', post('/api/tools/ipgeo', { ip: '8.8.8.8' }), (s, b) =>
      b.status && b.country ? null : b.error || 'geo kosong');
    await call('POST /api/tools/ipgeo (IP privat)', post('/api/tools/ipgeo', { ip: '192.168.1.1' }), (s, b) =>
      !b.status ? null : 'IP privat HARUS DITOLAK');
    await call('POST /api/tools/ustadz (LIVE)', post('/api/tools/ustadz', { text: 'kenapa aku ganteng' }), (s, b) =>
      b.status && b.image?.startsWith('https://') ? null : b.error || 'gambar kosong');
    await call('POST /api/sholat/cari (LIVE)', post('/api/sholat/cari', { kota: 'pati' }), (s, b) =>
      b.status && b.cities?.length ? null : b.error || 'kota kosong');
    await call('POST /api/sholat/jadwal (LIVE)', post('/api/sholat/jadwal', { kota: 'jakarta' }), (s, b) =>
      b.status && b.jadwal?.subuh ? null : b.error || 'jadwal kosong');
    await call('POST /api/stalk/github (LIVE)', post('/api/stalk/github', { username: 'torvalds' }), (s, b) =>
      b.status && b.login === 'torvalds' ? null : b.error || 'profil kosong');

    // --- BATCH 2.0: brat, qc, upload, stalk pin, primbon ---
    await call('GET /api/tools/brat?type=cewek (LIVE)', get('/api/tools/brat?type=cewek&text=halo%20kamu'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image) return 'image kosong';
      if (!b.image.startsWith('iVBOR') && !b.image.startsWith('/9j')) return 'bukan base64 gambar';
      return null;
    });
    await call('POST /api/tools/qc (LIVE)', post('/api/tools/qc', { name: 'Kyy', text: 'halo ges balik lagi sama gw', color: 'dark' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image) return 'image kosong';
      if (!b.image.startsWith('iVBOR') && !b.image.startsWith('/9j')) return 'bukan base64 gambar';
      return null;
    });
    await call('POST /api/tools/upload (LIVE)', post('/api/tools/upload', {
      b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      mime: 'image/png', name: 'pixel',
    }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.url || !b.url.startsWith('https://')) return 'url invalid: ' + b.url;
      return null;
    });
    await call('GET /api/stalk/pinterest (LIVE)', get('/api/stalk/pinterest?username=dims'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.user || !b.user.username) return 'user kosong';
      return null;
    });
    await call('GET /api/primbon?type=artinama (LIVE)', get('/api/primbon?type=artinama&nama=rifky'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.arti) return 'arti kosong';
      return null;
    });
    await call('GET /api/primbon?type=cocok (LIVE)', get('/api/primbon?type=cocok&nama1=rifky&nama2=ayu'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result) return 'result kosong';
      return null;
    });
    await call('GET /api/primbon?type=zodiak (LIVE)', get('/api/primbon?type=zodiak&zodiak=leo'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result) return 'result kosong';
      return null;
    });
    await call('QC warna aneh -> fallback dark', post('/api/tools/qc', { name: 'Kyy', text: 'tes', color: 'hijaulumut' }), (s, b) =>
      b.status ? null : 'harusnya fallback ke dark, bukan error');
    await call('Brat teks kosong -> error ramah', get('/api/tools/brat?type=cewek&text='), (s, b) =>
      !b.status && b.error ? null : 'harusnya error');

    // --- BATCH 3.0: search & stalk game ---
    await call('GET /api/search/lyrics (LIVE)', get('/api/search/lyrics?q=mata%20ke%20hati'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.lyric || b.result.lyric.length < 100) return 'lirik kosong/pendek';
      return null;
    });
    await call('GET /api/search/pinterest (LIVE)', get('/api/search/pinterest?q=aesthetic%20anime'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.images?.length) return 'gambar kosong';
      return null;
    });
    await call('GET /api/stalk/ff (LIVE)', get('/api/stalk/ff?uid=195090825'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.user || !b.user.name) return 'user FF kosong';
      return null;
    });
    await call('GET /api/stalk/roblox (LIVE)', get('/api/stalk/roblox?username=builderman'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.user || String(b.user.username).toLowerCase() !== 'builderman') return 'user roblox salah';
      return null;
    });
    await call('FF UID ngawur -> error ramah', get('/api/stalk/ff?uid=12'), (s, b) =>
      !b.status && b.error ? null : 'UID pendek harusnya ditolak');

    // --- BATCH 4.0: AI ZONE ---
    await call('POST /api/ai/image (LIVE)', post('/api/ai/image', { prompt: 'kucing astronot lucu di luar angkasa, detail, neon', ratio: '1:1' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !b.result.url) return 'url kosong';
      return null;
    });
    await call('AI image prompt jorok -> ditolak', post('/api/ai/image', { prompt: 'hentai girl', ratio: '1:1' }), (s, b) =>
      !b.status ? null : 'prompt jorok HARUS DITOLAK');
    await call('POST /api/ai/chat (LIVE)', post('/api/ai/chat', { text: 'halo simi' }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.reply || b.reply.length < 2) return 'balasan kosong';
      return null;
    });
    await call('POST /api/ai/math (aritmatika lokal)', post('/api/ai/math', { text: '2*12+3' }), (s, b) => {
      if (!b.status) return b.error;
      if (!String(b.answer || '').includes('27')) return 'jawaban lokal salah: ' + b.answer;
      if (b.mode !== 'local') return 'harus mode local';
      return null;
    });
    await call('GET /api/tools/libur (LIVE)', get('/api/tools/libur'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result || !Array.isArray(b.result.nasional)) return 'data libur kosong';
      return null;
    });
    await call('GET /api/random/ppcouple (LIVE)', get('/api/random/ppcouple'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.result?.cowo?.url || !b.result?.cewe?.url) return 'couple kosong';
      return null;
    });
    await call('GET /api/random/anime (LIVE)', get('/api/random/anime'), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image || !b.mime) return 'image kosong';
      return null;
    });

    // --- BATCH 5.0: removebg ---
    const tinyJpg = require('fs').existsSync('/tmp/test-bg.png')
      ? require('fs').readFileSync('/tmp/test-bg.png').toString('base64')
      : null;
    if (tinyJpg) await call('POST /api/tools/removebg (LIVE)', post('/api/tools/removebg', { b64: tinyJpg }), (s, b) => {
      if (!b.status) return b.error;
      if (!b.image || !b.image.startsWith('iVBOR')) return 'png hasil removebg invalid';
      return null;
    });
    await call('RemoveBG kosong -> error ramah', post('/api/tools/removebg', { b64: '' }), (s, b) =>
      !b.status && b.error ? null : 'harusnya error');

    // --- BATCH 6.0: cuaca ---
    await call('GET /api/tools/cuaca (LIVE)', get('/api/tools/cuaca?kota=Pati'), (s, b) => {
      if (!b.status) return b.error;
      if (typeof b.result?.suhu !== 'number') return 'suhu kosong';
      if (!b.result.icon) return 'icon kosong';
      return null;
    });
    await call('Cuaca kota kosong -> error ramah', get('/api/tools/cuaca?kota='), (s, b) =>
      !b.status && b.error ? null : 'harusnya error');

    // --- BATCH 7.0 (v3): game gratisan ---
    await call('GET /api/games/free (LIVE)', get('/api/games/free'), (s, b) => {
      if (!b.status) return b.error;
      const g = b.result?.[0];
      if (!Array.isArray(b.result) || !b.result.length) return 'list game kosong';
      if (!g.title || !g.thumb || !g.url) return 'field game tidak lengkap';
      return null;
    });
  } else {
    console.log('ℹ️  Lewati test LIVE downloader (jalankan dengan --live untuk mengaktifkan)');
  }

  // 10. Route 404
  await call('GET /api/ngawur (harus 404)', get('/api/ngawur'), (s, b) =>
    s === 404 && !b.status ? null : 'harusnya 404');

  console.log('='.repeat(60));
  console.log(`HASIL: ${passed} lolos, ${failed} gagal\n`);
  process.exit(failed ? 1 : 0);
})();
