# Vinylo

Web music player: cari lagu, lihat rekomendasi di beranda, dan putar langsung
dari browser. Frontend React + Vite, serverless functions kecil di `/api`
buat proxy ke sumber data (biar nggak kena CORS dan biar upstream nggak
nempel di kode client).

## Alur sumber data (v2 — Spotify-based)

**Cari lagu** → Spotify internal partner API (`api-partner.spotify.com`,
API yang sama dipakai open.spotify.com sendiri).

**Putar lagu** → dicoba berurutan, otomatis pindah ke yang berikutnya kalau
satu gagal/timeout:
1. **spotyloader.com** — bikin job convert, di-poll tiap 2.5 detik (rata-rata
   selesai ~8 detik, dikasih waktu maksimal ~50 detik sebelum nyerah).
2. **myspoty.app** — lookup langsung, satu request, cepat.
3. **YouTube** (azbry) — cari video dengan judul+artis yang sama, lalu
   convert ke mp3. Ini cuma dipakai kalau dua sumber Spotify di atas gagal.

Status "lagi nyoba sumber mana" ditampilkan di mini player & full player
(misalnya "Mencoba sumber cadangan…").

## Autentikasi pencarian Spotify (self-refreshing)

`api/search.js` **tidak lagi pakai token yang di-copy manual dari DevTools.**
Sekarang dia meniru cara open.spotify.com sendiri login sebagai web player:
generate kode TOTP → tukar jadi access token → tukar lagi jadi client-token
→ baru query search. Token hasilnya di-cache di memory dan otomatis
di-refresh begitu mau expired — nggak perlu sentuh apa pun secara manual
lagi.

⚠️ Ini tetap bukan API resmi/didokumentasikan. Kalau Spotify suatu saat
mengubah secret TOTP, versi client, atau hash query yang dipakai, endpoint
ini bisa berhenti kerja sampai nilainya diperbarui di `api/search.js`
(`TOTP_SECRET`, `TOTP_VERSION`, `CLIENT_VERSION`, `SEARCH_SHA256`) — tapi ini
jauh lebih jarang terjadi dibanding token pribadi yang expired tiap jam.

Sebagai jaring pengaman tambahan, kalau proses auto-auth ini gagal total,
kode otomatis coba fallback ke `SPOTIFY_BEARER` / `SPOTIFY_CLIENT_TOKEN` dari
Environment Variables Vercel — kalau kamu masih menyimpan token manual lama
di sana, biarkan saja, nggak ganggu; kalau tidak ada, tidak masalah juga.

Selama env var itu belum di-set, kode otomatis pakai token default yang
sudah ditulis di `api/search.js` sebagai fallback — jadi langsung jalan dulu,
tinggal diganti kalau sudah mulai gagal.

## Menjalankan di lokal

```bash
npm install
npx vercel dev
```

Pakai `vercel dev` (bukan `npm run dev` polos) supaya folder `/api` ikut
jalan sebagai serverless function persis seperti di production. Kalau belum
ada Vercel CLI: `npm i -g vercel`.

## Deploy ke Vercel via GitHub

1. Push folder ini ke repo GitHub baru.
2. Di [vercel.com](https://vercel.com) → **Add New Project** → import repo
   itu. Vercel otomatis kebaca sebagai project Vite + akan build folder
   `/api` jadi serverless functions, nggak perlu config tambahan.
3. (Opsional tapi disarankan) set `SPOTIFY_BEARER` & `SPOTIFY_CLIENT_TOKEN`
   di Environment Variables sebelum deploy pertama.
4. Deploy.

## Struktur

```
api/
  search.js              → PRIMARY: search via Spotify partner API
  spotify-start.js         → mulai job convert di spotyloader, balikin jobId
  spotify-status.js         → cek status job (dipoll dari frontend tiap 2.5s)
  spotify-fallback.js        → lookup cepat via myspoty.app (backup #1)
  youtube-search.js           → cari YouTube (backup terakhir, cuma dipanggil
                                 kalau spotyloader & myspoty berdua gagal)
  youtube-download.js          → convert YouTube ke mp3 (backup terakhir)
src/
  context/PlayerContext.jsx   → state pemutar + rantai fallback Spotify→myspoty→YouTube
  hooks/useAudioEngine.js     → wrapper tipis di atas <audio>
  components/
    HomeSections.jsx  → baris-baris rekomendasi di beranda (edit array SECTIONS untuk ubah)
    TrackCard.jsx      → card (beranda) & row (hasil pencarian)
    MiniPlayer.jsx      → cardbox panjang di bawah, tap buat expand, nunjukin status sumber lagi dicoba
    FullPlayer.jsx       → pemutar penuh (piringan hitam berputar, scrub bar, next/prev)
    SearchOverlay.jsx     → overlay pencarian dari ikon kaca pembesar
```

## Mengubah rekomendasi beranda

Edit array `SECTIONS` di `src/components/HomeSections.jsx` — tiap item cuma
`{ title, query }`, query-nya string pencarian biasa.

## Catatan kecepatan

Karena spotyloader butuh job+poll (bisa 8–50 detik), lagu nggak langsung
main secepat versi YouTube-only sebelumnya. Kalau mau lebih cepat, bisa
tukar urutan di `resolveAndLoad` (`src/context/PlayerContext.jsx`) supaya
`tryFallback` (myspoty, satu request cepat) dicoba duluan sebelum
`trySpotify` (job+poll) — tinggal tukar urutan dua block try/finish itu.
