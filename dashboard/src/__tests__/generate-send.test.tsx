import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import type { RequestDetailResponse } from '../api/client';
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

describe('generate and send flow', () => {
  it('transitions the UI from GENERATED to SENT after clicking Generate then Send', async () => {
    const user = userEvent.setup();
    let currentDetail: RequestDetailResponse = {
      id: 'req-3',
      reference_code: 'BLG-3M8B7',
      letter_type: 'L5',
      status: 'APPROVED',
      applicant_name: 'Ibrahim HS',
      applicant_email: 'ibrahim.hs@gmail.com',
      applicant_phone: '+62 852 1111 2222',
      keperluan: 'Pengajuan Kredit Usaha',
      subject_data: {
        nama: 'Ibrahim HS',
        nik: '1706221001990004',
        nama_usaha: 'Warung Kopi Pesisir',
        alamat_usaha: 'Jl. Ujong Pasi, Gampong Blang',
      },
      attachments: [],
      status_history: [
        {
          status: 'APPROVED',
          at: '2026-07-20T08:25:00.000Z',
          action: 'approve',
          by: 'Admin Gampong',
          nomor_surat: '400.1.4.3/011/2026',
        },
      ],
      nomor_surat: '400.1.4.3/011/2026',
      generated_pdf_id: null,
      generated_pdf_url: null,
      verification_token: null,
      verification_url: null,
      decision_reason: null,
      decided_by: 'admin-1',
      created_at: '2026-07-19T03:05:00.000Z',
      updated_at: '2026-07-20T08:25:00.000Z',
    };

    server.use(
      http.get('http://localhost:8080/api/requests/:id', ({ params }) => {
        if (params.id !== 'req-3') {
          return HttpResponse.json(
            {
              error: {
                code: 'NOT_FOUND',
                message: 'Permohonan tidak ditemukan',
              },
            },
            { status: 404 },
          );
        }

        return HttpResponse.json(currentDetail);
      }),
      http.post('http://localhost:8080/api/requests/:id/generate', ({ params }) => {
        if (params.id !== 'req-3') {
          return HttpResponse.json(
            {
              error: {
                code: 'NOT_FOUND',
                message: 'Permohonan tidak ditemukan',
              },
            },
            { status: 404 },
          );
        }

        currentDetail = {
          ...currentDetail,
          status: 'GENERATED',
          generated_pdf_id: 'pdf-req-3',
          generated_pdf_url: 'https://example.test/files/pdf-req-3.pdf',
          verification_token: 'verify-token-req-3',
          verification_url: 'http://localhost:8080/verify/verify-token-req-3',
          updated_at: '2026-07-20T10:00:00.000Z',
        };

        return HttpResponse.json({
          pdf_id: 'pdf-req-3',
          pdf_url: 'https://example.test/files/pdf-req-3.pdf',
          verification_token: 'verify-token-req-3',
          nomor_surat: '400.1.4.3/011/2026',
        });
      }),
      http.post('http://localhost:8080/api/requests/:id/send', ({ params }) => {
        if (params.id !== 'req-3') {
          return HttpResponse.json(
            {
              error: {
                code: 'NOT_FOUND',
                message: 'Permohonan tidak ditemukan',
              },
            },
            { status: 404 },
          );
        }

        currentDetail = {
          ...currentDetail,
          status: 'SENT',
          updated_at: '2026-07-20T10:05:00.000Z',
        };

        return HttpResponse.json({ status: 'SENT' });
      }),
    );

    renderApp(['/requests/req-3/generate']);

    await user.click(await screen.findByRole('button', { name: /generate pdf/i }));

    expect((await screen.findAllByText(/surat dibuat/i)).length).toBeGreaterThan(0);

    await user.click(await screen.findByRole('button', { name: /kirim ke email pemohon/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/terkirim/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/surat berhasil dikirim/i)).toBeInTheDocument();
  });
});

describe('audit trail labels', () => {
  it('distinguishes a regenerated PDF from the first generation', async () => {
    renderApp(['/requests/req-3']);

    // Every entry previously fell back to the status label ("Surat Dibuat"), so a
    // row of rebuilds looked like the same event logged over and over.
    expect(await screen.findByText('Surat dibuat')).toBeInTheDocument();
    expect(screen.getByText('Surat dibuat ulang')).toBeInTheDocument();
  });
});
