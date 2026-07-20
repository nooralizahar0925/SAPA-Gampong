export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = fields;
  }

  static validation(message: string, fields?: Record<string, string>) {
    return new ApiError('VALIDATION_ERROR', message, fields);
  }
  static unauthorized(message = 'Autentikasi diperlukan') {
    return new ApiError('UNAUTHORIZED', message);
  }
  static forbidden(message = 'Akses ditolak') {
    return new ApiError('FORBIDDEN', message);
  }
  static notFound(message = 'Data tidak ditemukan') {
    return new ApiError('NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new ApiError('CONFLICT', message);
  }
}
