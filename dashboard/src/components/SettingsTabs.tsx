import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { label: 'Pengaturan Aplikasi', to: '/settings/app' },
  { label: 'Pengaturan Surat', to: '/settings/letters' },
  { label: 'Email Provider', to: '/settings/email-provider' },
  { label: 'Akun Pengguna', to: '/settings/users' },
];

/**
 * Tab row shared by the settings pages. Uses the same visual treatment as the content
 * hub so "Pengaturan" reads as one destination with two views rather than two
 * unrelated screens — the email provider page previously had no sidebar entry at all.
 */
export function SettingsTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="content-tabs" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.to}
          type="button"
          role="tab"
          aria-selected={pathname === tab.to}
          className={`content-tab${pathname === tab.to ? ' active' : ''}`}
          onClick={() => navigate(tab.to)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
