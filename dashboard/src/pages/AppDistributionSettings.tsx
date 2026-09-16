import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAppDistributionRequest,
  updateAppDistributionRequest,
  type AppDistribution,
} from '../api/client';
import { DashboardFrame } from '../components/DashboardFrame';
import { SettingsTabs } from '../components/SettingsTabs';
import { alertApiError, toastSuccess } from '../lib/alerts';
import { formatSavedAt } from '../lib/format';

type DistributionForm = Omit<AppDistribution, 'updated_at'>;

const EMPTY_FORM: DistributionForm = {
  channel: 'direct_apk',
  enabled: false,
  apk_url: '',
  play_store_url: '',
  version_name: '',
  release_date: '',
  file_size: '',
  sha256: '',
  notice: '',
};

export function AppDistributionSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DistributionForm>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['settings', 'app-distribution'],
    queryFn: getAppDistributionRequest,
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    const { updated_at: _updatedAt, ...settings } = settingsQuery.data;
    setForm(settings);
    setDirty(false);
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateAppDistributionRequest({
        ...form,
        apk_url: emptyToNull(form.apk_url),
        play_store_url: emptyToNull(form.play_store_url),
        version_name: emptyToNull(form.version_name),
        release_date: emptyToNull(form.release_date),
        file_size: emptyToNull(form.file_size),
        sha256: emptyToNull(form.sha256),
        notice: emptyToNull(form.notice),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'app-distribution'] });
      await queryClient.invalidateQueries({ queryKey: ['app-distribution'] });
      setDirty(false);
      toastSuccess('Pengaturan distribusi tersimpan');
    },
    onError: (error) => alertApiError(error, 'Pengaturan distribusi gagal disimpan.'),
  });

  function setField<K extends keyof DistributionForm>(key: K, value: DistributionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  const activeUrl = form.channel === 'google_play' ? form.play_store_url : form.apk_url;
  const canEnable = Boolean(activeUrl?.trim());
  const landingPageUrl = `${window.location.origin}/`;
  const metadataIsAutomatic = form.channel === 'direct_apk';

  return (
    <DashboardFrame
      header={
        <div className="content-header">
          <div className="dashboard-topbar-copy">
            <h1>Distribusi Aplikasi</h1>
            <p>Kelola tombol unduh pada halaman publik tanpa mengubah QR yang sudah dicetak.</p>
          </div>
          <div className="content-header-actions">
            <span className="content-saved-at">
              {dirty
                ? 'Ada perubahan belum disimpan'
                : formatSavedAt(settingsQuery.data?.updated_at)
                  ? `Terakhir disimpan ${formatSavedAt(settingsQuery.data?.updated_at)}`
                  : 'Belum pernah disimpan'}
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={!dirty || mutation.isPending || (form.enabled && !canEnable)}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      }
    >
      <SettingsTabs />

      {settingsQuery.isLoading ? <div className="loading-state">Memuat pengaturan...</div> : null}

      <div className="content-layout">
        <div className="content-main">
          <section className="detail-card">
            <div className="detail-card-head">
              <div>
                <h2>Saluran Unduhan</h2>
                <small className="detail-card-note">
                  Pilih APK selama masa tunggu, lalu pindahkan ke Google Play setelah tayang.
                </small>
              </div>
              <label className="distribution-enable-toggle">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setField('enabled', event.target.checked)}
                />
                <span>{form.enabled ? 'Publik aktif' : 'Publik nonaktif'}</span>
              </label>
            </div>

            {form.enabled ? (
              <>
                <div className="distribution-channel-picker" role="radiogroup" aria-label="Saluran distribusi">
                  <ChannelOption
                    title="Unduh APK langsung"
                    description="Untuk distribusi sementara melalui website resmi."
                    checked={form.channel === 'direct_apk'}
                    onChange={() => setField('channel', 'direct_apk')}
                  />
                  <ChannelOption
                    title="Google Play"
                    description="Gunakan setelah halaman aplikasi resmi sudah tersedia."
                    checked={form.channel === 'google_play'}
                    onChange={() => setField('channel', 'google_play')}
                  />
                </div>

                <div className="content-form-grid">
                  {form.channel === 'direct_apk' ? (
                    <TextField
                      id="distribution-apk-url"
                      label="URL APK produksi"
                      value={form.apk_url ?? ''}
                      placeholder="/api/app-distribution/android.apk"
                      hint="Endpoint resmi ini hanya tersedia ketika saluran APK aktif."
                      onChange={(value) => setField('apk_url', value)}
                    />
                  ) : (
                    <TextField
                      id="distribution-play-url"
                      label="URL Google Play"
                      value={form.play_store_url ?? ''}
                      placeholder="https://play.google.com/store/apps/details?id=..."
                      onChange={(value) => setField('play_store_url', value)}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="distribution-inactive-note">
                Saluran dan alamat unduhan disembunyikan sampai Publik aktif dipilih.
              </div>
            )}
          </section>

          <section className="detail-card">
            <div className="detail-card-head">
              <div>
                <h2>Informasi Rilis</h2>
                <small className="detail-card-note">
                  {!form.enabled
                    ? 'Atur tanggal rencana peluncuran dan pengumuman yang dilihat warga.'
                    : metadataIsAutomatic
                    ? 'Versi, ukuran, dan checksum dibaca otomatis dari APK produksi. Tanggal rilis dapat dijadwalkan.'
                    : 'Ditampilkan untuk membantu warga mengenali rilis resmi.'}
                </small>
              </div>
            </div>
            <div className="content-form-grid">
              {form.enabled ? (
                <TextField
                  id="distribution-version"
                  label="Versi aplikasi"
                  value={form.version_name ?? ''}
                  placeholder="1.0.0"
                  disabled={metadataIsAutomatic}
                  onChange={(value) => setField('version_name', value)}
                />
              ) : null}
              <div className="field">
                <label htmlFor="distribution-date">Tanggal rilis</label>
                <input
                  id="distribution-date"
                  type="date"
                  value={form.release_date ?? ''}
                  onChange={(event) => setField('release_date', event.target.value)}
                />
              </div>
              {form.enabled ? (
                <>
                  <TextField
                    id="distribution-size"
                    label="Ukuran berkas"
                    value={form.file_size ?? ''}
                    placeholder="42 MB"
                    disabled={metadataIsAutomatic}
                    onChange={(value) => setField('file_size', value)}
                  />
                  <TextField
                    id="distribution-sha"
                    label="SHA-256 APK"
                    value={form.sha256 ?? ''}
                    placeholder="64 karakter heksadesimal"
                    hint="Opsional, tetapi disarankan untuk APK langsung."
                    disabled={metadataIsAutomatic}
                    onChange={(value) => setField('sha256', value.replace(/\s/g, ''))}
                  />
                </>
              ) : null}
              <div className="field span-2">
                <label htmlFor="distribution-notice">Pengumuman singkat</label>
                <textarea
                  id="distribution-notice"
                  rows={3}
                  maxLength={300}
                  value={form.notice ?? ''}
                  placeholder="Aplikasi sedang dalam proses publikasi di Google Play."
                  onChange={(event) => setField('notice', event.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="content-aside">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Alamat QR Permanen</h2>
            </div>
            <div className="content-aside-body">
              <code className="distribution-permanent-url">{landingPageUrl}</code>
              <p className="aside-copy">
                QR cetak selalu diarahkan ke alamat ini. Perubahan saluran hanya mengganti tombol di halaman publik.
              </p>
              <a className="secondary-button full-width" href="/" target="_blank" rel="noreferrer">
                Buka Halaman Publik
              </a>
            </div>
          </section>

          <section className="notice-card distribution-safety-note">
            <span className="dashboard-stat-icon warning">!</span>
            <div>
              <b>Aktifkan hanya setelah APK siap</b>
              <small>
                Pastikan package ID dan sertifikat penandatanganan kompatibel dengan rilis Google Play.
              </small>
            </div>
          </section>
        </aside>
      </div>
    </DashboardFrame>
  );
}

function ChannelOption({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`distribution-channel${checked ? ' active' : ''}`}>
      <input type="radio" name="distribution-channel" checked={checked} onChange={onChange} />
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  hint,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  );
}

function emptyToNull(value: string | null) {
  return value?.trim() || null;
}
