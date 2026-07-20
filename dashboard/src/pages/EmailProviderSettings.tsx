import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getEmailProviderSettingsRequest,
  sendEmailProviderTestRequest,
  updateEmailProviderConfigRequest,
  updateEmailProviderSettingsRequest,
  type EmailProviderId,
  type EmailProviderOption,
  type UpdateEmailProviderConfigInput,
} from '../api/client';
import { getStoredSession } from '../auth/session';
import { AppIcon } from '../components/AppIcon';
import { DashboardFrame } from '../components/DashboardFrame';
import { ProviderStatusCard } from '../components/ProviderStatusCard';

const TEST_EMAIL_STORAGE_KEY = 'sapa-email-provider-test-targets';

type ProviderFormState = {
  from_email: string;
  from_name: string;
  api_key: string;
  domain: string;
  api_base_url: string;
  username: string;
  app_password: string;
  host: string;
  port: string;
  secure: boolean;
  password: string;
  test_email: string;
};

type ProviderFormsState = Record<EmailProviderId, ProviderFormState>;

type FeedbackState = {
  tone: 'success' | 'error';
  title: string;
  body: string;
} | null;

type ExpandedProvidersState = Partial<Record<EmailProviderId, boolean>>;

export function EmailProviderSettingsPage() {
  const queryClient = useQueryClient();
  const session = getStoredSession();
  const defaultTestEmail = session?.user.email ?? '';
  const storedTestEmails = loadStoredTestEmails();
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [expandedProviders, setExpandedProviders] = useState<ExpandedProvidersState>({});
  const [forms, setForms] = useState<ProviderFormsState>(() =>
    createEmptyProviderForms(defaultTestEmail, storedTestEmails),
  );

  const settingsQuery = useQuery({
    queryKey: ['email-provider-settings'],
    queryFn: getEmailProviderSettingsRequest,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setForms((current) =>
      buildProviderForms(settingsQuery.data.providers, defaultTestEmail, loadStoredTestEmails(), current),
    );
    setExpandedProviders((current) =>
      initializeExpandedProviders(settingsQuery.data.providers, settingsQuery.data.active_provider, current),
    );
  }, [defaultTestEmail, settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (provider: EmailProviderId) => updateEmailProviderSettingsRequest(provider),
    onSuccess: async (next, provider) => {
      setFeedback({
        tone: 'success',
        title: 'Provider aktif diperbarui',
        body: `Pengiriman email berikutnya akan menggunakan ${getProviderLabel(next.providers, provider)}.`,
      });
      setExpandedProviders((current) => ({
        ...current,
        [provider]: true,
      }));
      queryClient.setQueryData(['email-provider-settings'], next);
      await queryClient.invalidateQueries({ queryKey: ['email-provider-settings'] });
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        title: 'Provider aktif belum berubah',
        body: error instanceof Error ? error.message : 'Provider email tidak dapat diperbarui.',
      });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: (input: UpdateEmailProviderConfigInput) => updateEmailProviderConfigRequest(input),
    onSuccess: async (next, input) => {
      setForms((current) =>
        buildProviderForms(next.providers, defaultTestEmail, loadStoredTestEmails(), current),
      );
      setFeedback({
        tone: 'success',
        title: 'Konfigurasi tersimpan',
        body: `${getProviderLabel(next.providers, input.provider)} sudah diperbarui dan status kesiapan telah disegarkan.`,
      });
      queryClient.setQueryData(['email-provider-settings'], next);
      await queryClient.invalidateQueries({ queryKey: ['email-provider-settings'] });
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        title: 'Konfigurasi gagal disimpan',
        body: error instanceof Error ? error.message : 'Konfigurasi provider tidak dapat diperbarui.',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (input: { provider: EmailProviderId; to_email: string }) => sendEmailProviderTestRequest(input),
    onSuccess: (result, input) => {
      setFeedback({
        tone: 'success',
        title: 'Email uji berhasil dikirim',
        body: `${getProviderTitle(input.provider)} sudah mengirim email uji ke ${input.to_email}.`,
      });
      setForms((current) => ({
        ...current,
        [input.provider]: {
          ...current[input.provider],
          test_email: input.to_email,
        },
      }));
      saveStoredTestEmails({
        ...loadStoredTestEmails(),
        [input.provider]: input.to_email,
      });
      void queryClient.invalidateQueries({ queryKey: ['email-provider-settings'] });
      void result;
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        title: 'Email uji gagal dikirim',
        body: error instanceof Error ? error.message : 'Backend tidak dapat mengirim email uji.',
      });
    },
  });

  function updateField(provider: EmailProviderId, key: keyof ProviderFormState, value: string | boolean) {
    setForms((current) => {
      const next = {
        ...current,
        [provider]: {
          ...current[provider],
          [key]: value,
        },
      };

      if (key === 'test_email' && typeof value === 'string') {
        saveStoredTestEmails({
          ...loadStoredTestEmails(),
          [provider]: value,
        });
      }

      return next;
    });
  }

  function saveProviderConfig(provider: EmailProviderId) {
    setFeedback(null);
    saveConfigMutation.mutate(buildConfigPayload(provider, forms[provider]));
  }

  function sendTestEmail(provider: EmailProviderId) {
    const toEmail = forms[provider].test_email.trim();

    if (!toEmail) {
      setFeedback({
        tone: 'error',
        title: 'Email tujuan wajib diisi',
        body: 'Masukkan alamat email tujuan untuk pengiriman email uji terlebih dahulu.',
      });
      return;
    }

    setFeedback(null);
    testMutation.mutate({ provider, to_email: toEmail });
  }

  function toggleProvider(provider: EmailProviderId) {
    setExpandedProviders((current) => ({
      ...current,
      [provider]: !current[provider],
    }));
  }

  const busyProvider =
    updateMutation.variables ??
    saveConfigMutation.variables?.provider ??
    testMutation.variables?.provider ??
    null;

  return (
    <DashboardFrame
      header={
        <div className="dashboard-topbar-copy">
          <h1>Pengaturan Email Provider</h1>
          <p>Pilih provider email aktif, simpan kredensial di database, lalu kirim email uji langsung dari dashboard.</p>
        </div>
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
                <strong>
                  {getProviderLabel(settingsQuery.data.providers, settingsQuery.data.active_provider)}
                </strong>
              </div>
              <div className="mini-summary-row">
                <span>Provider default sistem</span>
                <strong>
                  {getProviderLabel(settingsQuery.data.providers, settingsQuery.data.default_provider)}
                </strong>
              </div>
              <div className="mini-summary-row">
                <span>Provider siap dipakai</span>
                <strong>
                  {settingsQuery.data.providers.filter((item) => item.configured).length} dari{' '}
                  {settingsQuery.data.providers.length}
                </strong>
              </div>

              {feedback ? (
                <div className={feedback.tone === 'success' ? 'success-box' : 'error-box'} role="status">
                  <strong>{feedback.title}</strong>
                  <p>{feedback.body}</p>
                </div>
              ) : null}

              <div className="warning-box">
                <AppIcon name="warning" />
                <div>
                  <strong>Rahasia tidak ditampilkan di browser</strong>
                  <p>
                    API key, app password, dan sandi SMTP tidak pernah dikembalikan oleh API. Bila ingin mengganti rahasia,
                    isi ulang kolom sandi lalu simpan kembali.
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
                expanded={Boolean(expandedProviders[provider.id])}
                busy={Boolean(busyProvider && busyProvider === provider.id)}
                onSelect={(nextProvider) => updateMutation.mutate(nextProvider)}
                onToggle={toggleProvider}
              >
                <div className="provider-form-grid">
                  <label className="field">
                    <span>Email pengirim</span>
                    <input
                      className="field-input"
                      name={`${provider.id}-from-email`}
                      type="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={forms[provider.id]?.from_email ?? ''}
                      onChange={(event) => updateField(provider.id, 'from_email', event.target.value)}
                      placeholder="no-reply@gampongblang.id"
                    />
                  </label>

                  <label className="field">
                    <span>Nama pengirim</span>
                    <input
                      className="field-input"
                      name={`${provider.id}-from-name`}
                      autoComplete="off"
                      value={forms[provider.id]?.from_name ?? ''}
                      onChange={(event) => updateField(provider.id, 'from_name', event.target.value)}
                      placeholder="Administrasi Gampong Blang"
                    />
                  </label>

                  {renderProviderSpecificFields(provider.id, forms[provider.id], updateField)}
                </div>

                <div className="provider-test-grid">
                  <label className="field provider-test-field">
                    <span>Email tujuan uji</span>
                    <input
                      className="field-input"
                      name={`${provider.id}-test-recipient`}
                      type="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      data-1p-ignore="true"
                      data-lpignore="true"
                      value={forms[provider.id]?.test_email ?? ''}
                      onChange={(event) => updateField(provider.id, 'test_email', event.target.value)}
                      placeholder="operator@gampongblang.id"
                    />
                  </label>

                  {provider.id === 'smtp' ? (
                    <div className="provider-inline-toggle">
                      <span>Keamanan</span>
                      <label className="remember-toggle">
                        <input
                          type="checkbox"
                          checked={forms[provider.id]?.secure ?? false}
                          onChange={(event) => updateField(provider.id, 'secure', event.target.checked)}
                        />
                        <span className={`remember-box${forms[provider.id]?.secure ? ' checked' : ''}`} />
                        <span>Gunakan secure/TLS</span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <div className="provider-action-row">
                  <button
                    className="table-action ghost"
                    type="button"
                    aria-label={`Simpan konfigurasi ${provider.label}`}
                    disabled={saveConfigMutation.isPending || updateMutation.isPending || testMutation.isPending}
                    onClick={() => saveProviderConfig(provider.id)}
                  >
                    {saveConfigMutation.isPending && busyProvider === provider.id ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </button>

                  <button
                    className="table-action gold"
                    type="button"
                    aria-label={`Kirim email uji ${provider.label}`}
                    disabled={
                      !provider.configured || saveConfigMutation.isPending || updateMutation.isPending || testMutation.isPending
                    }
                    onClick={() => sendTestEmail(provider.id)}
                  >
                    {testMutation.isPending && busyProvider === provider.id ? 'Mengirim...' : 'Kirim Email Uji'}
                  </button>
                </div>
              </ProviderStatusCard>
            ))}
          </section>
        </div>
      ) : null}
    </DashboardFrame>
  );
}

