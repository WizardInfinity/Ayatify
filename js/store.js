/**
 * Ayatify - Lapisan penyimpanan lokal
 * Karena web ini tidak pakai database, semua data milik pengguna
 * (bookmark, terakhir dibaca, preferensi) disimpan di localStorage browser.
 */
const LS_KEYS = {
  BOOKMARKS: "ayatify_bookmarks",
  LAST_READ: "ayatify_last_read",
  SETTINGS: "ayatify_settings",
};

const DEFAULT_SETTINGS = {
  theme: "system", // "system" | "light" | "dark"
  fontSize: 3, // 1 (terkecil) - 5 (terbesar)
  qari: "05", // default: Misyari Rasyid Al-Afasy
  showLatin: true,
  showTerjemahan: true,
};

function safeParse(raw, fallback) {
  try {
    const val = JSON.parse(raw);
    return val ?? fallback;
  } catch (e) {
    return fallback;
  }
}

const AyatifyStore = {
  // ---------- Pengaturan ----------
  getSettings() {
    const raw = localStorage.getItem(LS_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...safeParse(raw, {}) };
  },
  saveSettings(settings) {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // ---------- Terakhir dibaca ----------
  getLastRead() {
    const raw = localStorage.getItem(LS_KEYS.LAST_READ);
    return safeParse(raw, null);
  },
  setLastRead({ surahNomor, surahNama, ayatNomor }) {
    const data = {
      surahNomor,
      surahNama,
      ayatNomor,
      waktu: Date.now(),
    };
    localStorage.setItem(LS_KEYS.LAST_READ, JSON.stringify(data));
    return data;
  },
  clearLastRead() {
    localStorage.removeItem(LS_KEYS.LAST_READ);
  },

  // ---------- Bookmark ----------
  getBookmarks() {
    const raw = localStorage.getItem(LS_KEYS.BOOKMARKS);
    return safeParse(raw, []);
  },
  isBookmarked(surahNomor, ayatNomor) {
    return this.getBookmarks().some(
      (b) => b.surahNomor === surahNomor && b.ayatNomor === ayatNomor
    );
  },
  toggleBookmark({ surahNomor, surahNama, ayatNomor, teksArab, teksLatin }) {
    const list = this.getBookmarks();
    const idx = list.findIndex(
      (b) => b.surahNomor === surahNomor && b.ayatNomor === ayatNomor
    );
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.unshift({
        surahNomor,
        surahNama,
        ayatNomor,
        teksArab,
        teksLatin,
        waktu: Date.now(),
      });
    }
    localStorage.setItem(LS_KEYS.BOOKMARKS, JSON.stringify(list));
    return list;
  },
  removeBookmark(surahNomor, ayatNomor) {
    const list = this.getBookmarks().filter(
      (b) => !(b.surahNomor === surahNomor && b.ayatNomor === ayatNomor)
    );
    localStorage.setItem(LS_KEYS.BOOKMARKS, JSON.stringify(list));
    return list;
  },
};
