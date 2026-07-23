import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { getStoredSession, setStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';

function renderApp(
  initialEntries: string[],
  role: 'admin' | 'operator' = 'admin',
) {
  setStoredSession({
    token: 'test-token',
    user: {
      id: role === 'admin' ? 'admin-1' : 'operator-1',
      name: role === 'admin' ? 'Admin Gampong' : 'Operator Kantor',
      email: role === 'admin' ? 'admin@gampongblang.id' : 'operator@gampongblang.id',
      role,
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

describe('user account settings', () => {
  it('lets admins update user status and role', async () => {
    const user = userEvent.setup();
    renderApp(['/settings/users']);

    await screen.findByRole('heading', { name: /akun pengguna/i });
    await user.click(await screen.findByRole('button', { name: /operator kantor/i }));

    await user.click(screen.getByRole('switch', { name: /status akun/i }));
    await user.click(screen.getByRole('radio', { name: /admin/i }));
    await user.click(screen.getByRole('button', { name: /simpan perubahan/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /operator kantor/i })).toHaveTextContent(
        /tidak aktif/i,
      );
    });
  });

  it('keeps operators out of the Sistem section', async () => {
    renderApp(['/settings/users'], 'operator');

    expect(await screen.findByRole('heading', { name: /permohonan surat/i })).toBeInTheDocument();
    expect(screen.queryByText('Sistem')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /akun pengguna/i })).not.toBeInTheDocument();
  });
});

describe('profile settings', () => {
  it('opens from the profile footer and saves the display name', async () => {
    const user = userEvent.setup();
    renderApp(['/requests']);

    await user.click(await screen.findByRole('button', { name: /edit profil pengguna/i }));
    await screen.findByRole('heading', { name: /profil pengguna/i });

    const name = screen.getByLabelText(/^nama$/i);
    await user.clear(name);
    await user.type(name, 'Admin Baru');
    await user.click(screen.getByRole('button', { name: /simpan perubahan/i }));

    await waitFor(() => {
      expect(getStoredSession()?.user.name).toBe('Admin Baru');
    });
  });
});
