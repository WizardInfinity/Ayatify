# Ayatify — Platform Baca Al-Qur'an Online

Web responsif untuk membaca Al-Qur'an: teks Arab mode **mushaf**, transliterasi
latin, terjemahan Kemenag, tafsir per-ayat, audio murottal (5 pilihan qari),
navigasi per Surah & per Juz, bookmark, dan "terakhir dibaca" — semuanya
tersimpan di perangkat pengguna (localStorage), **tanpa database/backend**.

## Stack

- HTML + CSS + JavaScript murni (vanilla)
- [Tailwind CSS](https://tailwindcss.com) via CDN (Play CDN)
- [Alpine.js](https://alpinejs.dev) via CDN — state & interaktivitas
- Data Al-Qur'an dari API publik **[EQuran.id](https://equran.id)**
- PWA (bisa dipasang & dibuka offline untuk surah yang pernah dibuka)

## Struktur folder

```
ayatify/
├── index.html          # Seluruh halaman (SPA) ada di sini
├── manifest.json        # Konfigurasi PWA
├── sw.js                 # Service worker (cache offline)
├── css/
│   └── style.css         # Gaya kustom (font Arab, mode mushaf, dll)
├── js/
│   ├── juz-data.js       # Data batas 30 Juz (statis)
│   ├── api.js             # Semua pemanggilan ke API EQuran.id
│   ├── store.js           # Simpan/baca bookmark, last read, pengaturan
│   └── app.js              # Logika utama Alpine.js (state & routing)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 1. Menjalankan di VSCode (lokal)

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
5. Selesai — web sudah bisa dipakai. Setiap kamu simpan perubahan file, browser akan otomatis reload.

### Alternatif tanpa ekstensi (pakai terminal)

Jika tidak mau pasang ekstensi, jalankan salah satu perintah ini di terminal VSCode (`Terminal > New Terminal`) dari dalam folder `ayatify`:

```bash
# Jika ada Python 3
python3 -m http.server 5500

# Jika ada Node.js
npx serve . -l 5500
```

Lalu buka `http://localhost:5500` di browser.

> **Catatan:** Service Worker (fitur offline PWA) hanya aktif di `localhost`
> atau domain HTTPS — ini normal dan sesuai standar browser, bukan bug.

---

## 2. Deploy ke Netlify

### Cara termudah — Drag & Drop (tanpa Git)

1. Buka https://app.netlify.com dan login/daftar (gratis)
2. Di dashboard, klik **"Add new site" → "Deploy manually"**
3. **Drag & drop seluruh folder `ayatify`** (isi foldernya, bukan file zip) ke area upload
4. Tunggu beberapa detik — Netlify otomatis memberi URL seperti `random-name-123.netlify.app`
5. Selesai! Web sudah live dan bisa diakses siapa saja, lengkap dengan HTTPS (jadi PWA & Service Worker langsung berfungsi)

### Cara lain — Lewat Git (auto-deploy tiap kali push)

1. Push folder `ayatify` ini ke repository GitHub kamu
2. Di Netlify dashboard: **"Add new site" → "Import an existing project"**
3. Hubungkan akun GitHub, pilih repository-nya
4. Pada pengaturan build:
   - **Build command**: kosongkan (tidak perlu, karena tidak ada proses build)
   - **Publish directory**: `.` (folder root, atau sesuaikan jika `ayatify` ada di sub-folder repo)
5. Klik **Deploy site**

### Setelah deploy

- Ganti nama domain default lewat **Site settings → Change site name** jika mau URL yang lebih rapi, misalnya `ayatify.netlify.app`
- Domain kustom (misal `ayatify.com`) bisa dihubungkan lewat **Domain settings → Add a domain**

---

## Catatan penting

- **Tidak ada API key** yang perlu diatur — API EQuran.id bersifat publik dan gratis.
- **Tidak ada database**: bookmark, terakhir dibaca, dan pengaturan tema/ukuran huruf/qari semuanya tersimpan di `localStorage` browser pengguna masing-masing. Jika pengguna membersihkan data browser, data tersebut akan hilang.
- **Fitur Jadwal Sholat** sengaja dikunci (ikon gembok) karena masih dalam pengembangan, sesuai permintaan — tinggal dikembangkan lagi nanti di file `js/app.js` dan ditambahkan section baru di `index.html`.
- Untuk mengganti/menambah palet warna, cari class Tailwind seperti `blue-600`, `lime-500` (tema terang) dan `cyan-400`, `green-500` (tema gelap) di `index.html` — sengaja dipakai langsung dari palet Tailwind, bukan lewat `tailwind.config`, supaya mudah dicari & diganti.
