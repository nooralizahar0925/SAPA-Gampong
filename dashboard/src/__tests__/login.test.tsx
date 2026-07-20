import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { getStoredSession } from '../auth/session';
import { AppRoutes } from '../routes';

function renderApp(initialEntries: string[] = ['/login']) {
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

describe('dashboard login flow', () => {
  it('submitting valid credentials stores the token and redirects to the queue', async () => {
    const user = userEvent.setup();
    renderApp();

    const email = screen.getByLabelText(/alamat email/i);
    const password = screen.getByLabelText(/kata sandi/i);

    await user.clear(email);
    await user.type(email, 'admin@gampongblang.id');
    await user.clear(password);
    await user.type(password, 'admin123');
    await user.click(screen.getByRole('button', { name: /masuk/i }));

    expect(await screen.findByRole('heading', { name: /permohonan surat/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(getStoredSession()?.token).toBe('test-token');
    });
  });
});
