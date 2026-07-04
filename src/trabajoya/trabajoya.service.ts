import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateIntakeErrorResponse,
  CreateIntakeRequest,
  CreateIntakeResponse,
  TrabajoyaApiError,
  TrabajoyaNotConfiguredError,
} from './trabajoya.types';

@Injectable()
export class TrabajoyaService implements OnModuleInit {
  private readonly logger = new Logger(TrabajoyaService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (this.isConfigured()) {
      this.logger.log(
        `TrabajoYa intake client configured (${this.config.get<string>('trabajoya.baseUrl')})`,
      );
      return;
    }

    this.logger.warn(
      'TRABAJOYA_INTAKE_API_KEY or TRABAJOYA_API_BASE_URL not set — intake creation disabled',
    );
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('trabajoya.intakeApiKey') &&
        this.config.get<string>('trabajoya.baseUrl'),
    );
  }

  async createIntake(
    request: CreateIntakeRequest,
  ): Promise<CreateIntakeResponse> {
    const apiKey = this.config.get<string>('trabajoya.intakeApiKey');
    const baseUrl = this.config.get<string>('trabajoya.baseUrl');

    if (!apiKey || !baseUrl) {
      this.logger.warn(
        `TrabajoYa intake skipped: baseUrl=${baseUrl ? 'set' : 'missing'}, apiKey=${apiKey ? 'set' : 'missing'}`,
      );
      throw new TrabajoyaNotConfiguredError();
    }

    const phone = normalizePhoneSV(request.phone);
    const url = `${baseUrl.replace(/\/$/, '')}/api/intakes`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Trabajoya-Key': apiKey,
        },
        body: JSON.stringify({
          phone,
          full_name: request.fullName,
          source: 'whatsapp',
        }),
      });
    } catch (error) {
      this.logger.error(`TrabajoYa request failed: ${String(error)}`);
      throw new TrabajoyaApiError('Network error contacting TrabajoYa', 0);
    }

    const body = (await response.json()) as
      | CreateIntakeResponse
      | CreateIntakeErrorResponse;

    if (!response.ok || !body.ok) {
      const publicError =
        'error' in body ? body.error : `HTTP ${response.status}`;
      this.logger.error(
        `TrabajoYa intake creation failed (${response.status}): ${publicError}`,
      );
      throw new TrabajoyaApiError(
        `TrabajoYa intake creation failed: ${publicError}`,
        response.status,
        publicError,
      );
    }

    return body;
  }
}

export function normalizePhoneSV(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  const local =
    digits.startsWith('503') && digits.length === 11 ? digits.slice(3) : digits;

  if (local.length !== 8 || !['2', '6', '7'].includes(local[0])) {
    throw new TrabajoyaApiError('invalid_phone', 400, 'invalid_phone');
  }

  return `+503${local}`;
}
