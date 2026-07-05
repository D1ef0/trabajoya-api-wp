import { APIError } from '@zavudev/sdk';
import {
  isRetryableZavuFailure,
  mapZavuSendFailureToUserMessage,
  parseZavuApiError,
  shouldNotifyUserOfSendFailure,
} from './zavu-error.util';
import { ConversationCopy } from '../conversation/conversation.copy';

describe('parseZavuApiError', () => {
  it('extracts known Zavu error codes from APIError', () => {
    const error = new APIError(
      400,
      { code: 'whatsapp_window_closed', message: 'Window closed' },
      '400 Window closed',
      new Headers(),
    );

    expect(parseZavuApiError(error)).toEqual({
      code: 'whatsapp_window_closed',
      status: 400,
      message: '400 Window closed',
      retryable: false,
    });
  });

  it('marks rate limits and upstream errors as retryable', () => {
    const rateLimit = new APIError(
      429,
      { code: 'rate_limit_exceeded' },
      '429 Too Many Requests',
      new Headers(),
    );
    const upstream = new APIError(
      503,
      { message: 'Unavailable' },
      '503 Unavailable',
      new Headers(),
    );

    expect(parseZavuApiError(rateLimit).retryable).toBe(true);
    expect(parseZavuApiError(upstream).retryable).toBe(true);
  });

  it('wraps unknown errors safely', () => {
    expect(parseZavuApiError(new Error('network down'))).toEqual({
      code: 'unknown',
      status: undefined,
      message: 'network down',
      retryable: false,
    });
  });
});

describe('mapZavuSendFailureToUserMessage', () => {
  it('maps known delivery failures to user copy', () => {
    expect(
      mapZavuSendFailureToUserMessage({
        code: 'whatsapp_window_closed',
        status: 400,
        message: 'window closed',
        retryable: false,
      }),
    ).toBe(ConversationCopy.zavuWindowClosed);

    expect(
      mapZavuSendFailureToUserMessage({
        code: 'url_not_verified',
        status: 400,
        message: 'url blocked',
        retryable: false,
      }),
    ).toBe(ConversationCopy.zavuUrlBlocked);
  });
});

describe('shouldNotifyUserOfSendFailure', () => {
  it('skips user notice when the WhatsApp window is closed', () => {
    expect(
      shouldNotifyUserOfSendFailure({
        code: 'whatsapp_window_closed',
        status: 400,
        message: 'closed',
        retryable: false,
      }),
    ).toBe(false);
  });
});

describe('isRetryableZavuFailure', () => {
  it('treats 5xx and rate limits as retryable', () => {
    expect(isRetryableZavuFailure('api_error', 500)).toBe(true);
    expect(isRetryableZavuFailure('rate_limit_exceeded', 429)).toBe(true);
    expect(isRetryableZavuFailure('whatsapp_window_closed', 400)).toBe(false);
  });
});
