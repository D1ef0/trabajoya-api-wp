import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_SECONDS = 300;

export function verifyZavuSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signaturePart = parts.find((part) => part.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const signature = signaturePart.slice(3);
  const now = Math.floor(Date.now() / 1000);

  if (Number.isNaN(timestamp) || now - timestamp > MAX_AGE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}
