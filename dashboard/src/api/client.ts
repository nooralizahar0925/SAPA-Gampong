import { clearStoredSession, getStoredSession } from '../auth/session';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
export const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

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

export type LetterTypeCode = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';

export type RequestStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_INFO'
  | 'APPROVED'
  | 'GENERATED'
  | 'SENT'
  | 'REJECTED';

export type LetterFieldDefinition = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'time' | 'year' | 'number' | 'nik' | 'phone' | 'email' | 'enum';
  required: boolean;
  options?: string[];
};

export type LetterTypeDefinition = {
  code: LetterTypeCode;
  name: string;
  description: string;
  subject_is_applicant: boolean;
  signatory: string;
  required_attachments: string[];
  fields: LetterFieldDefinition[];
};

export type RequestQueueItem = {
  id: string;
  reference_code: string;
  letter_type: LetterTypeCode;
  applicant_name: string;
  status: RequestStatus;
  created_at: string;
  email: string;
};

export type ListRequestsResponse = {
  items: RequestQueueItem[];
  total: number;
  page: number;
};

export type RequestDetailAttachment = {
  file_id: string;
  kind: string;
  mime: string;
  size: number;
  url: string;
};

export type RequestStatusHistoryItem = {
  status: RequestStatus;
  at: string;
  action?: string;
  by?: string;
  reason?: string;
  nomor_surat?: string;
};

export type RequestDetailResponse = {
  id: string;
  reference_code: string;
  letter_type: LetterTypeCode;
  status: RequestStatus;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  keperluan: string | null;
  subject_data: Record<string, unknown>;
  attachments: RequestDetailAttachment[];
  status_history: RequestStatusHistoryItem[];
  nomor_surat: string | null;
  generated_pdf_id?: string | null;
  generated_pdf_url?: string | null;
  verification_token?: string | null;
  verification_url?: string | null;
  decision_reason: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GenerateRequestResponse = {
  pdf_id: string;
  pdf_url: string;
  verification_token: string;
  nomor_surat: string;
};

export type SendRequestResponse = {
  status: 'SENT';
};

export type PatchRequestStatusInput = {
  action: 'approve' | 'reject' | 'in_review' | 'needs_info';
  reason?: string;
  subject_data?: Record<string, unknown>;
  nomor_surat?: string;
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

export function listLetterTypesRequest() {
  return apiRequest<LetterTypeDefinition[]>('/letter-types');
}

export function listRequestsRequest(input: {
  status?: RequestStatus;
  letter_type?: LetterTypeCode;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.letter_type) params.set('letter_type', input.letter_type);
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.page && input.page > 1) params.set('page', String(input.page));

  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiRequest<ListRequestsResponse>(`/requests${suffix}`);
}

export function getRequestDetailRequest(id: string) {
  return apiRequest<RequestDetailResponse>(`/requests/${id}`);
}

export function updateRequestStatusRequest(id: string, input: PatchRequestStatusInput) {
  return apiRequest<RequestDetailResponse>(`/requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function generateRequestLetterRequest(id: string) {
  return apiRequest<GenerateRequestResponse>(`/requests/${id}/generate`, {
    method: 'POST',
  });
}

export function sendRequestLetterRequest(id: string) {
  return apiRequest<SendRequestResponse>(`/requests/${id}/send`, {
    method: 'POST',
  });
}
