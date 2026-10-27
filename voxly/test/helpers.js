// Test helpers: a stand-in for the Anthropic client, and a running app on a random port.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { createApp } = require('../server');
const { createAI } = require('../lib/ai');

// Each call to beta.messages.stream() takes the next scripted reply. A reply is either a
// Message-like object or a function (params) => Message. Text blocks are streamed as deltas.
function fakeClient(script = [], respond = null) {
  const calls = [];
  const client = {
    calls,
    script,
    beta: {
      messages: {
        stream(params) {
          calls.push(JSON.parse(JSON.stringify(params)));
          let next = (respond && respond(params)) || script.shift();
          if (typeof next === 'function') next = next(params);
          const msg = next || { content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 2 } };
          msg.usage = msg.usage || { input_tokens: 10, output_tokens: 5 };
          msg.stop_reason = msg.stop_reason || (msg.content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn');
          const events = [];
          msg.content.forEach((b, index) => {
            events.push({ type: 'content_block_start', index, content_block: b.type === 'text' ? { type: 'text', text: '' } : b });
            if (b.type === 'text') for (const part of b.text.match(/.{1,12}/gs) || []) events.push({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: part } });
          });
          return {
            async *[Symbol.asyncIterator]() { for (const e of events) yield e; },
            finalMessage: async () => msg,
          };
        },
      },
    },
  };
  return client;
}

const text = (t) => ({ content: [{ type: 'text', text: t }] });
const toolUse = (name, input, id = 'tu_' + Math.random().toString(36).slice(2)) => ({ content: [{ type: 'tool_use', id, name, input }] });

async function startApp(opts = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voxly-test-'));
  const client = fakeClient(opts.script || [], opts.respond);
  const ai = createAI({ client, log: { warn() {} } });
  const app = createApp({
    dataDir, secret: 'test-secret', ai, allowPrivateUrls: true,
    adminEmail: 'admin@example.com', adminPassword: 'admin-pass-123', ...opts.app,
  });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  let cookie = '';
  async function req(p, { method = 'GET', body, headers = {}, raw = false } = {}) {
    const res = await fetch(base + p, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      redirect: 'manual',
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    if (raw) return res;
    const t = await res.text();
    let data = t;
    try { data = JSON.parse(t); } catch { /* not JSON */ }
    return { status: res.status, data, headers: res.headers };
  }
  const login = (email, password) => { cookie = ''; return req('/api/login', { method: 'POST', body: { email, password } }); };
  const close = async () => {
    await app.queue.idle();
    await new Promise((r) => app.server.close(r));
    fs.rmSync(dataDir, { recursive: true, force: true });
  };
  return { ...app, base, req, login, client, close, dataDir, setCookie: (c) => { cookie = c; }, getCookie: () => cookie };
}

// Parses the widget's event stream into a list of events.
async function chat(base, body, headers = {}) {
  const res = await fetch(`${base}/api/public/chat`, { method: 'POST', headers: { 'Content-Type': 'text/plain', ...headers }, body: JSON.stringify(body) });
  const t = await res.text();
  if (!res.headers.get('content-type')?.includes('event-stream')) return { status: res.status, error: JSON.parse(t).error, events: [] };
  const events = t.split('\n\n').filter((x) => x.startsWith('data: ')).map((x) => JSON.parse(x.slice(6)));
  return { status: res.status, events, text: events.filter((e) => e.type === 'delta').map((e) => e.text).join(''), headers: res.headers };
}

// Builds a minimal zip (used to fake .docx files).
function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = zlib.deflateRawSync(Buffer.from(content));
    const nameBuf = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(Buffer.byteLength(content), 22); local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(Buffer.byteLength(content), 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

module.exports = { fakeClient, text, toolUse, startApp, chat, makeZip };
