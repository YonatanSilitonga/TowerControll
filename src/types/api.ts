/**
 * Format response API backend Tower Control:
 * Semua endpoint mengembalikan `{ success: boolean, data?: T, message?: string }`.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Error terstruktur yang dilempar API client. */
export interface ApiErrorPayload {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

/** Bentuk list standar dari endpoint index. */
export interface ListResponse<T> {
  data: T[];
}
