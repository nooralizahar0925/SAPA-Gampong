import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import crestLogo from '../assets/logo.webp';

type AuthShellProps = {
  title: string;
  copy: string;
  children: ReactNode;
};

export function AuthShell({ title, copy, children }: AuthShellProps) {
  return (
    <div className="shell login-page">
      <div className="login-layout">
        <section className="login-brand-panel">
          <div className="login-brand-grid" />

          <div className="login-brand-content">
            <div className="login-crest">
              <img src={crestLogo} alt="Logo Pemerintah Aceh Jaya" className="login-crest-image" />
            </div>
            <div className="login-brand-kicker">Gampong Blang Digital</div>
            <h1>
              Dashboard Administrasi
              <br />&amp; Publikasi Gampong
            </h1>
            <p>
              Kelola permohonan surat warga, terbitkan surat resmi ber-QR, dan perbarui seluruh
              informasi yang tampil pada aplikasi warga dari satu tempat.
            </p>
          </div>

          <div className="login-brand-stats">
            <div>
              <strong>10</strong>
              <span>Jenis surat</span>
            </div>
            <div>
              <strong>1.517</strong>
              <span>Jiwa terlayani</span>
            </div>
            <div>
              <strong>3x24</strong>
              <span>Jam SLA</span>
            </div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-card">
            <h2>{title}</h2>
            <p className="login-form-copy">{copy}</p>
            {children}
            <div className="auth-privacy-link">
              <Link to="/privacy-policy">Kebijakan Privasi</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
