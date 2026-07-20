import type { ReactNode } from 'react';
import type { EmailProviderId, EmailProviderOption } from '../api/client';
import { AppIcon } from './AppIcon';

type ProviderStatusCardProps = {
  provider: EmailProviderOption;
  activeProvider: EmailProviderId;
  defaultProvider: EmailProviderId;
  expanded: boolean;
  busy?: boolean;
  onSelect: (provider: EmailProviderId) => void;
  onToggle: (provider: EmailProviderId) => void;
  children?: ReactNode;
};

const PROVIDER_DESCRIPTIONS: Record<EmailProviderId, string> = {
  mailersend: 'Default utama untuk pengiriman surat resmi dengan deliverability yang paling stabil saat ini.',
  mailgun: 'Alternatif provider API untuk volume kirim tinggi dan fallback operasional.',
  gmail: 'Cocok untuk akun Workspace kantor, tetapi sebaiknya dipakai hanya bila kredensial sudah lengkap.',
  smtp: 'Gunakan bila kantor memiliki server SMTP sendiri atau relay dari penyedia lain.',
};

export function ProviderStatusCard({
  provider,
  activeProvider,
  defaultProvider,
  expanded,
  busy = false,
  onSelect,
  onToggle,
  children,
}: ProviderStatusCardProps) {
  const isActive = provider.id === activeProvider;
  const isDefault = provider.id === defaultProvider;
  const summaryRows = getProviderSummaryRows(provider);

  return (
    <article
      className={`provider-card${isActive ? ' active' : ''}${provider.configured ? '' : ' disabled'}${
        expanded ? '' : ' collapsed'
      }`}
    >
      <div className="provider-card-head">
        <div className="provider-card-title">
          <h2>{provider.label}</h2>
          <div className="provider-card-tags">
            {isActive ? <span className="request-badge approved">Aktif</span> : null}
            {isDefault ? <span className="request-badge generated">Default</span> : null}
            <span className={`request-badge ${provider.configured ? 'approved' : 'rejected'}`}>
              {provider.configured ? 'Siap Dipakai' : 'Belum Siap'}
            </span>
          </div>
        </div>

        <div className="provider-card-head-actions">
          <button
            className="provider-card-toggle"
            type="button"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Tutup' : 'Buka'} panel ${provider.label}`}
            onClick={() => onToggle(provider.id)}
          >
            <span>{expanded ? 'Tutup' : 'Buka'}</span>
            <AppIcon name={expanded ? 'chevronUp' : 'chevronDown'} />
          </button>

          <div className={`provider-card-state ${provider.configured ? 'ok' : 'warn'}`}>
            <AppIcon name={provider.configured ? 'check' : 'warning'} />
          </div>
        </div>
      </div>

      <p>{PROVIDER_DESCRIPTIONS[provider.id]}</p>

      {expanded ? (
        <>
          <div className="provider-summary-grid">
            {summaryRows.map((row) => (
              <div key={`${provider.id}-${row.label}`} className="provider-summary-item">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          {children ? <div className="provider-card-body">{children}</div> : null}
        </>
      ) : null}

      <div className="provider-card-foot">
        <div className="provider-card-meta">
          <span>ID provider</span>
          <strong>{provider.id}</strong>
        </div>

        <button
          className={`table-action ${isActive ? 'ghost' : 'primary'}`}
          type="button"
          disabled={busy || isActive || !provider.configured}
          onClick={() => onSelect(provider.id)}
        >
          {isActive
            ? 'Sedang Aktif'
            : !provider.configured
              ? 'Belum Dikonfigurasi'
              : `Gunakan ${provider.label}`}
        </button>
      </div>
    </article>
  );
}

function getProviderSummaryRows(provider: EmailProviderOption) {
  const summary = provider.config_summary;

  switch (provider.id) {
    case 'mailersend':
      return [
        { label: 'Email pengirim', value: summary.from_email ?? 'Belum diisi' },
        { label: 'Nama pengirim', value: summary.from_name ?? 'Belum diisi' },
        { label: 'API key', value: summary.has_api_key ? 'Tersimpan' : 'Belum ada' },
      ];
    case 'mailgun':
      return [
        { label: 'Email pengirim', value: summary.from_email ?? 'Belum diisi' },
        { label: 'Domain', value: summary.domain ?? 'Belum diisi' },
        { label: 'API key', value: summary.has_api_key ? 'Tersimpan' : 'Belum ada' },
      ];
    case 'gmail':
      return [
        { label: 'Email pengirim', value: summary.from_email ?? 'Belum diisi' },
        { label: 'Username', value: summary.username ?? 'Belum diisi' },
        { label: 'App password', value: summary.has_app_password ? 'Tersimpan' : 'Belum ada' },
      ];
    case 'smtp':
      return [
        { label: 'Email pengirim', value: summary.from_email ?? 'Belum diisi' },
        { label: 'Host', value: summary.host ?? 'Belum diisi' },
        {
          label: 'Port / Secure',
          value:
            summary.port != null
              ? `${summary.port}${summary.secure === true ? ' / TLS' : summary.secure === false ? ' / Non-TLS' : ''}`
              : 'Belum diisi',
        },
      ];
  }
}
