export interface CreateIntakeRequest {
  phone: string;
  fullName: string;
  cvText?: string;
  cvFileName?: string;
  cvSource?: string;
}

export interface TrabajoyaIntake {
  id: string;
  code: string;
  full_name: string;
  status: string;
  source: string;
}

export interface CreateIntakeResponse {
  ok: true;
  intake: TrabajoyaIntake;
  code: string;
  url: string;
}

export interface CreateIntakeErrorResponse {
  ok: false;
  error: string;
}

export class TrabajoyaApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly publicError?: string,
  ) {
    super(message);
    this.name = 'TrabajoyaApiError';
  }
}

export class TrabajoyaNotConfiguredError extends Error {
  constructor() {
    super('TrabajoYa API is not configured');
    this.name = 'TrabajoyaNotConfiguredError';
  }
}
