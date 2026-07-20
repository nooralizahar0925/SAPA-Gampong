export const GENDER_OPTIONS = ['Laki-laki', 'Perempuan'] as const;
export const RELIGION_OPTIONS = [
  'Islam',
  'Kristen',
  'Katolik',
  'Hindu',
  'Buddha',
  'Konghucu',
] as const;
export const MARITAL_STATUS_OPTIONS = [
  'Belum Kawin',
  'Kawin',
  'Cerai Hidup',
  'Cerai Mati',
] as const;
export const DUSUN_OPTIONS = ['Kuini', 'Mangga', 'Rumbia'] as const;
export const ATTACHMENT_DEFAULTS = ['KTP', 'KK'] as const;

export type LetterField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'year' | 'number' | 'nik' | 'phone' | 'email' | 'enum';
  required: boolean;
  options?: readonly string[];
};

export type LetterDefinition = {
  code: `L${number}`;
  name: string;
  description: string;
  subject_is_applicant: boolean;
  required_attachments: readonly string[];
  signatory: string;
  fields: readonly LetterField[];
};

// L1-L7 are aligned with the current mobile mock/brief fields already in the repo.
// L8-L10 were cross-checked against the source .docx templates on 2026-07-20.
export const LETTER_DEFINITIONS: readonly LetterDefinition[] = [
  {
    code: 'L1',
    name: 'Surat Keterangan Berdomisili',
    description: 'Keterangan tempat tinggal warga Gampong Blang.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama', label: 'Nama', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      {
        key: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'enum',
        required: true,
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
      { key: 'dusun', label: 'Dusun', type: 'enum', required: true, options: DUSUN_OPTIONS },
      { key: 'gampong', label: 'Gampong', type: 'text', required: true },
      { key: 'kecamatan', label: 'Kecamatan', type: 'text', required: true },
      { key: 'kabupaten', label: 'Kabupaten', type: 'text', required: true },
    ],
  },
  {
    code: 'L2',
    name: 'Surat Keterangan Domisili Kantor',
    description: 'Untuk kantor, lembaga, atau organisasi.',
    subject_is_applicant: false,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama_pemohon', label: 'Nama Pemohon', type: 'text', required: true },
      { key: 'nama_kantor', label: 'Nama Kantor', type: 'text', required: true },
      { key: 'alamat_jalan', label: 'Alamat Kantor - Jalan', type: 'text', required: true },
      { key: 'alamat_desa', label: 'Alamat Kantor - Desa', type: 'text', required: true },
      {
        key: 'alamat_kecamatan',
        label: 'Alamat Kantor - Kecamatan',
        type: 'text',
        required: true,
      },
      {
        key: 'alamat_kabupaten',
        label: 'Alamat Kantor - Kabupaten',
        type: 'text',
        required: true,
      },
      { key: 'sk_kemenkumham', label: 'No. SK Kemenkumham', type: 'text', required: false },
      { key: 'akta_notaris', label: 'No. Akta Notaris', type: 'text', required: false },
      { key: 'penanggung_jawab', label: 'Penanggung Jawab', type: 'text', required: true },
    ],
  },
  {
    code: 'L3',
    name: 'Surat Keterangan Kehilangan',
    description: 'Keterangan kehilangan barang atau dokumen.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama', label: 'Nama', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
      {
        key: 'barang_hilang',
        label: 'Barang/Dokumen yang Hilang',
        type: 'textarea',
        required: true,
      },
    ],
  },
  {
    code: 'L4',
    name: 'Surat Keterangan Miskin',
    description: 'SKTM untuk beasiswa, kesehatan, atau bantuan.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      { key: 'kewarganegaraan', label: 'Kewarganegaraan', type: 'text', required: true },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      {
        key: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'enum',
        required: true,
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
      { key: 'keperluan', label: 'Keperluan/Tujuan', type: 'text', required: false },
    ],
  },
  {
    code: 'L5',
    name: 'Surat Keterangan Usaha',
    description: 'Keterangan kepemilikan dan lokasi usaha.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama', label: 'Nama', type: 'text', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      {
        key: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'enum',
        required: true,
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
      { key: 'jenis_usaha', label: 'Jenis Usaha', type: 'text', required: true },
      { key: 'nama_usaha', label: 'Nama Usaha', type: 'text', required: true },
      { key: 'tahun_mulai', label: 'Tahun Mulai', type: 'year', required: true },
      {
        key: 'lokasi_dusun',
        label: 'Lokasi Usaha - Dusun',
        type: 'enum',
        required: true,
        options: DUSUN_OPTIONS,
      },
    ],
  },
  {
    code: 'L6',
    name: 'Surat Keterangan Yatim / Piatu',
    description: 'Untuk anak yatim, piatu, atau yatim piatu.',
    subject_is_applicant: false,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama_anak', label: 'Nama Anak', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
      { key: 'nik', label: 'NIK KTP', type: 'nik', required: false },
      {
        key: 'status',
        label: 'Status',
        type: 'enum',
        required: true,
        options: ['Yatim', 'Piatu', 'Yatim Piatu'],
      },
      { key: 'nama_ayah', label: 'Nama Ayah', type: 'text', required: true },
      { key: 'nama_ibu', label: 'Nama Ibu', type: 'text', required: true },
    ],
  },
  {
    code: 'L7',
    name: 'Surat Keterangan Kematian',
    description: 'Keterangan kematian yang dilaporkan keluarga.',
    subject_is_applicant: false,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama', label: 'Nama Almarhum/Almarhumah', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      {
        key: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'enum',
        required: true,
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
      {
        key: 'tanggal_meninggal',
        label: 'Hari/Tanggal Meninggal',
        type: 'date',
        required: true,
      },
      { key: 'pukul', label: 'Pukul', type: 'time', required: true },
      { key: 'tempat_meninggal', label: 'Meninggal Dunia di', type: 'text', required: true },
      { key: 'tempat_dimakamkan', label: 'Dimakamkan di', type: 'text', required: true },
      {
        key: 'suami_istri',
        label: 'Suami/Istri - jumlah & nama',
        type: 'text',
        required: false,
      },
      { key: 'anak_total', label: 'Anak - jumlah total', type: 'number', required: false },
      { key: 'anak_laki', label: 'Anak - jumlah laki-laki', type: 'number', required: false },
      {
        key: 'anak_perempuan',
        label: 'Anak - jumlah perempuan',
        type: 'number',
        required: false,
      },
    ],
  },
  {
    code: 'L8',
    name: 'Surat Keterangan Berkelakuan Baik',
    description: 'Keterangan perilaku baik berdasarkan catatan gampong.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama', label: 'Nama', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      {
        key: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'enum',
        required: true,
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
    ],
  },
  {
    code: 'L9',
    name: 'Surat Keterangan Belum Menikah',
    description: 'Keterangan status belum menikah warga.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Sekretaris Gampong a.n. Keuchik',
    fields: [
      { key: 'nama', label: 'Nama', type: 'text', required: true },
      { key: 'ttl_tempat', label: 'Tempat Lahir', type: 'text', required: true },
      { key: 'ttl_tanggal', label: 'Tanggal Lahir', type: 'date', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      {
        key: 'jenis_kelamin',
        label: 'Jenis Kelamin',
        type: 'enum',
        required: true,
        options: GENDER_OPTIONS,
      },
      { key: 'agama', label: 'Agama', type: 'enum', required: true, options: RELIGION_OPTIONS },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      {
        key: 'status_perkawinan',
        label: 'Status Perkawinan',
        type: 'enum',
        required: true,
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
    ],
  },
  {
    code: 'L10',
    name: 'Surat Rekomendasi',
    description: 'Surat rekomendasi untuk instansi tujuan berdasarkan permohonan warga.',
    subject_is_applicant: true,
    required_attachments: ATTACHMENT_DEFAULTS,
    signatory: 'Keuchik',
    fields: [
      { key: 'nama_pemohon', label: 'Nama Pemohon', type: 'text', required: true },
      {
        key: 'nomor_surat_permohonan',
        label: 'Nomor Surat Permohonan',
        type: 'text',
        required: true,
      },
      {
        key: 'tanggal_permohonan',
        label: 'Tanggal Permohonan',
        type: 'date',
        required: true,
      },
      { key: 'perihal', label: 'Perihal', type: 'text', required: true },
      { key: 'tujuan_jabatan', label: 'Tujuan Jabatan', type: 'text', required: true },
      { key: 'tujuan_instansi', label: 'Tujuan Instansi', type: 'text', required: true },
    ],
  },
];

export const LETTER_TYPE_CODES = LETTER_DEFINITIONS.map((item) => item.code) as [
  LetterDefinition['code'],
  ...LetterDefinition['code'][],
];

export function getLetterDefinition(code: string) {
  return LETTER_DEFINITIONS.find((item) => item.code === code);
}
