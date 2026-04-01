import { Subbab } from './types';

export const ECO_FACTS = [
  "Tahukah kamu? Satu pohon dewasa dapat menyerap sekitar 22 kg karbon dioksida per tahun!",
  "Plastik membutuhkan waktu hingga 450 tahun untuk terurai di lingkungan.",
  "Mendaur ulang satu kaleng aluminium menghemat energi yang cukup untuk menyalakan TV selama 3 jam.",
  "Hutan hujan tropis menyerap sekitar 20% oksigen dunia.",
  "Menggunakan tumbler dapat mengurangi penggunaan botol plastik sekali pakai secara signifikan.",
  "Mematikan lampu saat tidak digunakan adalah langkah kecil untuk menghemat energi.",
  "Kompos dari sisa makanan dapat menyuburkan tanaman di rumahmu.",
  "Bersepeda atau berjalan kaki mengurangi emisi karbon dari kendaraan bermotor.",
  "Air bersih adalah sumber daya terbatas, hematlah penggunaannya!",
  "Menanam mangrove dapat mencegah abrasi pantai dan menyerap karbon lebih banyak dari hutan biasa."
];

export const SCIENTIFIC_KEYWORDS = ['emisi', 'gas rumah kaca', 'limbah', 'biogas'];

export const DAILY_QUESTS = [
  "Tunjukkan caramu menghemat air hari ini! 💧", // Minggu
  "Posting foto botol minum tumblr kamu! (#SayNoToPlastic) 🥤", // Senin
  "Cari 1 alat elektronik yang masih dicolok padahal nggak dipakai! 🔌", // Selasa
  "Gunakan transportasi umum atau jalan kaki hari ini! 🚶‍♂️", // Rabu
  "Kurangi penggunaan tisu, gunakan sapu tangan! 🧣", // Kamis
  "Matikan lampu saat tidak digunakan! 💡", // Jumat
  "Pilah sampah organik dan anorganik di rumah! ♻️" // Sabtu
];

export const SUBBAB_COLORS: Record<Subbab, string> = {
  'Kesehatan Lingkungan': 'bg-teal-100 text-teal-800 border-teal-200',
  'Pemanasan Global': 'bg-red-100 text-red-800 border-red-200',
  'Krisis Energi': 'bg-amber-100 text-amber-800 border-amber-200',
  'Ketahanan Pangan': 'bg-green-100 text-green-800 border-green-200',
};
