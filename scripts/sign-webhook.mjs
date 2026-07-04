import { createHmac } from 'crypto';
import { readFileSync } from 'fs';

const secret = process.env.ZAVU_WEBHOOK_SECRET;
const bodyPath = process.argv[2];

if (!secret) {
  console.error('Set ZAVU_WEBHOOK_SECRET in the environment.');
  process.exit(1);
}

if (!bodyPath) {
  console.error('Usage: node scripts/sign-webhook.mjs <path-to-json-body>');
  process.exit(1);
}

const body = readFileSync(bodyPath, 'utf8').trim();
const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

console.log('Body bytes:', Buffer.byteLength(body, 'utf8'));
console.log('X-Zavu-Signature:', `t=${timestamp},v1=${signature}`);
