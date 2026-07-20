import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import crestLogo from '../assets/logo.webp';
import { clearStoredSession, getStoredSession } from '../auth/session';
import { AppIcon, type IconName } from './AppIcon';

type DashboardFrameProps = {
  header: ReactNode;
  children: ReactNode;
};

type NavItem = {
  label: string;
  icon: IconName;
  count?: number;
  active?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operasional',
    items: [
      { label: 'Permohonan Surat', icon: 'inbox', count: 6, active: true },
      { label: 'Arsip Surat', icon: 'archive' },
      { label: 'Kotak Pelaporan', icon: 'megaphone', count: 3 },
    ],
  },
  {
    title: 'Konten Aplikasi',
    items: [
      { label: 'Banner Beranda', icon: 'layout' },
      { label: 'Profil Desa', icon: 'landmark' },
      { label: 'Perangkat Gampong', icon: 'users' },
      { label: 'Masjid & Jadwal Sholat', icon: 'mosque' },
      { label: 'Demografi', icon: 'chart' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Pengaturan', icon: 'settings' },
      { label: 'Akun Pengguna', icon: 'users' },
    ],
  },
];

export function DashboardFrame({ header, children }: DashboardFrameProps) {
  const session = getStoredSession();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function signOut() {
    clearStoredSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell dashboard-shell">
      <div
        className={`dashboard-sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`dashboard-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="dashboard-brand">
          <img src={crestLogo} alt="Logo Pemerintah Aceh Jaya" className="dashboard-brand-logo" />
          <div>
            <b>Gampong Blang</b>
            <small>Dashboard Admin</small>
          </div>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="dashboard-group">{section.title}</div>
            {section.items.map((item) => (
              <button
                key={item.label}
                className={`dashboard-link${item.active ? ' active' : ''}`}
                type="button"
              >
                <AppIcon name={item.icon} />
                <span>{item.label}</span>
                {typeof item.count === 'number' ? (
                  <span className="dashboard-link-count">{item.count}</span>
                ) : null}
              </button>
            ))}
          </div>
        ))}

        <div className="dashboard-user">
          <div className="dashboard-user-avatar">
            {(session?.user.name ?? 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="dashboard-user-meta">
            <b>{session?.user.name ?? 'Admin Gampong'}</b>
            <small>{session?.user.role === 'approver' ? 'Keuchik · Approver' : 'Admin · Operator'}</small>
          </div>
          <button className="dashboard-user-logout" type="button" onClick={signOut} aria-label="Keluar">
            <AppIcon name="logout" />
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="dashboard-icon-button mobile-only"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <AppIcon name="menu" />
          </button>
          {header}
        </header>

        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
