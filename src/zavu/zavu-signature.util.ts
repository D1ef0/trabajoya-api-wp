import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_SECONDS = 300;

export type ZavuSignatureFailureReason =
  | 'missing_header'
  | 'malformed_header'
  | 'timestamp_expired'
  | 'mismatch';

export function verifyZavuSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  return verifyZavuSignatureDetailed(rawBody, signatureHeader, secret).valid;
}

export function verifyZavuSignatureDetailed(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): { valid: true } | { valid: false; reason: ZavuSignatureFailureReason } {
  if (!signatureHeader) {
    return { valid: false, reason: 'missing_header' };
  }

  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signaturePart = parts.find((part) => part.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return { valid: false, reason: 'malformed_header' };
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const signature = signaturePart.slice(3);
  const now = Math.floor(Date.now() / 1000);

  if (Number.isNaN(timestamp) || now - timestamp > MAX_AGE_SECONDS) {
    return { valid: false, reason: 'timestamp_expired' };
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  try {
    const valid = timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
    return valid ? { valid: true } : { valid: false, reason: 'mismatch' };
  } catch {
    return { valid: false, reason: 'mismatch' };
  }
}
