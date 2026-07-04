import { createHmac } from 'crypto';

const secret = 'whsec_test_local';
const body = JSON.stringify({
  type: 'message.inbound',
  data: {
    id: 'msg_sig_001',
    from: '+5215599999999',
    text: 'test firma',
  },
});

const timestamp = Math.floor(Date.now() / 1000);
const signature = createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

const headers = {
  'Content-Type': 'application/json',
  'X-Zavu-Signature': `t=${timestamp},v1=${signature}`,
};

async function post(path, opts = {}) {
  const res = await fetch(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: opts.headers ?? { 'Content-Type': 'application/json' },
    body: opts.body,
  });
  return { status: res.status, text: await res.text() };
}

const invalid = await post('/webhooks/zavu', {
  body,
  headers: {
    'Content-Type': 'application/json',
    'X-Zavu-Signature': 't=1,v1=invalid',
  },
});

console.log('invalid signature (expect 401 when skip=false):', invalid);

const buttonBody = JSON.stringify({
  type: 'message.inbound',
  data: {
    id: 'msg_button_001',
    from: '+5215511111111',
    buttonReply: { id: 'ventas', title: 'Ventas' },
  },
});

const buttonRes = await post('/webhooks/zavu', { body: buttonBody });
console.log('button reply (expect 200 OK):', buttonRes);

await new Promise((r) => setTimeout(r, 2000));

const health = await fetch('http://localhost:3000/health');
console.log('health:', await health.json());
