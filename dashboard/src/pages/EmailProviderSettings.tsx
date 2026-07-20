import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEmailProviderSettingsRequest,
  updateEmailProviderSettingsRequest,
  type EmailProviderId,
} from '../api/client';
import { AppIcon } from '../components/AppIcon';
import { DashboardFrame } from '../components/DashboardFrame';
import { ProviderStatusCard } from '../components/ProviderStatusCard';

export function EmailProviderSettingsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['email-provider-settings'],
    queryFn: getEmailProviderSettingsRequest,
  });

  const updateMutation = useMutation({
    mutationFn: (provider: EmailProviderId) => updateEmailProviderSettingsRequest(provider),
    onSuccess: async (next) => {
      queryClient.setQueryData(['email-provider-settings'], next);
      await queryClient.invalidateQueries({ queryKey: ['email-provider-settings'] });
    },
  });

  return (
    <DashboardFrame
      header={
        <>
          <div className="dashboard-topbar-copy">
            <h1>Pengaturan Email Provider</h1>
            <p>Pilih provider email aktif untuk pengiriman surat resmi dari dashboard administrasi.</p>
          </div>
        </>
      }
    >
      {settingsQuery.isLoading ? <div className="loading-state">Memuat konfigurasi email provider...</div> : null}

      {settingsQuery.isError ? (
        <div className="error-box" role="alert">
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : 'Pengaturan email provider tidak dapat dimuat.'}
        </div>
      ) : null}

      {settingsQuery.data ? (
        <div className="provider-settings-grid">
          <section className="detail-card">
            <div className="detail-card-head">
              <h2>Ringkasan Provider Aktif</h2>
            </div>
            <div className="detail-card-body stacked">
              <div className="mini-summary-row">
                <span>Provider aktif saat ini</span>
                <strong>{settingsQuery.data.providers.find((item) => item.id === settingsQuery.data.active_provider)?.label ?? settingsQuery.data.active_provider}</strong>
              </div>
              <div className="mini-summary-row">
                <span>Provider default sistem</span>
                <strong>{settingsQuery.data.providers.find((item) => item.id === settingsQuery.data.default_provider)?.label ?? settingsQuery.data.default_provider}</strong>
              </div>
              <div className="mini-summary-row">
                <span>Provider siap dipakai</span>
                <strong>{settingsQuery.data.providers.filter((item) => item.configured).length} dari {settingsQuery.data.providers.length}</strong>
              </div>

              {updateMutation.isSuccess ? (
                <div className="info-box" role="status">
                  <strong>Provider berhasil diperbarui</strong>
                  <p>Pengiriman email berikutnya akan memakai provider yang baru dipilih.</p>
                </div>
              ) : null}

              {updateMutation.isError ? (
                <div className="error-box" role="alert">
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : 'Provider email tidak dapat diperbarui.'}
                </div>
              ) : null}

              <div className="warning-box">
                <AppIcon name="warning" />
                <div>
                  <strong>Rahasia tidak ditampilkan di browser</strong>
                  <p>
                    Dashboard hanya menampilkan status kesiapan provider. API key, sandi SMTP, dan token akses tetap tersimpan di backend.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="provider-list">
            {settingsQuery.data.providers.map((provider) => (
              <ProviderStatusCard
                key={provider.id}
                provider={provider}
                activeProvider={settingsQuery.data.active_provider}
                defaultProvider={settingsQuery.data.default_provider}
                busy={updateMutation.isPending}
                onSelect={(nextProvider) => updateMutation.mutate(nextProvider)}
              />
            ))}
          </section>
        </div>
      ) : null}
    </DashboardFrame>
  );
}
