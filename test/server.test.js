const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer, DEFAULT_USER, DEFAULT_PASSWORD } = require('../server.js');

async function start(opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-'));
  const dataFile = path.join(dir, 'db.json');
  const server = createServer({ dataFile, ...opts });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, dataFile };
}

test('seeds default societies and serves the app', async () => {
  const { server, base } = await start();
  try {
    const state = await (await fetch(`${base}/api/state`)).json();
    assert.deepStrictEqual(state.societies.map((s) => s.name), ['Vaishnavi Gardenia', 'Pratham', 'PGL Apartments']);
    const vg = state.societies[0];
    assert.deepStrictEqual([vg.blocks, vg.floors, vg.unitsPerFloor], [['A', 'B', 'C', 'D', 'E'], 18, 8]);
    const html = await (await fetch(`${base}/`)).text();
    assert.match(html, /Kanha's Kitchen/);
    assert.strictEqual((await fetch(`${base}/../server.js`)).status, 404);
  } finally {
    server.close();
  }
});

test('creates, updates, deletes orders and persists them', async () => {
  const { server, base, dataFile } = await start();
  try {
    const json = { 'Content-Type': 'application/json' };
    const order = { date: '2026-09-27', society: 'vaishnavi-gardenia', block: 'C', flat: '1401', amount: 240, paid: false, items: [] };
    const created = await (await fetch(`${base}/api/orders`, { method: 'POST', headers: json, body: JSON.stringify(order) })).json();
    assert.ok(created.id);
    const upd = await fetch(`${base}/api/orders/${created.id}`, { method: 'PUT', headers: json, body: JSON.stringify({ ...created, paid: true }) });
    assert.strictEqual((await upd.json()).paid, true);
    assert.strictEqual(JSON.parse(fs.readFileSync(dataFile, 'utf8')).orders[0].paid, true);
    assert.strictEqual((await fetch(`${base}/api/orders/${created.id}`, { method: 'DELETE' })).status, 204);
    assert.strictEqual((await fetch(`${base}/api/orders/${created.id}`, { method: 'DELETE' })).status, 404);
    assert.strictEqual((await fetch(`${base}/api/nope`)).status, 404);
  } finally {
    server.close();
  }
});

test('requires the email and password login', async () => {
  const { server, base } = await start({ user: DEFAULT_USER, password: DEFAULT_PASSWORD });
  const basic = (u, p) => ({ Authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64') });
  try {
    const res = await fetch(`${base}/api/state`);
    assert.strictEqual(res.status, 401);
    assert.match(res.headers.get('www-authenticate'), /^Basic /);
    assert.strictEqual((await fetch(`${base}/`)).status, 401);
    assert.strictEqual((await fetch(`${base}/api/state`, { headers: basic(DEFAULT_USER, 'wrong') })).status, 401);
    assert.strictEqual((await fetch(`${base}/api/state`, { headers: basic('someone@else.com', DEFAULT_PASSWORD) })).status, 401);
    assert.strictEqual((await fetch(`${base}/api/state`, { headers: basic(DEFAULT_USER, DEFAULT_PASSWORD) })).status, 200);
    // Email is matched case-insensitively.
    assert.strictEqual((await fetch(`${base}/`, { headers: basic(DEFAULT_USER.toUpperCase(), DEFAULT_PASSWORD) })).status, 200);
  } finally {
    server.close();
  }
});
