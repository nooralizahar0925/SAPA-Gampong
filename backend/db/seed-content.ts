import { prisma } from '../src/lib/prisma';

const SINGLETON = 'singleton';

/**
 * Content seed for Gampong Blang, Kecamatan Krueng Sabee, Kabupaten Aceh Jaya.
 *
 * Figures come from the approved dashboard mock and the signatory blocks already
 * used by the letter renderer (modules/letters/rendering.ts). This is development
 * seed data: it is idempotent (upsert by stable key) so it can be re-run safely,
 * and it never touches admin credentials.
 */

const PROFILE = {
  name: 'Gampong Blang',
  kemukiman: 'Calang',
  kecamatan: 'Krueng Sabee',
  kabupaten: 'Aceh Jaya',
  areaSize: '1.300 ha',
  elevation: '3,4 mdpl · dataran rendah',
  contactPhone: '+62 812 3456 789',
  email: 'gampongblang@acehjaya.go.id',
  mapLat: 4.63421,
  mapLng: 95.58197,
  description:
    'Nama "Blang" dalam bahasa Aceh berarti sawah atau ladang — mencerminkan hamparan lahan '
    + 'subur yang menjadi sandaran hidup warganya. Gampong ini dihuni sejak sebelum kemerdekaan '
    + 'oleh perantau dari berbagai penjuru Aceh yang bertani dan melaut. Kini Gampong Blang '
    + 'menjadi salah satu gampong pesisir di Kecamatan Krueng Sabee dengan potensi pertanian, '
    + 'perikanan, dan wisata pantai.',
};

const VISION = 'Terwujudnya Gampong Blang yang mandiri, sejahtera, dan islami.';

const MISSIONS = [
  'Meningkatkan kualitas pelayanan administrasi kepada masyarakat.',
  'Memperkuat ekonomi warga melalui pertanian, perikanan, dan UMKM.',
  'Melestarikan nilai adat dan syariat Islam dalam kehidupan bermasyarakat.',
  'Membangun infrastruktur gampong yang merata dan berkelanjutan.',
];

const OFFICIALS = [
  { name: 'Sofian', role: 'Keuchik', order: 0, isLeadershipHighlight: true },
  { name: 'Afzalul Zikri, S.P', role: 'Sekretaris Gampong', order: 1, isLeadershipHighlight: true },
  { name: 'Nurul Huda', role: 'Kaur Pemerintahan', order: 2, isLeadershipHighlight: false },
  { name: 'Muhammad Rizal', role: 'Kaur Pembangunan', order: 3, isLeadershipHighlight: false },
  { name: 'Cut Nurhayati', role: 'Kaur Keuangan', order: 4, isLeadershipHighlight: false },
  { name: 'Teuku Iskandar', role: 'Kepala Dusun Meunasah', order: 5, isLeadershipHighlight: false },
  { name: 'Zulkifli', role: 'Kepala Dusun Pantai', order: 6, isLeadershipHighlight: false },
];

const STRENGTHS = [
  {
    title: 'Wisata Pantai',
    body: 'Garis pantai yang bersih sepanjang tahun, menjadi tujuan wisata akhir pekan warga Aceh Jaya.',
    order: 0,
  },
  {
    title: 'Pertanian Padi',
    body: 'Hamparan sawah seluas ratusan hektar yang menjadi sumber penghidupan utama warga gampong.',
    order: 1,
  },
  {
    title: 'Perikanan Tangkap',
    body: 'Nelayan gampong melaut harian dengan hasil tangkapan yang dipasarkan hingga ke Calang.',
    order: 2,
  },
];

const MOSQUES = [
  {
    name: 'Masjid Baiturrahim',
    address: 'Jl. Pesisir No. 1, Dusun Meunasah',
    landmark: 'Depan balai gampong',
  },
  {
    name: 'Meunasah Blang',
    address: 'Dusun Tengah, Gampong Blang',
    landmark: 'Samping lapangan gampong',
  },
];

/**
 * Aladhan parameters mirror what the mobile app sends when online (method 99 with
 * custom Fajr 20°/Isha 18°, school 0). The fallback times are the offline schedule
 * for Gampong Blang, replacing the constants previously hardcoded in the app.
 */
const PRAYER = {
  lat: 4.63421,
  lng: 95.58197,
  calcMethod: 'Kemenag RI (kustom 20°/18°)',
  timezone: 'Asia/Jakarta',
  aladhanMethod: 99,
  fajrAngle: 20,
  ishaAngle: 18,
  school: 0,
  fallbackSubuh: '04:58',
  fallbackDhuhur: '12:31',
  fallbackAshar: '15:52',
  fallbackMaghrib: '18:38',
  fallbackIsya: '19:49',
};

const DEMOGRAPHICS = [
  {
    key: 'jumlah_penduduk',
    label: 'Jumlah Penduduk',
    type: 'number' as const,
    data: { value: 1517 },
    order: 0,
    visible: true,
  },
  {
    key: 'jenis_kelamin',
    label: 'Jenis Kelamin',
    type: 'split' as const,
    data: { laki_laki: 777, perempuan: 740 },
    order: 1,
    visible: true,
  },
  {
    key: 'tingkat_pendidikan',
    label: 'Tingkat Pendidikan',
    type: 'bar' as const,
    data: { sd: 412, smp: 336, sma: 498, diploma: 121, sarjana: 150 },
    order: 2,
    visible: true,
  },
  {
    key: 'mata_pencaharian',
    label: 'Mata Pencaharian',
    type: 'pie' as const,
    data: { petani: 486, nelayan: 312, pedagang: 178, pns: 96, wiraswasta: 143, lainnya: 302 },
    order: 3,
    visible: true,
  },
  {
    key: 'distribusi_umur',
    label: 'Distribusi Umur',
    type: 'bar' as const,
    data: {},
    order: 4,
    // Left hidden on purpose: the mock shows this block switched off with a
    // "belum diisi" advisory, which exercises the hidden-block path in the UI.
    visible: false,
  },
];

export async function seedContent() {
  await prisma.villageProfile.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...PROFILE },
    update: PROFILE,
  });

  await prisma.visionMission.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, vision: VISION, missions: MISSIONS },
    update: { vision: VISION, missions: MISSIONS },
  });

  await prisma.prayerConfig.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...PRAYER },
    update: PRAYER,
  });

  // Collection resources use cuid ids, so there is no natural key to upsert on.
  // Replacing them keeps the seed idempotent without accumulating duplicates.
  await prisma.official.deleteMany();
  await prisma.official.createMany({ data: OFFICIALS });

  await prisma.villageStrength.deleteMany();
  await prisma.villageStrength.createMany({ data: STRENGTHS });

  await prisma.mosque.deleteMany();
  await prisma.mosque.createMany({ data: MOSQUES });

  for (const block of DEMOGRAPHICS) {
    await prisma.demographicStatBlock.upsert({
      where: { key: block.key },
      create: block,
      update: block,
    });
  }

  console.log(
    `Seeded content: profile, visi+${MISSIONS.length} misi, ${OFFICIALS.length} perangkat, ` +
      `${STRENGTHS.length} potensi, ${MOSQUES.length} masjid, ${DEMOGRAPHICS.length} blok demografi, prayer config.`,
  );
}

if (require.main === module) {
  seedContent()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
