import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';
import { feedbackState } from '../test/server';

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

/** The left-hand report list; scoped so its text cannot collide with the detail pane. */
async function list() {
  return within(await screen.findByRole('region', { name: /daftar laporan/i }));
}

/** The right-hand detail pane. */
async function detail() {
  return within(await screen.findByRole('region', { name: /detail laporan/i }));
}

describe('feedback inbox', () => {
  it('lists reports for the default "Baru" filter with their reference codes', async () => {
    renderApp(['/feedback']);

    const rows = await list();
    expect(await rows.findByText('Nurul Aini')).toBeInTheDocument();
    expect(rows.getByText('Zulkifli')).toBeInTheDocument();
    expect(rows.getByText('LPR-5D8Q3')).toBeInTheDocument();

    // Basri Amin is `read`, so the default "Baru" filter excludes them.
    expect(rows.queryByText('Basri Amin')).not.toBeInTheDocument();
  });

  it('shows the unread count from the API rather than a hardcoded number', async () => {
    renderApp(['/feedback']);

    await waitFor(async () => {
      expect(await screen.findByTestId('feedback-new-count')).toHaveTextContent('2');
    });
  });

  it('opens the first report by default so the detail pane is never empty', async () => {
    renderApp(['/feedback']);

    const pane = await detail();
    expect(await pane.findByText('nurul@example.com')).toBeInTheDocument();
    // The heading is derived from the body, so assert on the body card itself.
    expect(pane.getByText('Lampu jalan di dusun Meunasah mati sejak seminggu lalu.')).toHaveClass(
      'feedback-body-card',
    );
  });

  it('switches the detail pane when another report is selected', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    const rows = await list();
    await user.click(await rows.findByRole('button', { name: /buka laporan dari zulkifli/i }));

    const pane = await detail();
    await waitFor(() => {
      expect(pane.getByText('zulkifli@example.com')).toBeInTheDocument();
    });
    expect(pane.getByText('Saluran air di depan meunasah tersumbat.')).toHaveClass(
      'feedback-body-card',
    );
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    const rows = await list();
    await rows.findByText('Nurul Aini');
    await user.click(screen.getByRole('tab', { name: /^dibaca/i }));

    await waitFor(() => {
      expect(rows.queryByText('Nurul Aini')).not.toBeInTheDocument();
    });
    expect(rows.getByText('Basri Amin')).toBeInTheDocument();
  });

  it('shows the attachment with its original filename', async () => {
    renderApp(['/feedback']);

    const pane = await detail();
    const attachment = await pane.findByRole('link', { name: /lampiran 1/i });
    expect(attachment).toHaveAttribute('href', 'https://example.test/files/file-fb-1');
    expect(within(attachment).getByText('jalan-kuini.jpg')).toBeInTheDocument();
  });

  it('sends a reply and marks the report responded', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    const pane = await detail();
    await user.type(
      await pane.findByLabelText(/balasan ke pelapor/i),
      'Terima kasih, lokasi akan kami tinjau pekan ini.',
    );
    await user.click(pane.getByRole('button', { name: /kirim balasan/i }));

    await waitFor(() => {
      const saved = feedbackState.items.find((item) => item.id === 'fb-1');
      expect(saved?.status).toBe('responded');
      expect(saved?.reply).toBe('Terima kasih, lokasi akan kami tinjau pekan ini.');
    });
  });

  it('keeps the reply button disabled until something is typed', async () => {
    renderApp(['/feedback']);

    const pane = await detail();
    expect(await pane.findByRole('button', { name: /kirim balasan/i })).toBeDisabled();
  });

  it('saves an internal note without replying or marking responded', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    const pane = await detail();
    await user.type(
      await pane.findByLabelText(/catatan internal/i),
      'Diteruskan ke kaur pembangunan.',
    );
    await user.click(pane.getByRole('button', { name: /simpan catatan/i }));

    await waitFor(() => {
      const saved = feedbackState.items.find((item) => item.id === 'fb-1');
      expect(saved?.note).toBe('Diteruskan ke kaur pembangunan.');
      expect(saved?.status).toBe('new');
      expect(saved?.reply).toBeNull();
    });
  });

  it('marks a report read from the detail pane', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    const pane = await detail();
    await user.click(await pane.findByRole('button', { name: /tandai dibaca/i }));

    await waitFor(() => {
      expect(feedbackState.items.find((item) => item.id === 'fb-1')?.status).toBe('read');
    });
  });

  it('shows an empty state when a filter matches nothing', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    await (await list()).findByText('Nurul Aini');
    await user.click(screen.getByRole('tab', { name: /^ditanggapi/i }));

    expect(await screen.findByText(/belum ada laporan/i)).toBeInTheDocument();
  });

  it('links the sidebar entry to the inbox with the live unread badge', async () => {
    const user = userEvent.setup();
    renderApp(['/requests']);

    const sidebarLink = await screen.findByRole('button', { name: /kotak pelaporan/i });

    // The badge arrives with the frame's own query, so wait rather than asserting
    // on the first render.
    await waitFor(() => {
      expect(within(sidebarLink).getByText('2')).toBeInTheDocument();
    });

    await user.click(sidebarLink);

    expect(await screen.findByRole('heading', { name: /kotak pelaporan/i })).toBeInTheDocument();
  });

  it('labels the action as a follow-up once a report is already answered', async () => {
    const user = userEvent.setup();
    renderApp(['/feedback']);

    // fb-3 is `read`; reply to it so it becomes `responded`.
    const rows = await list();
    await user.click(screen.getByRole('tab', { name: /^dibaca/i }));
    await user.click(await rows.findByRole('button', { name: /buka laporan dari basri amin/i }));

    const pane = await detail();
    await user.type(await pane.findByLabelText(/balasan ke pelapor/i), 'Sudah kami tindak lanjuti.');
    await user.click(pane.getByRole('button', { name: /kirim balasan/i }));

    await waitFor(() => {
      expect(feedbackState.items.find((item) => item.id === 'fb-3')?.status).toBe('responded');
    });

    // The button must not keep promising to "mark as responded" — it already is.
    await waitFor(async () => {
      expect(
        (await detail()).getByRole('button', { name: /kirim balasan susulan/i }),
      ).toBeInTheDocument();
    });
    expect((await detail()).getByText(/sudah dibalas/i)).toBeInTheDocument();
  });
});
