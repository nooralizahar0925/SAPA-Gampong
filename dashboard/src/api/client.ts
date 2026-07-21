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

export type EmailProviderId = 'mailersend' | 'mailgun' | 'gmail' | 'smtp';

export type EmailProviderConfigSummary = {
  from_email?: string | null;
  from_name?: string | null;
  api_base_url?: string | null;
  domain?: string | null;
  username?: string | null;
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  has_api_key?: boolean;
  has_app_password?: boolean;
  has_password?: boolean;
};

export type EmailProviderOption = {
  id: EmailProviderId;
  label: string;
  configured: boolean;
  config_summary: EmailProviderConfigSummary;
};

export type EmailProviderSettingsResponse = {
  active_provider: EmailProviderId;
  default_provider: EmailProviderId;
  providers: EmailProviderOption[];
};

export type UpdateEmailProviderConfigInput = {
  provider: EmailProviderId;
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

export type SendEmailProviderTestInput = {
  provider: EmailProviderId;
  to_email: string;
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

  // FormData must keep the browser-generated multipart boundary, so only JSON bodies
  // get an explicit Content-Type.
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
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

  // DELETE endpoints answer 204 with no body; calling .json() on those would throw.
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return undefined as T;
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

export type RequestSortColumn =
  | 'created_at'
  | 'reference_code'
  | 'applicant_name'
  | 'letter_type'
  | 'status';

export type SortDirection = 'asc' | 'desc';

export function listRequestsRequest(input: {
  status?: RequestStatus;
  letter_type?: LetterTypeCode;
  q?: string;
  sort?: RequestSortColumn;
  direction?: SortDirection;
  year?: number;
  month?: number;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.letter_type) params.set('letter_type', input.letter_type);
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.sort) params.set('sort', input.sort);
  if (input.direction) params.set('direction', input.direction);
  if (input.year) params.set('year', String(input.year));
  if (input.month) params.set('month', String(input.month));
  if (input.page && input.page > 1) params.set('page', String(input.page));

  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiRequest<ListRequestsResponse>(`/requests${suffix}`);
}

export type RequestPeriod = {
  year: number;
  month: number;
  count: number;
};

export type RequestCountsResponse = {
  by_status: Record<RequestStatus, number>;
  total: number;
  /** SUBMITTED + IN_REVIEW + NEEDS_INFO — the work waiting on an admin. */
  pending: number;
  /** Months that actually contain requests, newest first. */
  periods: RequestPeriod[];
};

export function getRequestCountsRequest() {
  return apiRequest<RequestCountsResponse>('/requests/counts');
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

export function getEmailProviderSettingsRequest() {
  return apiRequest<EmailProviderSettingsResponse>('/settings/email-provider');
}

export function updateEmailProviderSettingsRequest(provider: EmailProviderId) {
  return apiRequest<EmailProviderSettingsResponse>('/settings/email-provider', {
    method: 'PATCH',
    body: JSON.stringify({ provider }),
  });
}

export function updateEmailProviderConfigRequest(input: UpdateEmailProviderConfigInput) {
  return apiRequest<EmailProviderSettingsResponse>('/settings/email-provider/config', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function sendEmailProviderTestRequest(input: SendEmailProviderTestInput) {
  return apiRequest<MessageResponse>('/settings/email-provider/test', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/* -------------------------------------------------------------------------- */
/* Content management                                                         */
/* -------------------------------------------------------------------------- */

export type UploadResponse = {
  file_id: string;
  url: string;
  mime: string;
  size: number;
};

/**
 * Uploads via multipart. Content-Type is deliberately left unset so the browser adds
 * the multipart boundary itself; apiRequest only defaults it to JSON when absent.
 */
export function uploadFileRequest(file: File, kind: 'photo' | 'document' = 'photo') {
  const body = new FormData();
  body.append('kind', kind);
  body.append('file', file);

  return apiRequest<UploadResponse>('/uploads', { method: 'POST', body });
}

export type BannerSlide = {
  id: string;
  image_file_id: string;
  image_url: string | null;
  link_url: string | null;
  order: number;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
};

export type VillageProfile = {
  name: string | null;
  founded_date: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  kemukiman: string | null;
  area_size: string | null;
  elevation: string | null;
  contact_phone: string | null;
  email: string | null;
  map_lat: number | null;
  map_lng: number | null;
  description: string | null;
  photo_file_id: string | null;
  photo_url: string | null;
  updated_at: string | null;
};

export type VisionMission = {
  vision: string | null;
  missions: string[];
  updated_at: string | null;
};

export type Official = {
  id: string;
  name: string;
  role: string;
  photo_file_id: string | null;
  photo_url: string | null;
  order: number;
  is_leadership_highlight: boolean;
};

export type VillageStrength = {
  id: string;
  title: string;
  body: string;
  photo_file_id: string | null;
  photo_url: string | null;
  order: number;
};

export type Mosque = {
  id: string;
  name: string;
  address: string;
  landmark: string | null;
  photo_file_id: string | null;
  photo_url: string | null;
};

export type PrayerConfig = {
  lat: number | null;
  lng: number | null;
  calc_method: string | null;
  timezone: string;
  /** Aladhan parameters the mobile app sends when online (method 99 = custom angles). */
  aladhan_method: number;
  fajr_angle: number;
  isha_angle: number;
  /** 0 = Shafi'i, 1 = Hanafi. */
  school: number;
  /** Offline schedule shown when the device has no connection. */
  fallback_times: {
    subuh: string | null;
    dhuhur: string | null;
    ashar: string | null;
    maghrib: string | null;
    isya: string | null;
  };
  updated_at: string | null;
};

export type DemographicBlockType = 'number' | 'split' | 'bar' | 'pie';

export type DemographicBlock = {
  key: string;
  label: string;
  type: DemographicBlockType;
  data: unknown;
  order: number;
  visible: boolean;
};

export function listBannersRequest() {
  return apiRequest<BannerSlide[]>('/content/banners');
}

export function createBannerRequest(input: {
  image_file_id: string;
  link_url?: string | null;
  order?: number;
  active?: boolean;
}) {
  return apiRequest<BannerSlide>('/content/banners', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateBannerRequest(
  id: string,
  input: { link_url?: string | null; active?: boolean; order?: number },
) {
  return apiRequest<BannerSlide>(`/content/banners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteBannerRequest(id: string) {
  return apiRequest<void>(`/content/banners/${id}`, { method: 'DELETE' });
}

export function reorderBannersRequest(ids: string[]) {
  return apiRequest<BannerSlide[]>('/content/banners/reorder', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function getVillageProfileRequest() {
  return apiRequest<VillageProfile>('/content/profile');
}

export function updateVillageProfileRequest(input: Partial<Omit<VillageProfile, 'updated_at' | 'photo_url'>>) {
  return apiRequest<VillageProfile>('/content/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getVisionMissionRequest() {
  return apiRequest<VisionMission>('/content/vision-mission');
}

export function updateVisionMissionRequest(input: { vision?: string; missions?: string[] }) {
  return apiRequest<VisionMission>('/content/vision-mission', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listOfficialsRequest() {
  return apiRequest<Official[]>('/content/officials');
}

export function createOfficialRequest(input: {
  name: string;
  role: string;
  order?: number;
  photo_file_id?: string | null;
  is_leadership_highlight?: boolean;
}) {
  return apiRequest<Official>('/content/officials', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateOfficialRequest(
  id: string,
  input: {
    name?: string;
    role?: string;
    order?: number;
    photo_file_id?: string | null;
    is_leadership_highlight?: boolean;
  },
) {
  return apiRequest<Official>(`/content/officials/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteOfficialRequest(id: string) {
  return apiRequest<void>(`/content/officials/${id}`, { method: 'DELETE' });
}

export function listStrengthsRequest() {
  return apiRequest<VillageStrength[]>('/content/strengths');
}

export function createStrengthRequest(input: { title: string; body: string; order?: number }) {
  return apiRequest<VillageStrength>('/content/strengths', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateStrengthRequest(
  id: string,
  input: { title?: string; body?: string; order?: number },
) {
  return apiRequest<VillageStrength>(`/content/strengths/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteStrengthRequest(id: string) {
  return apiRequest<void>(`/content/strengths/${id}`, { method: 'DELETE' });
}

export function listMosquesRequest() {
  return apiRequest<Mosque[]>('/content/mosques');
}

export function createMosqueRequest(input: { name: string; address: string; landmark?: string | null }) {
  return apiRequest<Mosque>('/content/mosques', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateMosqueRequest(
  id: string,
  input: { name?: string; address?: string; landmark?: string | null },
) {
  return apiRequest<Mosque>(`/content/mosques/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteMosqueRequest(id: string) {
  return apiRequest<void>(`/content/mosques/${id}`, { method: 'DELETE' });
}

export function getPrayerConfigRequest() {
  return apiRequest<PrayerConfig>('/content/prayer-config');
}

export function updatePrayerConfigRequest(input: {
  lat?: number;
  lng?: number;
  calc_method?: string;
  timezone?: string;
  aladhan_method?: number;
  fajr_angle?: number;
  isha_angle?: number;
  school?: number;
  fallback_subuh?: string | null;
  fallback_dhuhur?: string | null;
  fallback_ashar?: string | null;
  fallback_maghrib?: string | null;
  fallback_isya?: string | null;
}) {
  return apiRequest<PrayerConfig>('/content/prayer-config', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listDemographicsRequest() {
  return apiRequest<DemographicBlock[]>('/content/demographics');
}

export function updateDemographicsRequest(
  blocks: Array<{
    key: string;
    label: string;
    type: DemographicBlockType;
    data: unknown;
    order?: number;
    visible?: boolean;
  }>,
) {
  return apiRequest<DemographicBlock[]>('/content/demographics', {
    method: 'PATCH',
    body: JSON.stringify({ blocks }),
  });
}

/* -------------------------------------------------------------------------- */
/* Application settings                                                       */
/* -------------------------------------------------------------------------- */

export type AppSettings = {
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  letterhead_line1: string | null;
  letterhead_line2: string | null;
  letterhead_line3: string | null;
  keuchik_title: string | null;
  keuchik_name: string | null;
  secretary_title: string | null;
  secretary_name: string | null;
  updated_at: string | null;
};

export type LetterCounterEntry = {
  letter_type: LetterTypeCode;
  last_number: number;
};

export type LetterCountersResponse = {
  year: number;
  counters: LetterCounterEntry[];
};

export function getAppSettingsRequest() {
  return apiRequest<AppSettings>('/settings/app');
}

export function updateAppSettingsRequest(input: Partial<Omit<AppSettings, 'updated_at'>>) {
  return apiRequest<AppSettings>('/settings/app', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getLetterCountersRequest(year: number) {
  return apiRequest<LetterCountersResponse>(`/settings/letter-counters?year=${year}`);
}

export function updateLetterCounterRequest(input: {
  letter_type: LetterTypeCode;
  year: number;
  last_number: number;
}) {
  return apiRequest<LetterCountersResponse>('/settings/letter-counters', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/* -------------------------------------------------------------------------- */
/* Feedback inbox                                                             */
/* -------------------------------------------------------------------------- */

export type FeedbackStatus = 'new' | 'read' | 'responded';

export type FeedbackAttachment = {
  file_id: string;
  kind: string;
  mime: string;
  size: number;
  original_name: string | null;
  url: string;
};

export type FeedbackInboxItem = {
  id: string;
  reference_code: string;
  name: string;
  email: string;
  phone: string | null;
  body: string;
  status: FeedbackStatus;
  note: string | null;
  attachment_count: number;
  created_at: string;
};

export type ListFeedbackResponse = {
  items: FeedbackInboxItem[];
  total: number;
  page: number;
  /** Unread total across the whole inbox, not just the current filter. */
  new_count: number;
};

export type FeedbackDetail = {
  id: string;
  reference_code: string;
  name: string;
  email: string;
  phone: string | null;
  body: string;
  status: FeedbackStatus;
  note: string | null;
  reply: string | null;
  replied_at: string | null;
  attachments: FeedbackAttachment[];
  created_at: string;
};

export function listFeedbackRequest(input: {
  status?: FeedbackStatus;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.page && input.page > 1) params.set('page', String(input.page));

  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiRequest<ListFeedbackResponse>(`/feedback${suffix}`);
}

export function getFeedbackDetailRequest(id: string) {
  return apiRequest<FeedbackDetail>(`/feedback/${id}`);
}

export function updateFeedbackRequest(
  id: string,
  input: { status?: FeedbackStatus; note?: string },
) {
  return apiRequest<FeedbackDetail>(`/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function replyToFeedbackRequest(id: string, input: { reply: string; note?: string }) {
  return apiRequest<FeedbackDetail>(`/feedback/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
