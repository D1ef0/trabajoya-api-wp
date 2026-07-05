import { createHmac } from 'crypto';
import {
  verifyZavuSignature,
  verifyZavuSignatureDetailed,
} from './zavu-signature.util';

function signBody(
  rawBody: string,
  secret: string,
  timestamp = Math.floor(Date.now() / 1000),
): string {
  const signature = createHmac('sha256', secret).update(rawBody).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('verifyZavuSignatureDetailed', () => {
  const secret = 'whsec_test_local';
  const body =
    '{"type":"message.inbound","data":{"messageId":"msg_1","from":"+50312345678","text":"hola"}}';

  it('accepts a valid signature on the raw body', () => {
    expect(
      verifyZavuSignatureDetailed(body, signBody(body, secret), secret),
    ).toEqual({ valid: true });
  });

  it('rejects a missing header', () => {
    expect(verifyZavuSignatureDetailed(body, undefined, secret)).toEqual({
      valid: false,
      reason: 'missing_header',
    });
  });

  it('rejects a malformed header', () => {
    expect(verifyZavuSignatureDetailed(body, 'bad-header', secret)).toEqual({
      valid: false,
      reason: 'malformed_header',
    });
  });

  it('rejects an expired timestamp', () => {
    const expired = Math.floor(Date.now() / 1000) - 400;
    expect(
      verifyZavuSignatureDetailed(body, signBody(body, secret, expired), secret),
    ).toEqual({
      valid: false,
      reason: 'timestamp_expired',
    });
  });

  it('rejects a signature mismatch', () => {
    expect(
      verifyZavuSignatureDetailed(body, signBody(body, 'other-secret'), secret),
    ).toEqual({
      valid: false,
      reason: 'mismatch',
    });
  });

  it('does not sign with timestamp prefix in the payload', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const wrongHeader = `t=${timestamp},v1=${createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex')}`;

    expect(verifyZavuSignatureDetailed(body, wrongHeader, secret)).toEqual({
      valid: false,
      reason: 'mismatch',
    });
  });
});

describe('verifyZavuSignature', () => {
  it('returns a boolean wrapper', () => {
    const secret = 'whsec_test_local';
    const body = '{"type":"message.inbound"}';

    expect(verifyZavuSignature(body, signBody(body, secret), secret)).toBe(true);
    expect(verifyZavuSignature(body, undefined, secret)).toBe(false);
  });
});
