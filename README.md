# ⚡ All Tools KYY

**All-in-One Tools Portal** dengan tema **dark cyber/neon** interaktif — siap deploy ke **Netlify**.

> 👑 Developer: **Rifkyy sensei**
> Logika downloader di-port dari scraper bot WhatsApp (`src/scraper/`: `aio.js`, `tiktok.js`, `ig.js`, `ytdl.js`, `fbdown.js`) menjadi REST API serverless.

---

## 🧰 Daftar Tools (32)

| Kategori | Tools |
|---|---|
| ⬇️ **Downloader** | AIO Auto-Detect · TikTok (No-WM/HD/MP3/slideshow) · Instagram (reel/post/story) · YouTube (MP4+MP3) · Facebook · Twitter/X |
| 🎨 **Maker** (Canvas browser) | Meme Generator (100+ template, teks bisa digeser) · Fake Chat WA · **IQC iMessage** · Nulis Kertas · Code Snapshot · Music Card · Tanya Ustadz · Windows Quotes · Quote Card |
| 🛠️ **Tools** | QR Generator · Calculator (aman) · Password Generator · Morse (+audio) · Base64 · Word Counter · Fancy Text · Stalk TikTok · GitHub Stalk · Cek IP · Jadwal Sholat · TTS · Random Picker · Unit Converter · Web Screenshot · Cek Random · Riwayat Download |

**Fitur aplikasi:** status API real-time (`● Online` + latency), panel deteksi pengunjung (negara 🇮🇩/device/browser/OS/IP), tab filter + pencarian, kartu kaca glow-interaktif, aurora + grid + partikel canvas, modal kaca, toast, dan **mobile-first responsive**.

---

## 📁 Struktur Folder

```
all-tools-kyy/
├── netlify.toml              # publish dir, functions dir, redirects /api/*, headers
├── package.json              # deps: axios, qrcode, cheerio (pure JS)
├── .gitignore
├── .env.example              # PORT, RAPIDAPI_KEY (opsional, saat ini tidak dipakai)
├── README.md
├── netlify/
│   └── functions/
│       └── api.js            # SEMUA endpoint /api/* (router + scraper + tools)
├── public/                   # yang di-publish ke Netlify
│   ├── index.html
│   ├── css/style.css         # tema neon cyber (aurora, glass, grid)
│   ├── js/app.js             # semua logika interaktif + canvas maker
│   └── img/                  # logo, hero & avatar (AI-generated)
│       ├── logo.png · hero.png · dev.png
└── test/
    └── run-tests.js          # test API tanpa deploy
```

---

## 🚀 Deploy ke Netlify

> ⚠️ **PENTING:** Deploy lewat **GitHub** atau **CLI** — **JANGAN drag-and-drop folder**,
> karena drag-and-drop (manual deploy) **tidak mem-build Netlify Functions**
> sehingga semua endpoint `/api/*` akan 404.

### Cara A — via GitHub (disarankan)

1. Buat repo kosong di GitHub (mis. `all-tools-kyy`).
2. Di folder project:
   ```bash
   git init
   git add .
   git commit -m "⚡ All Tools KYY"
   git branch -M main
   git remote add origin https://github.com/USERNAME/all-tools-kyy.git
   git push -u origin main
   ```
