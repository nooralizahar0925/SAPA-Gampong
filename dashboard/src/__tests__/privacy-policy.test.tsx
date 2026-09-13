import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../routes';

describe('privacy policy', () => {
  it('is publicly accessible without an admin session', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/privacy-policy']}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Kebijakan Privasi', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/permintaan akses dan penghapusan data/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'sapagampong@gmail.com' })).not.toHaveLength(0);
  });
});
