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

test('sign-in page, session cookie and sign-out', async () => {
  const { server, base } = await start({ user: DEFAULT_USER, password: DEFAULT_PASSWORD, secret: 'test-secret' });
  const json = { 'Content-Type': 'application/json' };
  const login = (email, password, remember = true) =>
    fetch(`${base}/api/login`, { method: 'POST', headers: json, body: JSON.stringify({ email, password, remember }) });
  try {
    // Signed out: pages redirect to the sign-in page, the API refuses.
    const home = await fetch(`${base}/`, { redirect: 'manual' });
    assert.strictEqual(home.status, 302);
    assert.strictEqual(home.headers.get('location'), '/login');
    const deep = await fetch(`${base}/app.js`, { redirect: 'manual' });
    assert.strictEqual(deep.headers.get('location'), '/login?next=%2Fapp.js');
    assert.strictEqual((await fetch(`${base}/api/state`)).status, 401);
    const page = await fetch(`${base}/login`);
    assert.strictEqual(page.status, 200);
    assert.match(await page.text(), /id="login-form"/);
    assert.strictEqual((await fetch(`${base}/styles.css`)).status, 200);

    // Wrong details are rejected without a cookie.
    const bad = await login(DEFAULT_USER, 'wrong');
    assert.strictEqual(bad.status, 401);
    assert.strictEqual(bad.headers.get('set-cookie'), null);
    assert.strictEqual((await login('someone@else.com', DEFAULT_PASSWORD)).status, 401);

    // Right details (email in any case) give an HttpOnly session cookie.
    const ok = await login(DEFAULT_USER.toUpperCase(), DEFAULT_PASSWORD);
    assert.strictEqual(ok.status, 200);
    const setCookie = ok.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Max-Age=2592000/);
    const cookie = { Cookie: setCookie.split(';')[0] };
    assert.strictEqual((await fetch(`${base}/api/state`, { headers: cookie })).status, 200);
    assert.deepStrictEqual(await (await fetch(`${base}/api/session`, { headers: cookie })).json(), { user: DEFAULT_USER, auth: true });
    assert.strictEqual((await fetch(`${base}/`, { headers: cookie })).status, 200);
    assert.strictEqual((await fetch(`${base}/login`, { headers: cookie, redirect: 'manual' })).status, 302);

    // Without "keep me signed in" the cookie ends with the browser session.
    assert.doesNotMatch((await login(DEFAULT_USER, DEFAULT_PASSWORD, false)).headers.get('set-cookie'), /Max-Age/);

    // A tampered cookie is refused.
    const tampered = { Cookie: cookie.Cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')) };
    assert.strictEqual((await fetch(`${base}/api/state`, { headers: tampered })).status, 401);

    // Requests from another site are refused.
    const foreign = await fetch(`${base}/api/orders`, { method: 'POST', headers: { ...json, ...cookie, Origin: 'https://evil.example' }, body: '{}' });
    assert.strictEqual(foreign.status, 403);

    // Sign-out clears the cookie.
    const out = await fetch(`${base}/api/logout`, { method: 'POST', headers: cookie });
    assert.strictEqual(out.status, 204);
    assert.match(out.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    server.close();
  }
});

test('blocks repeated wrong passwords', async () => {
  const { server, base } = await start({ user: DEFAULT_USER, password: DEFAULT_PASSWORD, secret: 'test-secret' });
  const attempt = (password) =>
    fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: DEFAULT_USER, password }) });
  try {
    for (let i = 0; i < 5; i++) assert.strictEqual((await attempt('nope')).status, 401);
    assert.strictEqual((await attempt(DEFAULT_PASSWORD)).status, 429);
    // Behind a proxy on a private address, other visitors (by X-Forwarded-For) are not locked out.
    const other = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.9' },
      body: JSON.stringify({ email: DEFAULT_USER, password: DEFAULT_PASSWORD }),
    });
    assert.strictEqual(other.status, 200);
  } finally {
    server.close();
  }
});
