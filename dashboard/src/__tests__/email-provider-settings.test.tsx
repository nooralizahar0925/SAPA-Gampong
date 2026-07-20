import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import type { EmailProviderSettingsResponse } from '../api/client';
import { setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';
import { server } from '../test/server';

function renderApp(initialEntries: string[]) {
  setStoredSession({
    token: 'test-token',
    user: {
      id: 'admin-1',
      name: 'Admin Gampong',
      email: 'admin@gampongblang.id',
      role: 'admin',
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('email provider settings page', () => {
  it('loads provider metadata, saves configuration, sends a test email, and switches the active provider', async () => {
    const user = userEvent.setup();
    let capturedProvider: string | null = null;
    let capturedConfigBody: Record<string, unknown> | null = null;
    let capturedTestBody: Record<string, unknown> | null = null;
    let settings: EmailProviderSettingsResponse = {
      active_provider: 'mailgun',
      default_provider: 'mailersend',
      providers: [
        {
          id: 'mailersend',
          label: 'MailerSend',
          configured: true,
          config_summary: {
            from_email: 'letters@gampongblang.id',
            from_name: 'Administrasi Gampong Blang',
            has_api_key: true,
          },
        },
        {
          id: 'mailgun',
          label: 'Mailgun',
          configured: false,
          config_summary: {
            from_email: null,
            from_name: null,
            domain: null,
            api_base_url: null,
            has_api_key: false,
          },
        },
        {
          id: 'gmail',
          label: 'Gmail',
          configured: false,
          config_summary: {
            from_email: null,
            username: null,
            has_app_password: false,
          },
        },
        {
          id: 'smtp',
          label: 'SMTP',
          configured: false,
          config_summary: {
            from_email: null,
            host: null,
            port: null,
            secure: null,
            username: null,
            has_password: false,
          },
        },
      ],
    };

    server.use(
      http.get('http://localhost:8080/api/settings/email-provider', () => HttpResponse.json(settings)),
      http.patch('http://localhost:8080/api/settings/email-provider/config', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        capturedConfigBody = body;

        settings = {
          ...settings,
          providers: settings.providers.map((provider) =>
            provider.id === body.provider
              ? {
                  ...provider,
                  configured: true,
                  config_summary: {
                    ...provider.config_summary,
                    from_email: String(body.from_email ?? ''),
                    from_name: String(body.from_name ?? ''),
                    domain: String(body.domain ?? ''),
                    api_base_url: String(body.api_base_url ?? ''),
                    has_api_key: true,
                  },
                }
              : provider,
          ),
        };

        return HttpResponse.json(settings);
      }),
      http.post('http://localhost:8080/api/settings/email-provider/test', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        capturedTestBody = body;

        return HttpResponse.json({
          message: `Test email sent via Mailgun to ${String(body.to_email ?? '')}.`,
        });
      }),
      http.patch('http://localhost:8080/api/settings/email-provider', async ({ request }) => {
        const body = (await request.json()) as { provider?: string };
        capturedProvider = body.provider ?? null;

        settings = {
          ...settings,
          active_provider: body.provider as typeof settings.active_provider,
        };

        return HttpResponse.json(settings);
      }),
    );

    renderApp(['/settings/email-provider']);

    expect(await screen.findByRole('heading', { name: /mailgun/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mailersend/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /gmail/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^smtp$/i })).toBeInTheDocument();

    const mailgunCardHeading = screen.getByRole('heading', { name: /mailgun/i });
    const mailgunCard = mailgunCardHeading.closest('article');

    expect(mailgunCard).not.toBeNull();

    const card = within(mailgunCard as HTMLElement);
    await user.click(card.getByRole('button', { name: /buka panel mailgun/i }));
    expect(await card.findByLabelText(/email pengirim/i)).toBeInTheDocument();

    await user.type(card.getByLabelText(/email pengirim/i), 'mailgun@gampongblang.id');
    await user.type(card.getByLabelText(/nama pengirim/i), 'Desk Layanan Surat');
    await user.type(card.getByLabelText(/domain mailgun/i), 'mg.gampongblang.id');
    await user.type(card.getByLabelText(/api base url/i), 'https://api.mailgun.net');
    await user.type(card.getByLabelText(/^api key$/i), 'mailgun-secret-key');
    await user.clear(card.getByLabelText(/email tujuan uji/i));
    await user.type(card.getByLabelText(/email tujuan uji/i), 'operator@gampongblang.id');

    await user.click(card.getByRole('button', { name: /simpan konfigurasi mailgun/i }));

    await waitFor(() => {
      expect(capturedConfigBody).toMatchObject({
        provider: 'mailgun',
        from_email: 'mailgun@gampongblang.id',
        from_name: 'Desk Layanan Surat',
        domain: 'mg.gampongblang.id',
        api_base_url: 'https://api.mailgun.net',
        api_key: 'mailgun-secret-key',
      });
    });

    expect(await screen.findByText(/konfigurasi tersimpan/i)).toBeInTheDocument();

    const refreshedMailgunCardHeading = screen.getByRole('heading', { name: /mailgun/i });
    const refreshedMailgunCard = refreshedMailgunCardHeading.closest('article');
    expect(refreshedMailgunCard).not.toBeNull();
    const refreshedCard = within(refreshedMailgunCard as HTMLElement);

    expect(refreshedCard.getByLabelText(/^api key$/i)).toHaveValue('');
    expect(refreshedCard.getByLabelText(/email tujuan uji/i)).toHaveValue('operator@gampongblang.id');
    expect(refreshedCard.getByText(/api key sudah tersimpan di backend/i)).toBeInTheDocument();

    await user.clear(refreshedCard.getByLabelText(/email tujuan uji/i));
    await user.type(refreshedCard.getByLabelText(/email tujuan uji/i), 'operator@gampongblang.id');
    await user.click(refreshedCard.getByRole('button', { name: /kirim email uji mailgun/i }));

    await waitFor(() => {
      expect(capturedTestBody).toMatchObject({
        provider: 'mailgun',
        to_email: 'operator@gampongblang.id',
      });
    });

    expect(await screen.findByText(/email uji berhasil dikirim/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /gunakan mailersend/i }));

    await waitFor(() => {
      expect(capturedProvider).toBe('mailersend');
    });

    expect(await screen.findByText(/provider aktif diperbarui/i)).toBeInTheDocument();
  });
});
