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

describe('request queue and review flow', () => {
  it('renders request rows from the API', async () => {
    renderApp(['/requests']);

    expect((await screen.findAllByText(/roni asra/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nurul hidayah/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/surat keterangan tidak mampu/i).length).toBeGreaterThan(0);
  });

  it('approves a request from the detail review screen', async () => {
    const user = userEvent.setup();
    let capturedBody: unknown = null;

    server.use(
      http.patch('http://localhost:8080/api/requests/:id/status', async ({ request, params }) => {
        capturedBody = await request.json();

        return HttpResponse.json({
          id: params.id,
          reference_code: 'BLG-2K7F9',
          letter_type: 'L4',
          status: 'APPROVED',
          applicant_name: 'Roni Asra',
          applicant_email: 'asra.roniasra@gmail.com',
          applicant_phone: '+62 812 3456 7890',
          keperluan: 'Pengajuan Beasiswa S2',
          subject_data: {
            nama: 'Roni Asra',
            nik: '1706221001990002',
            pekerjaan: 'Nelayan',
            alamat: 'Jl. Meunasah No. 12, Dusun Kuini, Gampong Blang',
          },
          attachments: [
            {
              file_id: 'file-1',
              kind: 'KTP',
              mime: 'image/jpeg',
              size: 1200000,
              url: 'https://example.test/files/file-1',
            },
          ],
          status_history: [
            {
              status: 'SUBMITTED',
              at: '2026-07-18T02:41:00.000Z',
              action: 'submit',
              by: 'Pemohon',
            },
            {
              status: 'APPROVED',
              at: '2026-07-20T09:10:00.000Z',
              action: 'approve',
              by: 'Admin Gampong',
              nomor_surat: '400.10.4.4/017/2026',
            },
          ],
          nomor_surat: '400.10.4.4/017/2026',
          decision_reason: null,
          decided_by: 'admin-1',
          created_at: '2026-07-18T02:41:00.000Z',
          updated_at: '2026-07-20T09:10:00.000Z',
        });
      }),
    );

    renderApp(['/requests/req-1']);

    await user.click(await screen.findByRole('button', { name: /^setujui$/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        action: 'approve',
        nomor_surat: '400.10.4.4/017/2026',
      });
    });

    expect(await screen.findByText(/disetujui/i)).toBeInTheDocument();
  });
});
