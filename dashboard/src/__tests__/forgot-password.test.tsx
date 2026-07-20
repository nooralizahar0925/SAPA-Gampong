import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../routes';

function renderApp(initialEntries: string[]) {
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

describe('forgot password screens', () => {
  it('submits the forgot password form and shows the preview reset link', async () => {
    const user = userEvent.setup();
    renderApp(['/forgot-password']);

    await user.click(screen.getByRole('button', { name: /kirim tautan reset/i }));

    expect(await screen.findByText(/tautan reset kata sandi telah dikirim/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /http:\/\/localhost:5173\/reset-password/i })).toBeInTheDocument();
  });

  it('submits a new password from the reset screen', async () => {
    const user = userEvent.setup();
    renderApp(['/reset-password?token=reset-token-123']);

    await user.type(screen.getByLabelText(/kata sandi baru/i), 'AdminBaru123');
    await user.type(screen.getByLabelText(/konfirmasi kata sandi/i), 'AdminBaru123');
    await user.click(screen.getByRole('button', { name: /simpan kata sandi baru/i }));

    expect(await screen.findByText(/kata sandi berhasil diperbarui/i)).toBeInTheDocument();
  });
});