function createEmptyProviderForms(
  defaultTestEmail: string,
  storedTestEmails: Partial<Record<EmailProviderId, string>>,
): ProviderFormsState {
  return {
    mailersend: createProviderForm(defaultTestEmail, storedTestEmails.mailersend),
    mailgun: createProviderForm(defaultTestEmail, storedTestEmails.mailgun),
    gmail: createProviderForm(defaultTestEmail, storedTestEmails.gmail),
    smtp: createProviderForm(defaultTestEmail, storedTestEmails.smtp),
  };
}

function createProviderForm(defaultTestEmail: string, storedTestEmail?: string): ProviderFormState {
  return {
    from_email: '',
    from_name: '',
    api_key: '',
    domain: '',
    api_base_url: '',
    username: '',
    app_password: '',
    host: '',
    port: '',
    secure: false,
    password: '',
    test_email: storedTestEmail?.trim() || defaultTestEmail,
  };
}

function buildProviderForms(
  providers: EmailProviderOption[],
  defaultTestEmail: string,
  storedTestEmails: Partial<Record<EmailProviderId, string>>,
  current?: ProviderFormsState,
): ProviderFormsState {
  const next = createEmptyProviderForms(defaultTestEmail, storedTestEmails);

  for (const provider of providers) {
    next[provider.id] = {
      ...createProviderForm(defaultTestEmail, storedTestEmails[provider.id]),
      from_email: provider.config_summary.from_email ?? '',
      from_name: provider.config_summary.from_name ?? '',
      domain: provider.config_summary.domain ?? '',
      api_base_url: provider.config_summary.api_base_url ?? '',
      username: provider.config_summary.username ?? '',
      host: provider.config_summary.host ?? '',
      port: provider.config_summary.port != null ? String(provider.config_summary.port) : '',
      secure: provider.config_summary.secure ?? false,
      api_key: '',
      app_password: '',
      password: '',
      test_email:
        current?.[provider.id]?.test_email?.trim() ||
        storedTestEmails[provider.id]?.trim() ||
        defaultTestEmail,
    };
  }

  return next;
}

