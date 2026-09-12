import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import crestLogo from '../assets/logo.webp';
import { getRequestCountsRequest, listFeedbackRequest } from '../api/client';
import { clearStoredSession, getStoredSession, isSystemAdmin } from '../auth/session';
import { AppIcon, type IconName } from './AppIcon';

type DashboardFrameProps = {
  header: ReactNode;
  children: ReactNode;
  /** Lets the inbox page pass the count it already fetched instead of refetching. */
  feedbackCount?: number;
  /** Same idea for the letter queue's pending count. */
  requestCount?: number;
};

type NavItem = {
  label: string;
  icon: IconName;
  count?: number;
  /** Badge sourced from live data at render time rather than a fixed `count`. */
  countKey?: 'feedback' | 'requests';
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
      {
        label: 'Permohonan Surat',
        icon: 'inbox',
        countKey: 'requests',
        to: '/requests',
        matchPrefix: '/requests',
      },
      { label: 'Arsip Surat', icon: 'archive' },
      {
        label: 'Kotak Pelaporan',
        icon: 'megaphone',
        countKey: 'feedback',
        to: '/feedback',
        matchPrefix: '/feedback',
      },
    ],
  },
  {
    title: 'Konten Aplikasi',
    items: [
      { label: 'Banner Beranda', icon: 'layout', to: '/content/banners', matchPrefix: '/content/banners' },
      { label: 'Galeri', icon: 'image', to: '/content/gallery', matchPrefix: '/content/gallery' },
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
      {
        label: 'Potensi Desa',
        icon: 'archive',
        to: '/content/strengths',
        matchPrefix: '/content/strengths',
      },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { label: 'Pengaturan', icon: 'settings', to: '/settings/app', matchPrefix: '/settings/app' },
      { label: 'Akun Pengguna', icon: 'users', to: '/settings/users', matchPrefix: '/settings/users' },
    ],
  },
];

export function DashboardFrame({
  header,
  children,
  feedbackCount,
  requestCount,
}: DashboardFrameProps) {
  const session = getStoredSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const visibleSections = NAV_SECTIONS.filter((section) => section.title !== 'Sistem' || isSystemAdmin());

  // The unread badge shows on every page, so the frame fetches it unless the page
  // already has the number. Shares the ['feedback'] key, so inbox writes refresh it.
  const feedbackQuery = useQuery({
    queryKey: ['feedback', 'ALL', ''],
    queryFn: () => listFeedbackRequest({}),
    enabled: feedbackCount === undefined,
  });

  const unreadFeedback = feedbackCount ?? feedbackQuery.data?.new_count ?? 0;

  // Pending letters badge the sidebar on every page, same pattern as feedback.
  const requestCountsQuery = useQuery({
    queryKey: ['request-counts'],
    queryFn: getRequestCountsRequest,
    enabled: requestCount === undefined,
  });

  const pendingRequests = requestCount ?? requestCountsQuery.data?.pending ?? 0;

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
            <b>Gampong Blang Digital</b>
            <small>Dashboard Admin</small>
          </div>
        </div>

        {visibleSections.map((section) => (
          <div key={section.title}>
            <div className="dashboard-group">{section.title}</div>
            {section.items.map((item) => {
              const isActive = item.matchPrefix
                ? location.pathname.startsWith(item.matchPrefix)
                : item.to
                  ? location.pathname === item.to
                  : false;

              const badge =
                item.countKey === 'feedback'
                  ? unreadFeedback
                  : item.countKey === 'requests'
                    ? pendingRequests
                    : item.count;

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
                  {typeof badge === 'number' && badge > 0 ? (
                    <span
                      className="dashboard-link-count"
                      // The badge counts work waiting on an admin, not the total in the
                      // section — say so, since the page below shows a different number.
                      title={
                        item.countKey === 'requests'
                          ? `${badge} permohonan menunggu tindakan`
                          : `${badge} laporan belum dibaca`
                      }
                    >
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}

        <div className="dashboard-user">
          <button
            className="dashboard-user-profile"
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              navigate('/profile');
            }}
            aria-label="Edit profil pengguna"
          >
            <span className="dashboard-user-avatar">
              {(session?.user.name ?? 'A').slice(0, 1).toUpperCase()}
            </span>
            <span className="dashboard-user-meta">
              <b>{session?.user.name ?? 'Admin Gampong'}</b>
              <small>{session?.user.role === 'admin' ? 'Admin' : 'Operator'}</small>
            </span>
          </button>
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
