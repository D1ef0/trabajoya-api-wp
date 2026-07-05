import { APIError } from '@zavudev/sdk';
import { ConversationCopy } from '../conversation/conversation.copy';
import { ZavuSendFailure, ZavuSendResult } from './zavu.types';

export type { ZavuSendFailure, ZavuSendResult };

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

const RETRYABLE_CODES = new Set(['rate_limit_exceeded']);

export function parseZavuApiError(error: unknown): ZavuSendFailure {
  if (error instanceof APIError) {
    const body = readErrorBody(error.error);
    const code =
      typeof body?.code === 'string' ? body.code : inferCodeFromStatus(error.status);

    return {
      code,
      status: error.status,
      message: error.message,
      retryable: isRetryableZavuFailure(code, error.status),
    };
  }

  return {
    code: 'unknown',
    status: undefined,
    message: error instanceof Error ? error.message : String(error),
    retryable: false,
  };
}

export function isRetryableZavuFailure(
  code: string,
  status: number | undefined,
): boolean {
  if (RETRYABLE_CODES.has(code)) {
    return true;
  }

  return status !== undefined && RETRYABLE_HTTP_STATUSES.has(status);
}

export function mapZavuSendFailureToUserMessage(failure: ZavuSendFailure): string {
  switch (failure.code) {
    case 'whatsapp_window_closed':
      return ConversationCopy.zavuWindowClosed;
    case 'url_not_verified':
    case 'urls_blocked_unverified':
    case 'url_shortener_blocked':
      return ConversationCopy.zavuUrlBlocked;
    case 'email_kyc_required':
      return ConversationCopy.zavuEmailKycRequired;
    case 'rate_limit_exceeded':
      return ConversationCopy.zavuSendFailed;
    default:
      return ConversationCopy.zavuSendFailed;
  }
}

export function shouldNotifyUserOfSendFailure(failure: ZavuSendFailure): boolean {
  return failure.code !== 'whatsapp_window_closed';
}

function readErrorBody(
  error: unknown,
): Record<string, unknown> | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  return error as Record<string, unknown>;
}

function inferCodeFromStatus(status: number | undefined): string {
  if (status === 429) {
    return 'rate_limit_exceeded';
  }

  if (status !== undefined && status >= 500) {
    return 'upstream_error';
  }

  return 'api_error';
}
