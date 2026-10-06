export type ImagePurpose = 'profile' | 'official' | 'mosque' | 'banner' | 'gallery';

const GUIDANCE: Record<ImagePurpose, string> = {
  profile: 'Disarankan 1280 × 720 px (16:9), atau rasio asli foto. Di Tentang, lebar penuh dan tinggi otomatis tanpa pemotongan.',
  official: 'Disarankan 800 × 800 px (1:1). Foto Pemimpin dan Perangkat mengisi bingkai lingkaran; tepi dan sudut dapat terpotong. Letakkan wajah di tengah dengan ruang di sekelilingnya.',
  mosque: 'Disarankan 1200 × 900 px (4:3). Foto masjid ditampilkan utuh dalam area 4:3 yang lebih tinggi; rasio lain dapat menyisakan ruang kosong.',
  banner: 'Disarankan 1200 × 800 px (3:2) untuk banner beranda yang lebih tinggi. Banner menyesuaikan lebar layar dan dapat terpotong di tepi. Letakkan teks, logo, dan objek penting di tengah.',
  gallery: 'Disarankan 1200 × 900 px (4:3). Thumbnail galeri dapat terpotong; letakkan objek penting di tengah. Foto lengkap terlihat saat dibuka.',
};

export function ImageUploadGuide({ purpose, id }: { purpose: ImagePurpose; id?: string }) {
  return (
    <p id={id} className="field-hint">
      {GUIDANCE[purpose]} Format JPG, PNG, atau WebP; maksimal {purpose === 'gallery' ? '5' : '2'} MB per foto.
    </p>
  );
}