3. Buka [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** → pilih GitHub → pilih repo.
4. Netlify otomatis membaca `netlify.toml`:
   - Build command: `npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
5. Klik **Deploy**. Setelah live, cek `https://SITUSMU.netlify.app/api/health` harus mengembalikan JSON `status:true`.

### Cara B — via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
cd all-tools-kyy
netlify deploy --build --prod
```

---

## 💻 Menjalankan Lokal

### Cara 1 — dengan Netlify CLI (mirip production, functions ikut jalan)
```bash
npm install
npx netlify dev        # buka http://localhost:8888
```

### Cara 2 — cepat tanpa CLI (frontend saja + uji API via test)
```bash
npm install
node test/run-tests.js          # uji semua endpoint
node test/run-tests.js --live   # + uji downloader TikTok sungguhan
```

Semua route API juga bisa dipanggil langsung:
```bash
curl https://SITUSMU.netlify.app/api/health
curl -X POST https://SITUSMU.netlify.app/api/tools/password \
  -H "Content-Type: application/json" -d '{"length":20}'
```

## 🔌 Daftar Endpoint API

| Method | Endpoint | Body (JSON) | Fungsi |
|---|---|---|---|
| GET | `/api/health` | – | Status API |
| GET | `/api/info` | – | Negara (ipapi.co → ipwho.is → ip-api.com + cache), device, browser, OS, IP |
| GET | `/api/memes` | – | 100 template meme populer (imgflip, cache 6 jam) — untuk Meme Generator |
| POST | `/api/stalk/tiktok` | `username` | Info profil + statistik akun TikTok publik (tikwm user/info) |
| POST | `/api/stalk/github` | `username` | Profil GitHub (api.github.com, cache 10 mnt) |
| POST | `/api/tools/ustadz` | `text` | Meme "Tanya Ustadz" (PORT dari `plugins/canvas/pakustad.js`) |
| POST | `/api/sholat/cari` | `kota` | Cari kota (myQuran) |
| POST | `/api/sholat/jadwal` | `kotaId / kota` | Jadwal sholat hari ini (Asia/Jakarta) |
| POST | `/api/tools/ipgeo` | `ip` | Geo lookup IP (negara/kota/ISP/zona waktu) |
| POST | `/api/tools/qrcode` | `text, size?, colorDark?, colorLight?` | PNG data URL |
| POST | `/api/tools/password` | `length, upper, lower, numbers, symbols` | Password + entropi + label kekuatan |
| POST | `/api/tools/morse` | `text, mode: encode/decode` | Konversi morse |
| POST | `/api/tools/base64` | `text, mode: encode/decode` | Base64 |
| POST | `/api/tools/calc` | `expression` | Kalkulator aman (whitelist + parser, tanpa `eval`) |
| POST | `/api/downloader/tiktok` | `url` | TikTok No-WM/HD/MP3/slideshow |
| POST | `/api/downloader/instagram` | `url` | IG reel/post/carousel/story |
| POST | `/api/downloader/youtube` | `url` | YouTube MP4 + MP3 + metadata |
| POST | `/api/downloader/aio` | `url` | Auto-detect semua platform |

Semua respons: `{ "status": true/false, ... }` dengan pesan error yang ramah.

---

## 🧬 Scraper yang Di-port (dari bot WA)

| File bot | Yang di-port |
|---|---|
| `aio.js` | Pola `detectPlatform()` (tabel pola domain), handler TikTok **tikwm.com/api** (header `Origin/Referer/X-Requested-With`), router platform + **fallback savefbs.com** (disalin & di-update ke markup 2026) |
| `tiktok.js` | Fallback **musicaldown.com** (cheerio: ambil form → POST dengan cookie) dan **yuulabs API** |
| `ig.js` | **fastdl.app** dengan signature HMAC-SHA256 (`ts = msec×1000 − 450`, `_ts/_sv/_s`) — tetap di-port sbg sumber ke-3, + sumber publik yuulabs/azbry sebagai utama |
| `ytdl.js` | Alur **ymcdn** (`/api/v1/init → convertURL → polling progressURL → downloadURL`) + metadata via YouTube oEmbed |
| `fbdown.js` | Pola "wrapper API publik 1-GET" → dipakai untuk sumber IG cadangan (azbry/yuulabs) |

---

## ⚖️ Catatan Legal / ToS

- Tools downloader hanya untuk **konten milik sendiri** atau konten yang pemiliknya **mengizinkan** diunduh. Mengunduh konten berhak cipta tanpa izin melanggar hukum & **Terms of Service** TikTok/Instagram/YouTube.
- Endpoint scraper memakai layanan pihak ketiga yang bisa **berubah/rate-limit/captcha** kapan saja — kode sudah menyiapkan **multi-source fallback**, tapi tidak ada jaminan 100% uptime.
- Jangan gunakan untuk mass-scraping/spam. Sudah ada rate-limit dasar (15 req/menit/IP) di endpoint downloader.
- Risiko penggunaan ditanggung pengguna. 👮

---

© 2026 **⚡ All Tools KYY** — crafted with 💜 by **Rifkyy sensei**
