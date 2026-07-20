import { clearStoredSession, getStoredSession } from '../auth/session';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'approver';
};

export type LoginResponse = {
  token: string;
  user: AdminUser;
};

export type MessageResponse = {
  message: string;
  reset_url?: string;
};

export class ApiClientError extends Error {
  code: string;
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getStoredSession();
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Tidak dapat terhubung ke server. Pastikan backend aktif dan CORS mengizinkan dashboard.',
    );
  }

  if (!response.ok) {
    let envelope: ErrorEnvelope | null = null;
    try {
      envelope = (await response.json()) as ErrorEnvelope;
    } catch {
      envelope = null;
    }

    if (response.status === 401) {
      clearStoredSession();
    }

    throw new ApiClientError(
      response.status,
      envelope?.error.code ?? 'SERVER_ERROR',
      envelope?.error.message ?? 'Unexpected server error',
      envelope?.error.fields,
    );
  }

  return (await response.json()) as T;
}

export function loginRequest(input: { email: string; password: string }) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function meRequest() {
  return apiRequest<AdminUser>('/auth/me');
}

export function forgotPasswordRequest(input: { email: string }) {
  return apiRequest<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resetPasswordRequest(input: { token: string; password: string }) {
  return apiRequest<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
