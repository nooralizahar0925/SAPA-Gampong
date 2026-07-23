import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'archive'
  | 'bell'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevronDown'
  | 'chevronUp'
  | 'clock'
  | 'edit'
  | 'eye'
  | 'file'
  | 'filter'
  | 'image'
  | 'inbox'
  | 'landmark'
  | 'layout'
  | 'left'
  | 'lock'
  | 'logout'
  | 'mail'
  | 'megaphone'
  | 'menu'
  | 'mosque'
  | 'phone'
  | 'refresh'
  | 'search'
  | 'send'
  | 'settings'
  | 'users'
  | 'warning'
  | 'x';

export function AppIcon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
      className={className ? `icon ${className}` : 'icon'}
    >
      {iconPath(name)}
    </svg>
  );
}

function iconPath(name: IconName): ReactNode {
  switch (name) {
    case 'archive':
      return (
        <>
          <path d="M4 7h16v13H4z" />
          <path d="M3 4h18v3H3z" />
          <path d="M10 12h4" />
        </>
      );
    case 'bell':
      return (
        <>
          <path d="M6 17h12l-1.4-1.4A2 2 0 0 1 16 14.2V11a4 4 0 1 0-8 0v3.2a2 2 0 0 1-.6 1.4Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </>
      );
    case 'calendar':
      return (
        <>
          <path d="M4 6h16v14H4z" />
          <path d="M8 3v6" />
          <path d="M16 3v6" />
          <path d="M4 10h16" />
        </>
      );
    case 'chart':
      return (
        <>
          <path d="M5 20V9" />
          <path d="M12 20V5" />
          <path d="M19 20v-8" />
        </>
      );
    case 'check':
      return <path d="m5 12 4 4 10-10" />;
    case 'chevronDown':
      return <path d="m6 9 6 6 6-6" />;
    case 'chevronUp':
      return <path d="m6 15 6-6 6 6" />;
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case 'edit':
      return (
        <>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      );
    case 'file':
      return (
        <>
          <path d="M8 3h6l4 4v14H8z" />
          <path d="M14 3v4h4" />
        </>
      );
    case 'filter':
      return (
        <>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </>
      );
    case 'image':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m21 15-4-4-6 6-3-3-5 5" />
        </>
      );
    case 'inbox':
      return (
        <>
          <path d="M4 12 6.5 6h11L20 12v6H4z" />
          <path d="M8 12h8l-1.5 3h-5Z" />
        </>
      );
    case 'landmark':
      return (
        <>
          <path d="M3 10h18" />
          <path d="M5 10v7" />
          <path d="M9 10v7" />
          <path d="M15 10v7" />
          <path d="M19 10v7" />
          <path d="M2 20h20" />
          <path d="m12 4 8 4H4Z" />
        </>
      );
    case 'layout':
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M4 10h16" />
          <path d="M10 10v9" />
        </>
      );
    case 'left':
      return (
        <>
          <path d="m15 18-6-6 6-6" />
          <path d="M21 12H9" />
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 1 1 8 0v3" />
        </>
      );
    case 'logout':
      return (
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </>
      );
    case 'mail':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      );
    case 'megaphone':
      return (
        <>
          <path d="M3 11v2a2 2 0 0 0 2 2h2l5 3V6L7 9H5a2 2 0 0 0-2 2Z" />
          <path d="M16 8a5 5 0 0 1 0 8" />
          <path d="M18 5a9 9 0 0 1 0 14" />
        </>
      );
    case 'menu':
      return (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      );
    case 'mosque':
      return (
        <>
          <path d="M5 20h14" />
          <path d="M7 20v-6a5 5 0 0 1 10 0v6" />
          <path d="M12 4v4" />
          <path d="M10 8h4" />
        </>
      );
    case 'phone':
      return (
        <>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.5 10a16 16 0 0 0 6.5 6.5l1.5-1.5a2 2 0 0 1 1.8-.6l3 .5A2 2 0 0 1 22 16.9Z" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M20 6v5h-5" />
          <path d="M4 18v-5h5" />
          <path d="M6.5 9a7 7 0 0 1 11-2" />
          <path d="M17.5 15a7 7 0 0 1-11 2" />
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2" />
        </>
      );
    case 'send':
      return (
        <>
          <path d="m3 12 18-8-6 16-3-7-9-1Z" />
          <path d="m12 13 9-9" />
        </>
      );
    case 'settings':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.2a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.2a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.2a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
        </>
      );
    case 'users':
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 4.1a3 3 0 0 1 0 5.8" />
        </>
      );
    case 'warning':
      return (
        <>
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      );
    case 'x':
      return (
        <>
          <path d="m18 6-12 12" />
          <path d="m6 6 12 12" />
        </>
      );
  }
}
