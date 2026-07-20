import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
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
  it('loads current provider metadata and saves a provider switch', async () => {
    const user = userEvent.setup();
    let capturedProvider: string | null = null;

    server.use(
      http.get('http://localhost:8080/api/settings/email-provider', () =>
        HttpResponse.json({
          active_provider: 'mailgun',
          default_provider: 'mailersend',
          providers: [
            { id: 'mailersend', label: 'MailerSend', configured: true },
            { id: 'mailgun', label: 'Mailgun', configured: true },
            { id: 'gmail', label: 'Gmail Workspace', configured: false },
            { id: 'smtp', label: 'SMTP Khusus', configured: true },
          ],
        }),
      ),
      http.patch('http://localhost:8080/api/settings/email-provider', async ({ request }) => {
        const body = (await request.json()) as { provider?: string };
        capturedProvider = body.provider ?? null;

        return HttpResponse.json({
          active_provider: body.provider,
          default_provider: 'mailersend',
          providers: [
            { id: 'mailersend', label: 'MailerSend', configured: true },
            { id: 'mailgun', label: 'Mailgun', configured: true },
            { id: 'gmail', label: 'Gmail Workspace', configured: false },
            { id: 'smtp', label: 'SMTP Khusus', configured: true },
          ],
        });
      }),
    );

    renderApp(['/settings/email-provider']);

    expect(await screen.findByRole('heading', { name: /mailgun/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mailersend/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /gmail workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /smtp khusus/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /gunakan mailersend/i }));

    await waitFor(() => {
      expect(capturedProvider).toBe('mailersend');
    });

    expect(await screen.findByText(/provider berhasil diperbarui/i)).toBeInTheDocument();
  });
});
