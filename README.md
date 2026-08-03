# Ayatify — Platform Baca Al-Qur'an Online

Web responsif untuk membaca Al-Qur'an: teks Arab mode **mushaf**, transliterasi
latin, terjemahan Kemenag, tafsir per-ayat, audio murottal (5 pilihan qari),
navigasi per Surah & per Juz, bookmark, dan **terakhir dibaca** hingga semuanya
tersimpan di perangkat pengguna (localStorage), **tanpa database/backend**.

## Stack

- HTML + CSS + JavaScript murni (vanilla)
- [Tailwind CSS](https://tailwindcss.com) via CDN (Play CDN)
- [Alpine.js](https://alpinejs.dev) via CDN, state & interaktivitas
- Data Al-Qur'an dari API publik **[EQuran.id](https://equran.id)**
- PWA (bisa dipasang & dibuka offline untuk surah yang pernah dibuka)

---

## Menjalankan di lokal

Karena `fetch()` ke API dan Service Worker butuh diakses lewat `http://`
(bukan `file://`), buka project ini lewat **live server**, bukan cukup
klik dua kali `index.html`.

### Langkah-langkah

1. **Install VSCode** (jika belum): https://code.visualstudio.com
2. **Buka folder project**
   - Buka VSCode → `File > Open Folder…` → pilih folder `ayatify`
3. **Install ekstensi "Live Server"** (oleh Ritwick Dey)
   - Buka tab Extensions (ikon kotak di sidebar kiri, atau `Ctrl+Shift+X`)
   - Cari `Live Server`, klik **Install**
4. **Jalankan**
   - Klik kanan pada `index.html` di panel Explorer → **"Open with Live Server"**
   - Atau klik tombol **"Go Live"** di pojok kanan bawah VSCode
   - Browser otomatis terbuka di alamat seperti `http://127.0.0.1:5500`
5. Selesai.

### Alternatif tanpa ekstensi (pakai terminal)

Jika tidak mau pasang ekstensi, jalankan salah satu perintah ini di terminal VSCode (`Terminal > New Terminal`) dari dalam folder `ayatify`:

```bash
# Jika ada Python 3
python3 -m http.server 5500

# Jika ada Node.js
npx serve . -l 5500
```

Lalu buka `http://localhost:5500` di browser.

---