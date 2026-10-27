// Captures UI screenshots of the running app via the Chrome DevTools Protocol.
// Usage: node scripts/shots.mjs   (server must be running on BASE)
import { spawn } from 'node:child_process';
import net from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4000';
const OUT = path.join(process.cwd(), 'docs', 'screenshots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
fs.mkdirSync(OUT, { recursive: true });

const api = (p, opts = {}) =>
  fetch(`${BASE}/api${p}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }).then((r) => r.json());

// --- seed a formatted document and a share so the screenshots look real ---
const alice = await api('/login', { method: 'POST', body: JSON.stringify({ email: 'alice@ajaia.test' }) });
const H = { Authorization: `Bearer ${alice.token}` };
const doc = await api('/documents', {
  method: 'POST', headers: H,
  body: JSON.stringify({
    title: 'Q4 Product Roadmap',
    content:
      '<h1>Q4 Product Roadmap</h1><p>Our focus for the quarter is <strong>collaboration</strong> and <em>reliability</em>.</p><h2>Priorities</h2><ul><li>Ship the shared editor</li><li>Harden autosave</li><li>Add <u>export</u> options</li></ul><ol><li>Scope</li><li>Build</li><li>Review</li></ol>',
  }),
});
await api(`/documents/${doc.id}/shares`, { method: 'POST', headers: H, body: JSON.stringify({ email: 'bob@ajaia.test', role: 'viewer' }) });
const bob = await api('/login', { method: 'POST', body: JSON.stringify({ email: 'bob@ajaia.test' }) });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/ajaia-cdp',
  '--window-size=1440,900', '--hide-scrollbars', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json());
      const pg = list.find((t) => t.type === 'page');
      if (pg) return pg.webSocketDebuggerUrl;
    } catch {}
    await wait(200);
  }
  throw new Error('no devtools');
}

function connect(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const sock = net.connect(Number(u.port), u.hostname, () => {
      const key = crypto.randomBytes(16).toString('base64');
      sock.write(
        `GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\n` +
        `Connection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    let buf = Buffer.alloc(0), handshaken = false, id = 0;
    const waiters = new Map();
    sock.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!handshaken) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        buf = buf.slice(idx + 4); handshaken = true;
      }
      while (buf.length >= 2) {
        const len = buf[1] & 0x7f; let off = 2, n = len;
        if (len === 126) { n = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { n = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + n) break;
        const payload = buf.slice(off, off + n); buf = buf.slice(off + n);
        try { const msg = JSON.parse(payload.toString()); if (msg.id && waiters.has(msg.id)) { waiters.get(msg.id)(msg); waiters.delete(msg.id); } } catch {}
      }
    });
    const send = (method, params = {}) =>
      new Promise((res) => {
        id += 1; waiters.set(id, res);
        const data = Buffer.from(JSON.stringify({ id, method, params }));
        const mask = crypto.randomBytes(4);
        const masked = Buffer.from(data.map((b, i) => b ^ mask[i % 4]));
        let hdr;
        if (data.length < 126) hdr = Buffer.from([0x81, 0x80 | data.length]);
        else { hdr = Buffer.alloc(4); hdr[0] = 0x81; hdr[1] = 0x80 | 126; hdr.writeUInt16BE(data.length, 2); }
        sock.write(Buffer.concat([hdr, mask, masked]));
      });
    const ready = setInterval(() => { if (handshaken) { clearInterval(ready); resolve({ send }); } }, 50);
  });
}

const ws = await connect(await wsUrl());
await ws.send('Page.enable');
await ws.send('Runtime.enable');
await ws.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

async function goto(url) { await ws.send('Page.navigate', { url }); await wait(1200); }
async function js(expression) { const r = await ws.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; }
async function shot(name) {
  const r = await ws.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64'));
  console.log('  wrote', name);
}
const signIn = (t, u) => js(`localStorage.setItem('ajaia.token','${t}');localStorage.setItem('ajaia.user','${JSON.stringify(u).replace(/'/g, "\\'")}');true`);

// 1. login screen
await goto(`${BASE}/`);
await js(`localStorage.clear();true`); await goto(`${BASE}/`); await shot('01-login.png');

// 2. editor as owner
await signIn(alice.token, alice.user); await goto(`${BASE}/`);
await js(`[...document.querySelectorAll('.doc-item')].find(e=>e.textContent.includes('Q4 Product Roadmap'))?.click();true`);
await wait(900); await shot('02-editor-owner.png');

// 3. share dialog
await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Share')?.click();true`);
await wait(700); await shot('03-share-dialog.png');

// 4. viewer (read-only) as bob
await signIn(bob.token, bob.user); await goto(`${BASE}/`);
await js(`[...document.querySelectorAll('.doc-item')].find(e=>e.textContent.includes('Q4 Product Roadmap'))?.click();true`);
await wait(900); await shot('04-shared-viewer.png');

await ws.send('Browser.close');
chrome.kill();
console.log('done ->', OUT);
process.exit(0);