function loadStoredTestEmails(): Partial<Record<EmailProviderId, string>> {
  try {
    const raw = window.localStorage.getItem(TEST_EMAIL_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<Record<EmailProviderId, string>>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredTestEmails(value: Partial<Record<EmailProviderId, string>>) {
  try {
    window.localStorage.setItem(TEST_EMAIL_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep the current in-memory form state working.
  }
}

function initializeExpandedProviders(
  providers: EmailProviderOption[],
  _activeProvider: EmailProviderId,
  current: ExpandedProvidersState,
): ExpandedProvidersState {
  const next = { ...current };

  for (const provider of providers) {
    if (typeof next[provider.id] !== 'boolean') {
      next[provider.id] = false;
    }
  }

  return next;
}

function buildConfigPayload(provider: EmailProviderId, form: ProviderFormState): UpdateEmailProviderConfigInput {
  const base = {
    provider,
    from_email: normalizeOptionalString(form.from_email),
    from_name: normalizeOptionalString(form.from_name),
  };

  switch (provider) {
    case 'mailersend':
      return {
        ...base,
        api_key: normalizeOptionalString(form.api_key),
      };
    case 'mailgun':
      return {
        ...base,
        api_key: normalizeOptionalString(form.api_key),
        domain: normalizeOptionalString(form.domain),
        api_base_url: normalizeOptionalString(form.api_base_url),
      };
    case 'gmail':
      return {
        ...base,
        username: normalizeOptionalString(form.username),
        app_password: normalizeOptionalString(form.app_password),
      };
    case 'smtp':
      return {
        ...base,
        host: normalizeOptionalString(form.host),
        port: normalizeOptionalNumber(form.port),
        secure: form.secure,
        username: normalizeOptionalString(form.username),
        password: normalizeOptionalString(form.password),
      };
  }
}

function normalizeOptionalString(value: string) {
  const next = value.trim();
  return next ? next : undefined;
}

function normalizeOptionalNumber(value: string) {
  const next = value.trim();
  if (!next) return undefined;

  const parsed = Number(next);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getProviderLabel(providers: EmailProviderOption[], providerId: EmailProviderId) {
  return providers.find((item) => item.id === providerId)?.label ?? getProviderTitle(providerId);
}

function getProviderTitle(provider: EmailProviderId) {
  switch (provider) {
    case 'mailersend':
      return 'MailerSend';
    case 'mailgun':
      return 'Mailgun';
    case 'gmail':
      return 'Gmail';
    case 'smtp':
      return 'SMTP';
  }
}

function renderProviderSpecificFields(
  provider: EmailProviderId,
  form: ProviderFormState | undefined,
  updateField: (provider: EmailProviderId, key: keyof ProviderFormState, value: string | boolean) => void,
) {
  if (!form) {
    return null;
  }

  switch (provider) {
    case 'mailersend':
      return (
        <>
          <label className="field provider-form-span">
            <span>API key</span>
            <input
              className="field-input"
              name={`${provider}-api-key`}
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              value={form.api_key}
              onChange={(event) => updateField(provider, 'api_key', event.target.value)}
              placeholder="Isi baru untuk memperbarui API key"
            />
          </label>
          <div className="field-hint">API key sudah tersimpan di backend. Isi kolom ini hanya bila ingin mengganti.</div>
        </>
      );
    case 'mailgun':
      return (
        <>
          <label className="field">
            <span>Domain Mailgun</span>
            <input
              className="field-input"
              name={`${provider}-domain`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.domain}
              onChange={(event) => updateField(provider, 'domain', event.target.value)}
              placeholder="mg.gampongblang.id"
            />
          </label>
          <label className="field">
            <span>API base URL</span>
            <input
              className="field-input"
              name={`${provider}-api-base-url`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.api_base_url}
              onChange={(event) => updateField(provider, 'api_base_url', event.target.value)}
              placeholder="https://api.mailgun.net"
            />
          </label>
          <label className="field provider-form-span">
            <span>API key</span>
            <input
              className="field-input"
              type="password"
              name={`${provider}-api-key`}
              autoComplete="new-password"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              value={form.api_key}
              onChange={(event) => updateField(provider, 'api_key', event.target.value)}
              placeholder="Isi baru untuk memperbarui API key"
            />
          </label>
          <div className="field-hint">API key sudah tersimpan di backend. Isi kolom ini hanya bila ingin mengganti.</div>
        </>
      );
    case 'gmail':
      return (
        <>
          <label className="field">
            <span>Username Gmail</span>
            <input
              className="field-input"
              name={`${provider}-username`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.username}
              onChange={(event) => updateField(provider, 'username', event.target.value)}
              placeholder="admin@gampongblang.id"
            />
          </label>
          <label className="field">
            <span>App password</span>
            <input
              className="field-input"
              type="password"
              name={`${provider}-app-password`}
              autoComplete="new-password"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              value={form.app_password}
              onChange={(event) => updateField(provider, 'app_password', event.target.value)}
              placeholder="Isi baru untuk memperbarui app password"
            />
          </label>
          <div className="field-hint">App password sudah tersimpan di backend. Isi ulang hanya bila ingin memperbarui.</div>
        </>
      );
    case 'smtp':
      return (
        <>
          <label className="field">
            <span>SMTP host</span>
            <input
              className="field-input"
              name={`${provider}-host`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.host}
              onChange={(event) => updateField(provider, 'host', event.target.value)}
              placeholder="smtp.provider.id"
            />
          </label>
          <label className="field">
            <span>Port</span>
            <input
              className="field-input"
              name={`${provider}-port`}
              autoComplete="off"
              inputMode="numeric"
              value={form.port}
              onChange={(event) => updateField(provider, 'port', event.target.value)}
              placeholder="587"
            />
          </label>
          <label className="field">
            <span>Username SMTP</span>
            <input
              className="field-input"
              name={`${provider}-username`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={form.username}
              onChange={(event) => updateField(provider, 'username', event.target.value)}
              placeholder="username SMTP"
            />
          </label>
          <label className="field">
            <span>Password SMTP</span>
            <input
              className="field-input"
              type="password"
              name={`${provider}-password`}
              autoComplete="new-password"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              value={form.password}
              onChange={(event) => updateField(provider, 'password', event.target.value)}
              placeholder="Isi baru untuk memperbarui password"
            />
          </label>
          <div className="field-hint">Password SMTP sudah tersimpan di backend. Isi ulang hanya bila ingin memperbarui.</div>
        </>
      );
  }
}
