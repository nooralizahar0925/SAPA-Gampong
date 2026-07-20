import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

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
