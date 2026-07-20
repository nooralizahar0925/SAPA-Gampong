import { AppIcon } from './AppIcon';
import type { EmailProviderId, EmailProviderOption } from '../api/client';

type ProviderStatusCardProps = {
  provider: EmailProviderOption;
  activeProvider: EmailProviderId;
  defaultProvider: EmailProviderId;
  busy?: boolean;
  onSelect: (provider: EmailProviderId) => void;
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
  busy = false,
  onSelect,
}: ProviderStatusCardProps) {
  const isActive = provider.id === activeProvider;
  const isDefault = provider.id === defaultProvider;

  return (
    <article className={`provider-card${isActive ? ' active' : ''}${provider.configured ? '' : ' disabled'}`}>
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

        <div className={`provider-card-state ${provider.configured ? 'ok' : 'warn'}`}>
          <AppIcon name={provider.configured ? 'check' : 'warning'} />
        </div>
      </div>

      <p>{PROVIDER_DESCRIPTIONS[provider.id]}</p>

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
