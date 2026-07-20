import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  to?: string;
  matchPrefix?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operasional',
    items: [
      { label: 'Permohonan Surat', icon: 'inbox', count: 6, to: '/requests', matchPrefix: '/requests' },
      { label: 'Arsip Surat', icon: 'archive' },
      { label: 'Kotak Pelaporan', icon: 'megaphone', count: 3 },
    ],
  },
  {
    title: 'Konten Aplikasi',
    items: [
      { label: 'Banner Beranda', icon: 'layout', to: '/content/banners', matchPrefix: '/content/banners' },
      { label: 'Profil Desa', icon: 'landmark', to: '/content/profile', matchPrefix: '/content/profile' },
      {
        label: 'Perangkat Gampong',
        icon: 'users',
        to: '/content/officials',
        matchPrefix: '/content/officials',
      },
      {
        label: 'Masjid & Jadwal Sholat',
        icon: 'mosque',
        to: '/content/mosques',
        matchPrefix: '/content/mosques',
      },
      {
        label: 'Demografi',
        icon: 'chart',
        to: '/content/demographics',
        matchPrefix: '/content/demographics',
      },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Pengaturan', icon: 'settings', to: '/settings/app', matchPrefix: '/settings' },
      { label: 'Akun Pengguna', icon: 'users' },
    ],
  },
];

export function DashboardFrame({ header, children }: DashboardFrameProps) {
  const session = getStoredSession();
  const navigate = useNavigate();
  const location = useLocation();
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
            {section.items.map((item) => {
              const isActive = item.matchPrefix
                ? location.pathname.startsWith(item.matchPrefix)
                : item.to
                  ? location.pathname === item.to
                  : false;

              return (
                <button
                  key={item.label}
                  className={`dashboard-link${isActive ? ' active' : ''}${item.to ? '' : ' disabled'}`}
                  type="button"
                  onClick={() => {
                    if (!item.to) return;
                    setSidebarOpen(false);
                    navigate(item.to);
                  }}
                >
                  <AppIcon name={item.icon} />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' ? (
                    <span className="dashboard-link-count">{item.count}</span>
                  ) : null}
                </button>
              );
            })}
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
