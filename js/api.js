/**
 * Ayatify - Lapisan API
 * Sumber data: EQuran.id (https://equran.id) - API publik gratis, teks Arab,
 * transliterasi latin, terjemahan Kemenag, tafsir Kemenag, dan audio 5 qari.
 * Tidak ada database sendiri: semua data diambil langsung dari API ini,
 * dengan cache sederhana di memori + localStorage supaya hemat kuota & cepat.
 */
const API_BASE = "https://equran.id/api/v2";
const CACHE_PREFIX = "ayatify_cache_";
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 hari
const REQUEST_TIMEOUT = 15000; // 15 detik - batas maksimal menunggu respons API

/** Daftar qari yang tersedia dari API (kode -> nama tampilan) */
const QARI_LIST = [
  { code: "01", name: "Abdullah Al-Juhany" },
  { code: "02", name: "Abdul Muhsin Al-Qasim" },
  { code: "03", name: "Abdurrahman As-Sudais" },
  { code: "04", name: "Ibrahim Al-Dossari" },
  { code: "05", name: "Misyari Rasyid Al-Afasy" },
];

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (Date.now() - t > CACHE_TTL) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ t: Date.now(), data })
    );
  } catch (e) {
    /* localStorage penuh, abaikan saja - bukan fatal */
  }
}

/**
 * fetch() bawaan browser tidak punya batas waktu sendiri - kalau server API
 * lambat/tidak merespons, promise-nya bisa menggantung tanpa batas dan bikin
 * status "loading" macet selamanya. Fungsi ini memaksa fetch untuk berhenti
 * dan melempar error setelah REQUEST_TIMEOUT, supaya UI selalu punya kepastian.
 */
async function fetchWithTimeout(url, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Koneksi ke server terlalu lama. Coba lagi.");
    }
    throw new Error("Tidak bisa terhubung ke server. Periksa koneksi internet kamu.");
  } finally {
    clearTimeout(timer);
  }
}

async function apiGet(path, cacheKey) {
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const res = await fetchWithTimeout(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat data (status ${res.status})`);
  }
  const json = await res.json();
  if (json.code && json.code !== 200) {
    throw new Error(json.message || "Gagal memuat data dari server");
  }
  writeCache(cacheKey, json.data);
  return json.data;
}

const AyatifyAPI = {
  /** Daftar 114 surah beserta info dasarnya */
  async getSurahList() {
    return apiGet("/surat", "surat_list");
  },

  /** Detail 1 surah lengkap dengan seluruh ayatnya (arab, latin, terjemahan, audio) */
  async getSurah(nomor) {
    return apiGet(`/surat/${nomor}`, `surat_${nomor}`);
  },

  /** Tafsir Kemenag per-ayat untuk 1 surah */
  async getTafsir(nomor) {
    return apiGet(`/tafsir/${nomor}`, `tafsir_${nomor}`);
  },

  /**
   * Ambil seluruh ayat dalam satu juz dengan menggabungkan potongan
   * dari beberapa surah sesuai data batas juz (juz-data.js).
   */
  async getJuz(juzNumber) {
    const ranges = getSurahRangesForJuz(juzNumber);
    const parts = [];
    for (const r of ranges) {
      const surah = await this.getSurah(r.surah);
      const end = r.end ?? surah.jumlahAyat;
      const ayatPotongan = surah.ayat.filter(
        (a) => a.nomorAyat >= r.start && a.nomorAyat <= end
      );
      parts.push({
        nomor: surah.nomor,
        namaLatin: surah.namaLatin,
        nama: surah.nama,
        ayat: ayatPotongan,
      });
    }
    return parts;
  },
};
