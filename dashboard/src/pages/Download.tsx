import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { getPublicAppDistributionRequest } from '../api/client';
import { AppIcon } from '../components/AppIcon';
import crestLogo from '../assets/logo.webp';

const FEATURES = [
  ['file', 'Layanan surat', 'Ajukan surat administrasi dan pantau perkembangannya langsung dari aplikasi.'],
  ['megaphone', 'Laporan warga', 'Sampaikan laporan dan masukan kepada aparatur Gampong Blang.'],
  ['bell', 'Informasi terbaru', 'Terima berita, pengumuman, dan pemberitahuan perkembangan layanan.'],
  ['landmark', 'Profil gampong', 'Akses profil, demografi, galeri kegiatan, dan informasi penting gampong.'],
] as const;

export function DownloadPage() {
  const distributionQuery = useQuery({
    queryKey: ['app-distribution'],
    queryFn: getPublicAppDistributionRequest,
    retry: 1,
  });
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const permanentUrl = `${window.location.origin}/`;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Gampong Blang Digital — Aplikasi Resmi Gampong Blang';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(permanentUrl, {
      width: 260,
      margin: 1,
      color: { dark: '#0e3b2a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrCodeUrl(url);
      })
      .catch(() => {
        if (active) setQrCodeUrl('');
      });
    return () => {
      active = false;
    };
  }, [permanentUrl]);

  const distribution = distributionQuery.data;
  const isPlayStore = distribution?.channel === 'google_play';
  const destination = isPlayStore ? distribution?.play_store_url : distribution?.apk_url;
  const canDownload = Boolean(distribution?.enabled && destination);
  const mode = canDownload ? (isPlayStore ? 'google_play' : 'direct_apk') : 'unavailable';
  const isDirectApk = mode === 'direct_apk';
  const isGooglePlay = mode === 'google_play';
  const resolvedDestination = useMemo(
    () => (destination ? new URL(destination, window.location.origin).toString() : ''),
    [destination],
  );

  return (
    <main className="download-page">
      <header className="download-header">
        <a className="download-brand" href="#top" aria-label="Gampong Blang Digital">
          <img src={crestLogo} alt="Logo Pemerintah Kabupaten Aceh Jaya" />
          <span><strong>Gampong Blang Digital</strong><small>Pemerintah Gampong Blang</small></span>
        </a>
        <nav aria-label="Navigasi halaman">
          <a href="#fitur">Fitur</a>
          {mode !== 'unavailable' ? <a href="#panduan">Panduan</a> : null}
          <Link to="/privacy-policy">Privasi</Link>
        </nav>
      </header>

      <section className="download-hero" id="top">
        <div className="download-hero-copy">
          <span className="download-eyebrow"><AppIcon name="check" /> Aplikasi resmi Pemerintah Gampong Blang</span>
          <h1>Pelayanan gampong kini lebih dekat.</h1>
          <p>
            Akses informasi desa, ajukan surat, pantau layanan, dan sampaikan laporan melalui satu aplikasi untuk warga Gampong Blang.
          </p>

          {distribution?.notice ? <div className="download-notice">{distribution.notice}</div> : null}

          {distributionQuery.isLoading ? (
            <button className="download-primary-cta" type="button" disabled>Memeriksa unduhan...</button>
          ) : isDirectApk ? (
            <a
              className="download-primary-cta"
              href={resolvedDestination}
              download
            >
              <AppIcon name="download" />
              Unduh Aplikasi Android
            </a>
          ) : isGooglePlay ? (
            <a
              className="download-primary-cta download-google-play-cta"
              href={resolvedDestination}
              target="_blank"
              rel="noreferrer"
            >
              <span className="download-google-play-mark" aria-hidden="true" />
              <span><small>DAPATKAN DI</small><strong>Google Play</strong></span>
            </a>
          ) : (
            <div className="download-unavailable">
              <strong>Aplikasi segera tersedia</strong>
              <span>Kami sedang menyiapkan rilis resmi. Informasi unduhan akan tampil di halaman ini setelah peluncuran.</span>
            </div>
          )}

          <div className="download-release-meta" aria-label="Informasi rilis">
            <Meta label="Platform" value="Android" />
            <Meta label="Versi" value={distribution?.version_name ?? '—'} />
            {isDirectApk ? <Meta label="Ukuran" value={distribution?.file_size ?? '—'} /> : null}
            {isGooglePlay ? <Meta label="Sumber" value="Google Play" /> : null}
            {mode === 'unavailable' ? <Meta label="Status" value="Menunggu rilis" /> : null}
          </div>
        </div>

        <aside className="download-qr-panel">
          <div className="download-phone-mark"><AppIcon name="phone" /></div>
          <span>{mode === 'unavailable' ? 'SIMPAN HALAMAN INI' : 'BUKA DARI PONSEL'}</span>
          <h2>
            {isDirectApk
              ? 'Scan untuk mengunduh'
              : isGooglePlay
                ? 'Scan untuk membuka Google Play'
                : 'Scan untuk memantau rilis'}
          </h2>
          {qrCodeUrl ? <img src={qrCodeUrl} alt="QR halaman unduhan Gampong Blang Digital" /> : null}
          <small>
            {mode === 'unavailable'
              ? 'QR ini membuka halaman resmi yang sama dan akan tetap berlaku setelah aplikasi diluncurkan.'
              : 'QR ini tetap berlaku saat saluran unduhan aplikasi berubah.'}
          </small>
        </aside>
      </section>

      <section className="download-section" id="fitur">
        <div className="download-section-heading">
          <span>Semua dalam satu aplikasi</span>
          <h2>Layanan untuk kebutuhan warga</h2>
        </div>
        <div className="download-feature-grid">
          {FEATURES.map(([icon, title, description]) => (
            <article className="download-feature-card" key={title}>
              <span><AppIcon name={icon} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      {mode !== 'unavailable' ? (
        <section className={`download-guide-section${isGooglePlay ? ' google-play' : ''}`} id="panduan">
          <div className="download-section-heading">
            <span>Panduan pemasangan</span>
            <h2>{isGooglePlay ? 'Pasang dengan mudah melalui Google Play' : 'Cara memasang APK dengan aman'}</h2>
            <p>
              {isGooglePlay
                ? 'Google Play menangani proses pemasangan dan pembaruan aplikasi secara otomatis.'
                : 'Unduh hanya dari halaman resmi ini dan jangan membagikan ulang berkas melalui sumber lain.'}
            </p>
          </div>
          <ol className="download-steps">
            {(isGooglePlay
              ? [
                  ['Buka Google Play', 'Tekan tombol Google Play di atas untuk membuka halaman resmi aplikasi.'],
                  ['Periksa aplikasi', 'Pastikan nama aplikasi dan penerbit sesuai sebelum melanjutkan.'],
                  ['Tekan Instal', 'Google Play akan memasang versi yang sesuai untuk perangkat Anda.'],
                  ['Aktifkan pembaruan', 'Biarkan pembaruan otomatis aktif agar aplikasi selalu menggunakan versi terbaru.'],
                ]
              : [
                  ['Unduh APK', 'Tekan tombol unduh dan tunggu sampai berkas selesai disimpan.'],
                  ['Izinkan sumber ini', 'Jika Android meminta izin, izinkan pemasangan hanya untuk browser yang sedang digunakan.'],
                  ['Pasang aplikasi', 'Buka berkas APK, pilih Instal, kemudian tunggu hingga proses selesai.'],
                  ['Buka aplikasi', 'Setelah terpasang, buka Gampong Blang Digital dari layar utama.'],
                ]
            ).map(([title, description], index) => (
              <li key={title}><span>{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>
            ))}
          </ol>
          {isDirectApk ? (
            <div className="download-security-callout">
              <AppIcon name="lock" />
              <div>
                <strong>Tidak perlu menonaktifkan Google Play Protect</strong>
                <p>Android tetap dapat memeriksa keamanan aplikasi. Jangan menonaktifkan perlindungan perangkat secara keseluruhan.</p>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="download-trust-section">
        <div>
          <span className="download-eyebrow"><AppIcon name="lock" /> Sumber resmi</span>
          <h2>Informasi rilis aplikasi</h2>
          <p>Gampong Blang Digital dikelola oleh Pemerintah Gampong Blang, Kecamatan Krueng Sabee, Kabupaten Aceh Jaya.</p>
        </div>
        <dl>
          <div><dt>Versi</dt><dd>{distribution?.version_name ?? 'Belum tersedia'}</dd></div>
          <div><dt>Tanggal rilis</dt><dd>{formatReleaseDate(distribution?.release_date)}</dd></div>
          <div>
            <dt>Status</dt>
            <dd>{isDirectApk ? 'APK resmi tersedia' : isGooglePlay ? 'Tersedia di Google Play' : 'Menunggu peluncuran'}</dd>
          </div>
          <div><dt>Sumber</dt><dd>{isGooglePlay ? 'Google Play' : isDirectApk ? 'Website resmi' : 'Belum dipublikasikan'}</dd></div>
          {isDirectApk && distribution?.sha256 ? <div className="wide"><dt>SHA-256</dt><dd className="download-checksum">{distribution.sha256}</dd></div> : null}
        </dl>
      </section>

      <footer className="download-footer">
        <div><strong>Gampong Blang Digital</strong><span>Pemerintah Gampong Blang</span></div>
        <div><a href="mailto:sapagampong@gmail.com">sapagampong@gmail.com</a><Link to="/privacy-policy">Kebijakan Privasi</Link></div>
      </footer>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatReleaseDate(value: string | null | undefined) {
  if (!value) return 'Belum tersedia';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
