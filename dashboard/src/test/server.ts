import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { EmailProviderSettingsResponse } from '../api/client';

const letterTypes = [
  {
    code: 'L1',
    name: 'Surat Keterangan Berdomisili',
    description: 'Keterangan domisili warga.',
    subject_is_applicant: true,
    signatory: 'Keuchik',
    required_attachments: ['KTP', 'KK'],
    fields: [
      { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
    ],
  },
  {
    code: 'L4',
    name: 'Surat Keterangan Tidak Mampu',
    description: 'Keterangan warga kurang mampu.',
    subject_is_applicant: true,
    signatory: 'Keuchik',
    required_attachments: ['KTP', 'KK'],
    fields: [
      { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      { key: 'pekerjaan', label: 'Pekerjaan', type: 'text', required: true },
      { key: 'alamat', label: 'Alamat', type: 'textarea', required: true },
    ],
  },
  {
    code: 'L5',
    name: 'Surat Keterangan Usaha',
    description: 'Keterangan usaha warga.',
    subject_is_applicant: true,
    signatory: 'Keuchik',
    required_attachments: ['KTP'],
    fields: [
      { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
      { key: 'nik', label: 'NIK', type: 'nik', required: true },
      { key: 'nama_usaha', label: 'Nama Usaha', type: 'text', required: true },
      { key: 'alamat_usaha', label: 'Alamat Usaha', type: 'textarea', required: true },
    ],
  },
] as const;

const queueItems = [
  {
    id: 'req-1',
    reference_code: 'BLG-2K7F9',
    letter_type: 'L4',
    applicant_name: 'Roni Asra',
    status: 'IN_REVIEW',
    created_at: '2026-07-18T02:41:00.000Z',
    email: 'asra.roniasra@gmail.com',
  },
  {
    id: 'req-2',
    reference_code: 'BLG-7Q1D4',
    letter_type: 'L1',
    applicant_name: 'Nurul Hidayah',
    status: 'SUBMITTED',
    created_at: '2026-07-19T07:22:00.000Z',
    email: 'nurul.h@gmail.com',
  },
  {
    id: 'req-3',
    reference_code: 'BLG-3M8B7',
    letter_type: 'L5',
    applicant_name: 'Ibrahim HS',
    status: 'APPROVED',
    created_at: '2026-07-19T03:05:00.000Z',
    email: 'ibrahim.hs@gmail.com',
  },
];

const requestDetail = {
  id: 'req-1',
  reference_code: 'BLG-2K7F9',
  letter_type: 'L4',
  status: 'IN_REVIEW',
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
    {
      file_id: 'file-2',
      kind: 'KK',
      mime: 'image/jpeg',
      size: 900000,
      url: 'https://example.test/files/file-2',
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
      status: 'IN_REVIEW',
      at: '2026-07-19T01:15:00.000Z',
      action: 'in_review',
      by: 'Sofian',
    },
  ],
  nomor_surat: '400.10.4.4/017/2026',
  decision_reason: null,
  decided_by: 'admin-1',
  created_at: '2026-07-18T02:41:00.000Z',
  updated_at: '2026-07-19T01:15:00.000Z',
};

const approvedRequestDetail = {
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
  attachments: [
    {
      file_id: 'file-3',
      kind: 'KTP',
      mime: 'image/jpeg',
      size: 840000,
      url: 'https://example.test/files/file-3',
    },
  ],
  status_history: [
    {
      status: 'SUBMITTED',
      at: '2026-07-19T03:05:00.000Z',
      action: 'submit',
      by: 'Pemohon',
    },
    {
      status: 'IN_REVIEW',
      at: '2026-07-19T08:10:00.000Z',
      action: 'in_review',
      by: 'Admin Gampong',
    },
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

const requestDetailsById: Record<string, typeof requestDetail | typeof approvedRequestDetail> = {
  'req-1': requestDetail,
  'req-3': approvedRequestDetail,
};

let emailProviderSettings: EmailProviderSettingsResponse = {
  active_provider: 'mailersend',
  default_provider: 'mailersend',
  providers: [
    {
      id: 'mailersend',
      label: 'MailerSend',
      configured: true,
      config_summary: {
        from_email: 'letters@gampongblang.id',
        from_name: 'Administrasi Gampong Blang',
        has_api_key: true,
      },
    },
    {
      id: 'mailgun',
      label: 'Mailgun',
      configured: false,
      config_summary: {
        from_email: null,
        from_name: null,
        domain: null,
        api_base_url: null,
        has_api_key: false,
      },
    },
    {
      id: 'gmail',
      label: 'Gmail',
      configured: false,
      config_summary: {
        from_email: null,
        username: null,
        has_app_password: false,
      },
    },
    {
      id: 'smtp',
      label: 'SMTP',
      configured: false,
      config_summary: {
        from_email: null,
        host: null,
        port: null,
        secure: null,
        username: null,
        has_password: false,
      },
    },
  ],
};

function isProviderConfigured(provider: EmailProviderSettingsResponse['providers'][number]) {
  switch (provider.id) {
    case 'mailersend':
      return Boolean(provider.config_summary.from_email && provider.config_summary.has_api_key);
    case 'mailgun':
      return Boolean(
        provider.config_summary.from_email &&
          provider.config_summary.domain &&
          provider.config_summary.has_api_key,
      );
    case 'gmail':
      return Boolean(
        provider.config_summary.from_email &&
          provider.config_summary.username &&
          provider.config_summary.has_app_password,
      );
    case 'smtp':
      return Boolean(provider.config_summary.from_email && provider.config_summary.host && provider.config_summary.port);
  }
}

function updateProviderSummary(
  providerId: 'mailersend' | 'mailgun' | 'gmail' | 'smtp',
  patch: Record<string, unknown>,
) {
  emailProviderSettings = {
    ...emailProviderSettings,
    providers: emailProviderSettings.providers.map((provider) => {
      if (provider.id !== providerId) {
        return provider;
      }

      const nextProvider = {
        ...provider,
        config_summary: {
          ...provider.config_summary,
          ...patch,
        },
      };

      return {
        ...nextProvider,
        configured: isProviderConfigured(nextProvider),
      };
    }),
  };
}

export const server = setupServer(
  http.post('http://localhost:8080/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'admin@gampongblang.id' && body.password === 'admin123') {
      return HttpResponse.json({
        token: 'test-token',
        user: {
          id: 'admin-1',
          name: 'Admin Gampong',
          email: 'admin@gampongblang.id',
          role: 'admin',
        },
      });
    }

    return HttpResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Incorrect email or password',
        },
      },
      { status: 401 },
    );
  }),
  http.get('http://localhost:8080/api/letter-types', () => HttpResponse.json(letterTypes)),
  http.get('http://localhost:8080/api/requests', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const letterType = url.searchParams.get('letter_type');
    const q = url.searchParams.get('q')?.toLowerCase() ?? '';

    const filtered = queueItems.filter((item) => {
      const matchesStatus = status ? item.status === status : true;
      const matchesType = letterType ? item.letter_type === letterType : true;
      const matchesQuery = q
        ? [item.reference_code, item.applicant_name, item.email].join(' ').toLowerCase().includes(q)
        : true;
      return matchesStatus && matchesType && matchesQuery;
    });

    return HttpResponse.json({
      items: filtered,
      total: filtered.length,
      page: 1,
    });
  }),
  http.get('http://localhost:8080/api/requests/:id', ({ params }) => {
    const detail = requestDetailsById[String(params.id)];

    if (!detail) {
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

    return HttpResponse.json(detail);
  }),
  http.patch('http://localhost:8080/api/requests/:id/status', async ({ params, request }) => {
    const body = (await request.json()) as {
      action: 'approve' | 'reject' | 'in_review' | 'needs_info';
      reason?: string;
      subject_data?: Record<string, unknown>;
      nomor_surat?: string;
    };

    if (params.id !== 'req-1') {
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

    const nextStatus =
      body.action === 'approve'
        ? 'APPROVED'
        : body.action === 'needs_info'
          ? 'NEEDS_INFO'
          : body.action === 'reject'
            ? 'REJECTED'
            : 'IN_REVIEW';

    return HttpResponse.json({
      ...requestDetail,
      status: nextStatus,
      subject_data: body.subject_data ?? requestDetail.subject_data,
      nomor_surat: body.nomor_surat ?? requestDetail.nomor_surat,
      decision_reason: body.reason ?? null,
      updated_at: '2026-07-20T09:10:00.000Z',
      status_history: [
        ...requestDetail.status_history,
        {
          status: nextStatus,
          at: '2026-07-20T09:10:00.000Z',
          action: body.action,
          by: 'Admin Gampong',
          reason: body.reason,
          nomor_surat: body.nomor_surat ?? requestDetail.nomor_surat,
        },
      ],
    });
  }),
  http.post('http://localhost:8080/api/requests/:id/generate', ({ params }) => {
    if (params.id !== 'req-3') {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Permohonan belum siap digenerate',
          },
        },
        { status: 409 },
      );
    }

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
            code: 'CONFLICT',
            message: 'PDF surat belum siap dikirim',
          },
        },
        { status: 409 },
      );
    }

    return HttpResponse.json({
      status: 'SENT',
    });
  }),
  http.get('http://localhost:8080/api/settings/email-provider', () => HttpResponse.json(emailProviderSettings)),
  http.patch('http://localhost:8080/api/settings/email-provider', async ({ request }) => {
    const body = (await request.json()) as { provider?: 'mailersend' | 'mailgun' | 'gmail' | 'smtp' };
    const selected = emailProviderSettings.providers.find((provider) => provider.id === body.provider);

    if (!selected) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Provider email tidak valid',
            fields: {
              provider: 'Provider email tidak dikenal',
            },
          },
        },
        { status: 400 },
      );
    }

    if (!selected.configured) {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Provider email ${selected.id} belum dikonfigurasi`,
          },
        },
        { status: 409 },
      );
    }

    emailProviderSettings = {
      ...emailProviderSettings,
      active_provider: selected.id,
    };

    return HttpResponse.json(emailProviderSettings);
  }),
  http.patch('http://localhost:8080/api/settings/email-provider/config', async ({ request }) => {
    const body = (await request.json()) as {
      provider?: 'mailersend' | 'mailgun' | 'gmail' | 'smtp';
      from_email?: string;
      from_name?: string;
      api_key?: string;
      domain?: string;
      api_base_url?: string;
      username?: string;
      app_password?: string;
      host?: string;
      port?: number;
      secure?: boolean;
      password?: string;
    };

    if (!body.provider) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Provider email tidak valid',
          },
        },
        { status: 400 },
      );
    }

    switch (body.provider) {
      case 'mailersend':
        updateProviderSummary(body.provider, {
          from_email: body.from_email ?? null,
          from_name: body.from_name ?? null,
          has_api_key: Boolean(body.api_key),
        });
        break;
      case 'mailgun':
        updateProviderSummary(body.provider, {
          from_email: body.from_email ?? null,
          from_name: body.from_name ?? null,
          domain: body.domain ?? null,
          api_base_url: body.api_base_url ?? null,
          has_api_key: Boolean(body.api_key),
        });
        break;
      case 'gmail':
        updateProviderSummary(body.provider, {
          from_email: body.from_email ?? null,
          from_name: body.from_name ?? null,
          username: body.username ?? null,
          has_app_password: Boolean(body.app_password),
        });
        break;
      case 'smtp':
        updateProviderSummary(body.provider, {
          from_email: body.from_email ?? null,
          from_name: body.from_name ?? null,
          host: body.host ?? null,
          port: body.port ?? null,
          secure: typeof body.secure === 'boolean' ? body.secure : null,
          username: body.username ?? null,
          has_password: Boolean(body.password),
        });
        break;
    }

    return HttpResponse.json(emailProviderSettings);
  }),
  http.post('http://localhost:8080/api/settings/email-provider/test', async ({ request }) => {
    const body = (await request.json()) as {
      provider?: 'mailersend' | 'mailgun' | 'gmail' | 'smtp';
      to_email?: string;
    };

    const selected = emailProviderSettings.providers.find((provider) => provider.id === body.provider);

    if (!selected || !body.to_email) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Data email uji tidak valid',
          },
        },
        { status: 400 },
      );
    }

    if (!selected.configured) {
      return HttpResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `Provider email ${selected.id} belum dikonfigurasi`,
          },
        },
        { status: 409 },
      );
    }

    return HttpResponse.json({
      message: `Test email sent via ${selected.label} to ${body.to_email}.`,
    });
  }),
  http.post('http://localhost:8080/api/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as { email?: string };

    return HttpResponse.json({
      message: 'Jika email terdaftar, tautan reset kata sandi telah dikirim.',
      ...(body.email === 'admin@gampongblang.id'
        ? { reset_url: 'http://localhost:5173/reset-password?token=reset-token-123' }
        : {}),
    });
  }),
  http.post('http://localhost:8080/api/auth/reset-password', async ({ request }) => {
    const body = (await request.json()) as { token?: string; password?: string };

    if (body.token === 'reset-token-123' && body.password && body.password.length >= 8) {
      return HttpResponse.json({
        message: 'Kata sandi berhasil diperbarui. Silakan login kembali.',
      });
    }

    return HttpResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Tautan reset kata sandi tidak valid atau sudah kedaluwarsa',
          fields: {
            token: 'Tautan reset tidak valid atau sudah kedaluwarsa',
          },
        },
      },
      { status: 400 },
    );
  }),
);
