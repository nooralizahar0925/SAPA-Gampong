import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';
import { contentState } from '../test/server';

function renderRoutes(path: string, authenticated = false) {
  if (authenticated) {
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
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('public app download page', () => {
  it('is public and keeps downloads unavailable while disabled', async () => {
    renderRoutes('/');

    expect(await screen.findByRole('heading', { name: /pelayanan gampong kini lebih dekat/i })).toBeInTheDocument();
    expect(await screen.findByText('Aplikasi segera tersedia')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /unduh aplikasi android/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Panduan pemasangan')).not.toBeInTheDocument();
  });

  it('uses the configured APK when direct distribution is enabled', async () => {
    contentState.appDistribution.enabled = true;
    renderRoutes('/');

    const download = await screen.findByRole('link', { name: /unduh aplikasi android/i });
    expect(download).toHaveAttribute('href', 'http://localhost:3000/api/app-distribution/android.apk');
    expect(screen.getByText(/tidak perlu menonaktifkan google play protect/i)).toBeInTheDocument();
  });

  it('uses a Google Play presentation without APK-only details', async () => {
    contentState.appDistribution = {
      ...contentState.appDistribution,
      channel: 'google_play',
      enabled: true,
      play_store_url: 'https://play.google.com/store/apps/details?id=id.gampongblang.sapa_gampong',
      sha256: 'a'.repeat(64),
    };
    renderRoutes('/');

    const playLink = await screen.findByRole('link', { name: /dapatkan di google play/i });
    expect(playLink).toHaveAttribute('href', contentState.appDistribution.play_store_url);
    expect(screen.getByText('Pasang dengan mudah melalui Google Play')).toBeInTheDocument();
    expect(screen.queryByText(/tidak perlu menonaktifkan google play protect/i)).not.toBeInTheDocument();
    expect(screen.queryByText('a'.repeat(64))).not.toBeInTheDocument();
  });
});

describe('app distribution dashboard', () => {
  it('shows direct APK metadata as automatic read-only fields', async () => {
    renderRoutes('/settings/distribution', true);

    await screen.findByRole('heading', { name: 'Distribusi Aplikasi' });
    expect(screen.getByText(/dibaca otomatis dari APK produksi/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Versi aplikasi')).toBeDisabled();
    expect(screen.getByLabelText('Tanggal rilis')).toBeDisabled();
    expect(screen.getByLabelText('Ukuran berkas')).toBeDisabled();
    expect(screen.getByLabelText('SHA-256 APK')).toBeDisabled();
  });

  it('switches the landing page to the configured Google Play URL', async () => {
    const user = userEvent.setup();
    renderRoutes('/settings/distribution', true);

    await screen.findByRole('heading', { name: 'Distribusi Aplikasi' });
    await user.click(screen.getByText('Google Play'));
    await user.type(
      screen.getByLabelText('URL Google Play'),
      'https://play.google.com/store/apps/details?id=id.gampongblang.sapa_gampong',
    );
    await user.click(screen.getByLabelText('Publik nonaktif'));
    await user.click(screen.getByRole('button', { name: /simpan perubahan/i }));

    await waitFor(() => {
      expect(contentState.appDistribution.channel).toBe('google_play');
      expect(contentState.appDistribution.enabled).toBe(true);
      expect(contentState.appDistribution.play_store_url).toContain('play.google.com/store/apps');
    });
  });
});
