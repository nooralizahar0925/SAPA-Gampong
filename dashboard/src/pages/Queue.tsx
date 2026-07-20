import { useNavigate } from 'react-router-dom';
import { clearStoredSession, getStoredSession } from '../auth/session';

export function QueuePage() {
  const session = getStoredSession();
  const navigate = useNavigate();

  function signOut() {
    clearStoredSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-crest">GB</div>
          <div>
            <b>Gampong Blang</b>
            <small>Dashboard Admin</small>
          </div>
        </div>

        <div className="dashboard-group">Layanan</div>
        <a className="dashboard-link active" href="#requests" onClick={(event) => event.preventDefault()}>
          Permohonan Surat
          <span className="dashboard-link-count">0</span>
        </a>
        <a className="dashboard-link" href="#archive" onClick={(event) => event.preventDefault()}>
          Arsip Surat
        </a>

        <div className="dashboard-group">Publikasi</div>
        <a className="dashboard-link" href="#content" onClick={(event) => event.preventDefault()}>
          Konten Gampong
        </a>
        <a className="dashboard-link" href="#feedback" onClick={(event) => event.preventDefault()}>
          Pelaporan Warga
        </a>

        <div className="dashboard-user">
          <div className="dashboard-user-avatar">
            {(session?.user.name ?? 'A').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <b>{session?.user.name ?? 'Admin'}</b>
            <small>{session?.user.role ?? 'admin'}</small>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <h1>Permohonan Surat</h1>
            <p>Scaffold Task 13 siap. Tabel antrian detail mengikuti mockup pada Task 14.</p>
          </div>
          <button className="secondary-button" type="button" onClick={signOut}>
            Sign out
          </button>
        </header>

        <div className="dashboard-content">
          <section className="status-strip" aria-label="Queue status summary">
            <article className="status-tile">
              Menunggu tindakan
              <strong>0</strong>
            </article>
            <article className="status-tile">
              Disetujui hari ini
              <strong>0</strong>
            </article>
            <article className="status-tile">
              Terkirim hari ini
              <strong>0</strong>
            </article>
          </section>

          <section className="placeholder-box">
            <h2>Struktur dashboard sudah siap</h2>
            <p>
              Auth guard, sesi login, dan shell dashboard sudah mengikuti arah mockup. Berikutnya
              kita isi queue table, filter, badge status, dan aksi review sesuai layar A2.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
