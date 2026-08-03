/**
 * Ayatify - Aplikasi utama (Alpine.js)
 * Single Page Application murni client-side: routing pakai hash (#/...),
 * data ambil dari API (js/api.js), state pengguna disimpan di localStorage
 * (js/store.js). Tidak ada backend/database sendiri.
 */
function ayatifyApp() {
  return {
    // ---------------- State umum ----------------
    page: "home", // home | surah | juz | bookmark | settings | about
    loading: false, // loading daftar surah (dipakai saat pertama kali buka web)
    loadingSurah: false, // loading khusus halaman baca surah
    loadingJuz: false, // loading khusus halaman baca juz
    error: "",
    isOnline: navigator.onLine,
    _requestId: 0, // penanda request terbaru, supaya respons yang sudah usang (setelah user pindah halaman) diabaikan

    // ---------------- Data ----------------
    surahList: [],
    searchQuery: "",
    currentSurah: null, // { nomor, nama, namaLatin, arti, tempatTurun, deskripsi, ayat:[...] }
    currentJuzNumber: null,
    currentJuzParts: [], // hasil getJuz(): array {nomor, namaLatin, ayat}
    inSurahQuery: "", // cari ayat di dalam surah yang sedang dibuka
    activeAyat: null, // key "surah:ayat" yang detailnya sedang terbuka
    bookmarks: [],
    lastRead: null,
    settings: {},

    // ---------------- Audio ----------------
    audio: {
      playing: false,
      loading: false,
      key: null, // "surahNomor:ayatNomor"
      label: "",
    },

    // ---------------- Lain-lain ----------------
    qariList: QARI_LIST,
    juzNumbers: Array.from({ length: 30 }, (_, i) => i + 1),
    deferredInstallPrompt: null,
    toast: "",

    // =================================================================
    // INIT
    // =================================================================
    init() {
      this.settings = AyatifyStore.getSettings();
      this.bookmarks = AyatifyStore.getBookmarks();
      this.lastRead = AyatifyStore.getLastRead();
      this.applyTheme();
      this.applyFontSize();

      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
          if (this.settings.theme === "system") this.applyTheme();
        });

      window.addEventListener("online", () => (this.isOnline = true));
      window.addEventListener("offline", () => (this.isOnline = false));

      window.addEventListener("hashchange", () => this.handleRoute());
      this.loadSurahList().then(() => this.handleRoute());

      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
      });

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").catch(() => {});
      }

      this.$watch("settings", (val) => AyatifyStore.saveSettings(val), {
        deep: true,
      });
    },

    // =================================================================
    // ROUTING (hash-based, tanpa library router)
    // =================================================================
    handleRoute() {
      const hash = window.location.hash.replace(/^#\/?/, "");
      const parts = hash.split("/").filter(Boolean);
      this.error = "";
      this.activeAyat = null;
      window.scrollTo({ top: 0, behavior: "instant" });

      if (parts.length === 0) {
        this.page = "home";
      } else if (parts[0] === "surah" && parts[1]) {
        this.page = "surah";
        this.openSurah(Number(parts[1]), parts[2] ? Number(parts[2]) : null);
      } else if (parts[0] === "juz" && parts[1]) {
        this.page = "juz";
        this.openJuz(Number(parts[1]));
      } else if (parts[0] === "bookmark") {
        this.page = "bookmark";
        this.bookmarks = AyatifyStore.getBookmarks();
      } else if (parts[0] === "pengaturan") {
        this.page = "settings";
      } else if (parts[0] === "tentang") {
        this.page = "about";
      } else {
        this.page = "home";
      }
    },
    goTo(hash) {
      window.location.hash = hash;
    },

    // =================================================================
    // DATA: daftar surah
    // =================================================================
    async loadSurahList() {
      this.loading = true;
      this.error = "";
      try {
        this.surahList = await AyatifyAPI.getSurahList();
      } catch (e) {
        this.error = e.message || "Gagal memuat daftar surah. Periksa koneksi internet kamu.";
      } finally {
        this.loading = false;
      }
    },
    get filteredSurahList() {
      const q = this.searchQuery.trim().toLowerCase();
      if (!q) return this.surahList;
      return this.surahList.filter((s) => {
        return (
          s.namaLatin.toLowerCase().includes(q) ||
          s.arti.toLowerCase().includes(q) ||
          String(s.nomor) === q
        );
      });
    },

    // =================================================================
    // DATA: buka surah (mode mushaf)
    // =================================================================
    async openSurah(nomor, scrollToAyatNomor) {
      const reqId = ++this._requestId;
      this._lastSurahNomor = nomor;
      this.loadingSurah = true;
      this.error = "";
      this.currentSurah = null;
      this.inSurahQuery = "";
      try {
        const [surah, tafsir] = await Promise.all([
          AyatifyAPI.getSurah(nomor),
          AyatifyAPI.getTafsir(nomor).catch(() => null),
        ]);
        if (reqId !== this._requestId) return; // user sudah pindah halaman, abaikan hasil ini

        const tafsirMap = new Map();
        if (tafsir && Array.isArray(tafsir.tafsir)) {
          tafsir.tafsir.forEach((t) => tafsirMap.set(t.ayat, t.teks));
        }
        surah.ayat = surah.ayat.map((a) => ({
          ...a,
          tafsir: tafsirMap.get(a.nomorAyat) || "Tafsir belum tersedia untuk ayat ini.",
        }));
        this.currentSurah = surah;
        this.$nextTick(() => {
          if (scrollToAyatNomor) this.scrollToAyat(scrollToAyatNomor);
        });
      } catch (e) {
        if (reqId !== this._requestId) return;
        this.error = e.message || "Gagal memuat surah. Periksa koneksi internet kamu.";
      } finally {
        if (reqId === this._requestId) this.loadingSurah = false;
      }
    },
    /** Dipanggil oleh tombol "Coba Lagi" saat gagal memuat surah */
    retryOpenSurah() {
      if (this._lastSurahNomor) this.openSurah(this._lastSurahNomor);
    },
    get filteredSurahAyat() {
      if (!this.currentSurah) return [];
      const q = this.inSurahQuery.trim().toLowerCase();
      if (!q) return this.currentSurah.ayat;
      return this.currentSurah.ayat.filter(
        (a) =>
          String(a.nomorAyat) === q ||
          (a.teksLatin && a.teksLatin.toLowerCase().includes(q)) ||
          (a.teksIndonesia && a.teksIndonesia.toLowerCase().includes(q))
      );
    },
    scrollToAyat(nomorAyat) {
      const el = document.getElementById(`ayat-${nomorAyat}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        this.activeAyat = `${this.currentSurah.nomor}:${nomorAyat}`;
      }
    },

    // =================================================================
    // DATA: buka juz (mode mushaf, gabungan beberapa surah)
    // =================================================================
    async openJuz(nomor) {
      const reqId = ++this._requestId;
      this._lastJuzNumber = nomor;
      this.loadingJuz = true;
      this.error = "";
      this.currentJuzParts = [];
      this.currentJuzNumber = nomor;
      try {
        const parts = await AyatifyAPI.getJuz(nomor);
        if (reqId !== this._requestId) return;
        // ambil tafsir untuk tiap surah yang muncul di juz ini
        const withTafsir = await Promise.all(
          parts.map(async (p) => {
            const tafsir = await AyatifyAPI.getTafsir(p.nomor).catch(() => null);
            const tafsirMap = new Map();
            if (tafsir && Array.isArray(tafsir.tafsir)) {
              tafsir.tafsir.forEach((t) => tafsirMap.set(t.ayat, t.teks));
            }
            return {
              ...p,
              ayat: p.ayat.map((a) => ({
                ...a,
                tafsir:
                  tafsirMap.get(a.nomorAyat) ||
                  "Tafsir belum tersedia untuk ayat ini.",
              })),
            };
          })
        );
        if (reqId !== this._requestId) return;
        this.currentJuzParts = withTafsir;
      } catch (e) {
        if (reqId !== this._requestId) return;
        this.error = e.message || "Gagal memuat juz. Periksa koneksi internet kamu.";
      } finally {
        if (reqId === this._requestId) this.loadingJuz = false;
      }
    },
    /** Dipanggil oleh tombol "Coba Lagi" saat gagal memuat juz */
    retryOpenJuz() {
      if (this._lastJuzNumber) this.openJuz(this._lastJuzNumber);
    },

    // =================================================================
    // AKSI: toggle detail ayat (latin/terjemahan/tafsir/audio/bookmark)
    // =================================================================
    toggleAyatDetail(surahNomor, ayatNomor) {
      const key = `${surahNomor}:${ayatNomor}`;
      this.activeAyat = this.activeAyat === key ? null : key;
    },
    isAyatActive(surahNomor, ayatNomor) {
      return this.activeAyat === `${surahNomor}:${ayatNomor}`;
    },
    /** Cari data ayat + info surah induk yang sedang aktif detailnya, dipakai di halaman surah maupun juz */
    get activeAyatData() {
      if (!this.activeAyat) return null;
      const [surahNomor, ayatNomor] = this.activeAyat.split(":").map(Number);

      if (this.page === "surah" && this.currentSurah) {
        const ayat = this.currentSurah.ayat.find((a) => a.nomorAyat === ayatNomor);
        if (ayat) return { surahNomor, surahNama: this.currentSurah.namaLatin, ayat };
      }
      if (this.page === "juz" && this.currentJuzParts.length) {
        const part = this.currentJuzParts.find((p) => p.nomor === surahNomor);
        const ayat = part && part.ayat.find((a) => a.nomorAyat === ayatNomor);
        if (ayat) return { surahNomor, surahNama: part.namaLatin, ayat };
      }
      return null;
    },

    // =================================================================
    // AKSI: bookmark
    // =================================================================
    isBookmarked(surahNomor, ayatNomor) {
      return this.bookmarks.some(
        (b) => b.surahNomor === surahNomor && b.ayatNomor === ayatNomor
      );
    },
    toggleBookmark(surahNomor, surahNama, ayat) {
      this.bookmarks = AyatifyStore.toggleBookmark({
        surahNomor,
        surahNama,
        ayatNomor: ayat.nomorAyat,
        teksArab: ayat.teksArab,
        teksLatin: ayat.teksLatin,
      });
      this.showToast(
        this.isBookmarked(surahNomor, ayat.nomorAyat)
          ? "Ayat ditambahkan ke bookmark"
          : "Ayat dihapus dari bookmark"
      );
    },
    removeBookmark(surahNomor, ayatNomor) {
      this.bookmarks = AyatifyStore.removeBookmark(surahNomor, ayatNomor);
    },

    // =================================================================
    // AKSI: terakhir dibaca
    // =================================================================
    markAsLastRead(surahNomor, surahNama, ayatNomor) {
      this.lastRead = AyatifyStore.setLastRead({
        surahNomor,
        surahNama,
        ayatNomor,
      });
      this.showToast("Ditandai sebagai terakhir dibaca");
    },
    continueLastRead() {
      if (!this.lastRead) return;
      this.goTo(`surah/${this.lastRead.surahNomor}/${this.lastRead.ayatNomor}`);
    },

    // =================================================================
    // AKSI: audio murottal
    // =================================================================
    playAyat(surahNomor, ayatNomor, audioUrls) {
      const key = `${surahNomor}:${ayatNomor}`;
      const player = this.$refs.audioPlayer;
      const url = audioUrls[this.settings.qari];

      if (this.audio.key === key && !player.paused) {
        player.pause();
        return;
      }
      if (!url) {
        this.showToast("Audio untuk qari ini tidak tersedia pada ayat ini");
        return;
      }
      this.audio.loading = true;
      this.audio.key = key;
      this.audio.label = `QS ${surahNomor}:${ayatNomor}`;
      player.src = url;
      player.play().catch(() => {
        this.showToast("Gagal memutar audio");
        this.audio.loading = false;
      });
    },
    onAudioPlaying() {
      this.audio.playing = true;
      this.audio.loading = false;
    },
    onAudioPause() {
      this.audio.playing = false;
    },
    onAudioEnded() {
      this.audio.playing = false;
      this.audio.key = null;
    },
    stopAudio() {
      const player = this.$refs.audioPlayer;
      if (player) {
        player.pause();
        player.currentTime = 0;
      }
      this.audio.key = null;
      this.audio.playing = false;
    },

    // =================================================================
    // PENGATURAN: tema (system / light / dark)
    // =================================================================
    setTheme(mode) {
      this.settings.theme = mode;
      this.applyTheme();
    },
    applyTheme() {
      const root = document.documentElement;
      const wantDark =
        this.settings.theme === "dark" ||
        (this.settings.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", wantDark);
    },

    // =================================================================
    // PENGATURAN: ukuran huruf (1-5)
    // =================================================================
    setFontSize(level) {
      this.settings.fontSize = level;
      this.applyFontSize();
    },
    applyFontSize() {
      document.documentElement.setAttribute(
        "data-font-size",
        this.settings.fontSize
      );
    },
    get arabicSizeClass() {
      return (
        {
          1: "text-xl leading-loose md:text-2xl",
          2: "text-2xl leading-loose md:text-3xl",
          3: "text-3xl leading-loose md:text-4xl",
          4: "text-4xl leading-loose md:text-5xl",
          5: "text-5xl leading-loose md:text-6xl",
        }[this.settings.fontSize] || "text-3xl leading-loose md:text-4xl"
      );
    },
    get latinSizeClass() {
      return (
        {
          1: "text-xs",
          2: "text-sm",
          3: "text-base",
          4: "text-lg",
          5: "text-xl",
        }[this.settings.fontSize] || "text-base"
      );
    },

    // =================================================================
    // UTIL
    // =================================================================
    showToast(msg) {
      this.toast = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => (this.toast = ""), 2200);
    },
    formatWaktu(ts) {
      if (!ts) return "";
      return new Date(ts).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },
    qariName(code) {
      const q = this.qariList.find((x) => x.code === code);
      return q ? q.name : code;
    },
    async installApp() {
      if (!this.deferredInstallPrompt) return;
      this.deferredInstallPrompt.prompt();
      await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
    },
  };
}
