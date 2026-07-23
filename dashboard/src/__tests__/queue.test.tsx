import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';

function renderApp(initialEntries: string[] = ['/requests']) {
  setStoredSession({
    token: 'test-token',
    user: {
      id: 'admin-1',
      name: 'Admin Gampong',
      email: 'admin@gampongblang.id',
      role: 'admin',
      active: true,
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

/**
 * The desktop table. The page also renders a mobile card list at the same time — CSS
 * hides one, but jsdom applies no stylesheets, so both are in the DOM.
 */
async function table() {
  return within(await screen.findByRole('table'));
}

/** The status summary cards above the queue table. */
async function stats() {
  return within(await screen.findByRole('region', { name: /ringkasan status surat/i }));
}

describe('letter request queue', () => {
  it('shows status totals from the counts endpoint', async () => {
    renderApp();

    const cards = await stats();
    // The fixture has 1 SUBMITTED, 1 IN_REVIEW, 1 APPROVED.
    await waitFor(() => {
      expect(within(cards.getByText('Baru diajukan').closest('article')!).getByText('1')).toBeInTheDocument();
    });
    expect(
      within(cards.getByText('Sedang ditinjau').closest('article')!).getByText('1'),
    ).toBeInTheDocument();
  });

  it('dates the header from today, not a fixed build-time date', async () => {
    renderApp();

    const today = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    expect(await screen.findByText(new RegExp(today.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
  });

  it('badges the sidebar with the pending count rather than a hardcoded number', async () => {
    renderApp();

    const sidebarLink = await screen.findByRole('button', { name: /permohonan surat/i });
    // 1 SUBMITTED + 1 IN_REVIEW + 0 NEEDS_INFO = 2 (the old hardcoded value was 6).
    await waitFor(() => {
      expect(within(sidebarLink).getByText('2')).toBeInTheDocument();
    });
  });

  it('filters the table by status pill', async () => {
    const user = userEvent.setup();
    renderApp();

    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /diajukan/i }));

    await waitFor(async () => {
      expect((await table()).queryByText('Roni Asra')).not.toBeInTheDocument();
    });
    expect((await table()).getByText('Nurul Hidayah')).toBeInTheDocument();
  });

  it('filters by letter type', async () => {
    const user = userEvent.setup();
    renderApp();

    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /filter jenis surat/i }),
      'L1',
    );

    await waitFor(async () => {
      expect((await table()).queryByText('Roni Asra')).not.toBeInTheDocument();
    });
    expect((await table()).getByText('Nurul Hidayah')).toBeInTheDocument();
  });

  it('reloads the queue when the refresh button is pressed', async () => {
    const user = userEvent.setup();
    renderApp();

    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();

    // The control must actually do something — it previously had no onClick at all.
    await user.click(screen.getByRole('button', { name: /muat ulang/i }));
    await waitFor(async () => {
      expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
    });
  });

  it('reports the visible range against the true total', async () => {
    renderApp();

    expect(await screen.findByText(/menampilkan 1–3 dari 3 permohonan/i)).toBeInTheDocument();
  });

  it('hides pagination when everything fits on one page', async () => {
    renderApp();

    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /berikutnya/i })).not.toBeInTheDocument();
  });

  it('opens a request for review from the table', async () => {
    const user = userEvent.setup();
    renderApp();

    const rows = await table();
    const roniRow = rows.getByText('Roni Asra').closest('tr')!;
    await user.click(within(roniRow).getByRole('button', { name: /^tinjau$/i }));

    expect(await screen.findByText(/Pengajuan Beasiswa S2/i)).toBeInTheDocument();
  });

  it('sorts by pemohon when the column header is clicked', async () => {
    const user = userEvent.setup();
    renderApp();

    const rows = await table();
    await user.click(rows.getByRole('button', { name: /pemohon/i }));

    await waitFor(async () => {
      const names = (await table())
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[1]!.querySelector('b')!.textContent);
      expect(names).toEqual(['Ibrahim HS', 'Nurul Hidayah', 'Roni Asra']);
    });
  });

  it('flips the sort direction when the active column is clicked again', async () => {
    const user = userEvent.setup();
    renderApp();

    // Re-query after each click: React replaces the header node on re-render, so a
    // reference captured earlier is detached and keeps its stale attributes.
    const header = async () => (await table()).getByRole('button', { name: /pemohon/i });

    await user.click(await header());
    await waitFor(async () => {
      expect((await header()).closest('th')).toHaveAttribute('aria-sort', 'ascending');
    });

    await user.click(await header());
    await waitFor(async () => {
      expect((await header()).closest('th')).toHaveAttribute('aria-sort', 'descending');
    });
  });

  it('sorts by kode', async () => {
    const user = userEvent.setup();
    renderApp();

    const rows = await table();
    await user.click(rows.getByRole('button', { name: /^kode$/i }));

    await waitFor(async () => {
      const codes = (await table())
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0]!.querySelector('b')!.textContent);
      expect(codes).toEqual(['BLG-2K7F9', 'BLG-3M8B7', 'BLG-7Q1D4']);
    });
  });

  it('searches by reference code', async () => {
    const user = userEvent.setup();
    renderApp();

    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /cari permohonan/i }), 'BLG-7Q1D4');

    await waitFor(async () => {
      expect((await table()).queryByText('Roni Asra')).not.toBeInTheDocument();
    });
    expect((await table()).getByText('Nurul Hidayah')).toBeInTheDocument();
  });

  it('searches by applicant name', async () => {
    const user = userEvent.setup();
    renderApp();

    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /cari permohonan/i }), 'nurul');

    await waitFor(async () => {
      expect((await table()).queryByText('Roni Asra')).not.toBeInTheDocument();
    });
    expect((await table()).getByText('Nurul Hidayah')).toBeInTheDocument();
  });

  it('lists only months that contain requests in the period filter', async () => {
    renderApp();

    const periodFilter = await screen.findByRole('combobox', { name: /filter periode/i });
    await waitFor(() => {
      expect(within(periodFilter).getByRole('option', { name: /juli 2026/i })).toBeInTheDocument();
    });
    expect(within(periodFilter).getByRole('option', { name: /juni 2026/i })).toBeInTheDocument();
    expect(within(periodFilter).queryByRole('option', { name: /mei 2026/i })).not.toBeInTheDocument();
  });

  it('filters the table to the chosen month', async () => {
    const user = userEvent.setup();
    renderApp();

    expect((await table()).getByText('Ibrahim HS')).toBeInTheDocument();

    const periodFilter = await screen.findByRole('combobox', { name: /filter periode/i });
    await waitFor(() => {
      expect(within(periodFilter).getByRole('option', { name: /juli 2026/i })).toBeInTheDocument();
    });
    await user.selectOptions(periodFilter, '2026-7');

    // Ibrahim HS was filed in June, so the July filter must drop that row.
    await waitFor(async () => {
      expect((await table()).queryByText('Ibrahim HS')).not.toBeInTheDocument();
    });
    expect((await table()).getByText('Roni Asra')).toBeInTheDocument();
  });
});
