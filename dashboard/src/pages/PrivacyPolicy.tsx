import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import crestLogo from '../assets/logo.webp';

export function PrivacyPolicyPage() {
  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <div className="privacy-header-inner">
          <Link className="privacy-brand" to="/" aria-label="Gampong Blang Digital">
            <img src={crestLogo} alt="Logo Pemerintah Aceh Jaya" />
            <span>
              <strong>Gampong Blang Digital</strong>
              <small>Pemerintah Gampong Blang</small>
            </span>
          </Link>
          <Link className="privacy-back-link" to="/">
            Kembali
          </Link>
        </div>
      </header>

      <article className="privacy-content">
        <div className="privacy-title-block">
          <span>Kebijakan resmi aplikasi</span>
          <h1>Kebijakan Privasi</h1>
          <p>
            Kebijakan ini menjelaskan cara aplikasi Gampong Blang Digital mengelola data warga
            saat menyediakan informasi gampong, layanan surat, pelaporan, dan notifikasi.
          </p>
          <time dateTime="2026-09-13">Berlaku sejak 13 September 2026</time>
        </div>

        <PolicySection title="1. Pengelola layanan">
          <p>
            Gampong Blang Digital dikelola oleh Pemerintah Gampong Blang, Kecamatan Krueng Sabee,
            Kabupaten Aceh Jaya. Pertanyaan mengenai privasi dapat dikirim ke{' '}
            <a href="mailto:sapagampong@gmail.com">sapagampong@gmail.com</a>.
          </p>
        </PolicySection>

        <PolicySection title="2. Data yang kami kelola">
          <ul>
            <li>Nama, alamat email, nomor telepon, alamat, NIK, dan informasi formulir layanan.</li>
            <li>Dokumen, foto, atau berkas yang dipilih warga sebagai lampiran permohonan atau laporan.</li>
            <li>Isi laporan, kode referensi, status layanan, jawaban petugas, dan riwayat proses.</li>
            <li>Token perangkat dan pilihan notifikasi untuk mengirim pembaruan layanan.</li>
            <li>
              Lokasi perangkat saat warga memilih fitur GPS untuk menyesuaikan jadwal salat. Lokasi
              tidak diakses tanpa tindakan dan izin dari pengguna.
            </li>
            <li>Data teknis dasar seperti jenis platform, waktu permintaan, dan catatan keamanan server.</li>
          </ul>
        </PolicySection>

        <PolicySection title="3. Tujuan penggunaan data">
          <ul>
            <li>Memverifikasi email warga dan menampilkan riwayat layanan milik warga tersebut.</li>
            <li>Memproses, memeriksa, menerbitkan, dan mengirimkan permohonan surat.</li>
            <li>Menerima serta menindaklanjuti laporan atau masukan warga.</li>
            <li>Mengirim notifikasi status layanan dan pengumuman yang dipilih pengguna.</li>
            <li>Menyediakan jadwal salat berdasarkan lokasi atau lokasi bawaan gampong.</li>
            <li>Menjaga keamanan, mencegah penyalahgunaan, dan memenuhi kewajiban administrasi.</li>
          </ul>
        </PolicySection>

        <PolicySection title="4. Izin perangkat">
          <p>Aplikasi dapat meminta izin berikut hanya untuk fungsi yang berkaitan:</p>
          <ul>
            <li>Kamera untuk memindai QR dan mengambil lampiran.</li>
            <li>Foto dan berkas untuk memilih dokumen yang akan dikirim.</li>
            <li>Lokasi untuk jadwal salat saat pengguna memilih GPS.</li>
            <li>Notifikasi untuk status layanan dan informasi gampong.</li>
            <li>Alarm tepat waktu untuk pengingat azan yang diaktifkan pengguna.</li>
          </ul>
          <p>Pengguna dapat menolak atau mencabut izin melalui pengaturan perangkat.</p>
        </PolicySection>

        <PolicySection title="5. Penyedia layanan">
          <p>
            Data hanya diproses untuk menjalankan layanan. Kami menggunakan infrastruktur server
            Gampong Blang Digital, Firebase Cloud Messaging untuk notifikasi, layanan email untuk
            kode verifikasi dan pesan layanan, serta layanan jadwal salat AlAdhan ketika fitur GPS
            digunakan. Kami tidak menjual data pribadi dan tidak menggunakannya untuk iklan.
          </p>
        </PolicySection>

        <PolicySection title="6. Penyimpanan dan keamanan">
          <p>
            Data dikirim melalui koneksi HTTPS dan akses administrasi dibatasi kepada petugas yang
            berwenang. Data disimpan selama diperlukan untuk pelayanan, tindak lanjut, keamanan,
            dan kewajiban arsip atau hukum. Data yang tidak lagi diperlukan akan dihapus atau
            dianonimkan sesuai prosedur yang berlaku.
          </p>
          <p>
            Sebagian preferensi, cache informasi, dan sesi email juga tersimpan pada perangkat agar
            aplikasi tetap nyaman digunakan. Data lokal tersebut dapat dihapus dengan membersihkan
            data aplikasi atau menghapus aplikasi.
          </p>
        </PolicySection>

        <PolicySection title="7. Permintaan akses dan penghapusan data">
          <p>
            Warga dapat meminta salinan, koreksi, atau penghapusan data dengan mengirim email ke{' '}
            <a href="mailto:sapagampong@gmail.com?subject=Permintaan%20Penghapusan%20Data%20Gampong%20Blang%20Digital">
              sapagampong@gmail.com
            </a>
            . Sertakan alamat email yang digunakan dan kode referensi terkait. Kami akan melakukan
            verifikasi untuk mencegah penghapusan oleh pihak yang tidak berhak.
          </p>
          <p>
            Sebagian data mungkin tetap disimpan apabila diwajibkan untuk arsip pemerintahan,
            penyelesaian layanan, pencegahan penyalahgunaan, atau kewajiban hukum. Alasan pembatasan
            akan dijelaskan saat permintaan diproses.
          </p>
        </PolicySection>

        <PolicySection title="8. Privasi anak">
          <p>
            Aplikasi tidak ditujukan khusus untuk anak-anak. Data anak hanya boleh disampaikan oleh
            orang tua, wali, atau pihak yang berwenang untuk keperluan pelayanan administrasi.
          </p>
        </PolicySection>

        <PolicySection title="9. Perubahan kebijakan">
          <p>
            Kebijakan ini dapat diperbarui ketika fitur, penyedia layanan, atau ketentuan yang
            berlaku berubah. Tanggal berlaku terbaru akan ditampilkan pada halaman ini.
          </p>
        </PolicySection>
      </article>

      <footer className="privacy-footer">
        <span>Gampong Blang Digital</span>
        <a href="mailto:sapagampong@gmail.com">sapagampong@gmail.com</a>
      </footer>
    </main>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="privacy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
