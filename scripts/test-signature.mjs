import { createHmac } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Inline copy of verify logic for standalone test (compiled dist)
const MAX_AGE_SECONDS = 300;

function verifyZavuSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = signatureHeader.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));
  if (!timestampPart || !signaturePart) return false;
  const timestamp = parseInt(timestampPart.slice(2), 10);
  const signature = signaturePart.slice(3);
  const now = Math.floor(Date.now() / 1000);
  if (Number.isNaN(timestamp) || now - timestamp > MAX_AGE_SECONDS) return false;
  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

const secret = 'whsec_test_local';
const body = '{"type":"message.inbound","data":{"id":"x","from":"+1","text":"hi"}}';
const t = Math.floor(Date.now() / 1000);
const sig = createHmac('sha256', secret).update(body).digest('hex');
const header = `t=${t},v1=${sig}`;

console.log('valid signature:', verifyZavuSignature(body, header, secret));
console.log('invalid signature:', verifyZavuSignature(body, 't=1,v1=bad', secret));
console.log('missing header:', verifyZavuSignature(body, undefined, secret));
