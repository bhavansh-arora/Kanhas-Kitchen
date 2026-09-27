// Kanha's Kitchen panel server: serves the web app and a tiny JSON REST API.
// No dependencies — data lives in a single JSON file (data/db.json by default).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const DEFAULTS = require('./public/defaults.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const COLLECTIONS = ['orders', 'menu', 'societies'];
const MAX_BODY = 20 * 1024 * 1024;
// Sign-in for the panel. Override with the PANEL_USER / PANEL_PASSWORD environment variables.
const DEFAULT_USER = 'bhavansharora21@gmail.com';
const DEFAULT_PASSWORD = 'Kanha@26';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function createStore(file) {
  let db;
  if (fs.existsSync(file)) {
    db = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    db = structuredClone(DEFAULTS);
  }
  for (const col of COLLECTIONS) if (!Array.isArray(db[col])) db[col] = structuredClone(DEFAULTS[col]);

  function save() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  }
  save();

  return {
    all: () => db,
    create(col, item) {
      const doc = { ...item, id: item.id || crypto.randomUUID() };
      const i = db[col].findIndex((d) => d.id === doc.id);
      if (i >= 0) db[col][i] = doc;
      else db[col].push(doc);
      save();
      return doc;
    },
    update(col, id, item) {
      const i = db[col].findIndex((d) => d.id === id);
      if (i < 0) return null;
      db[col][i] = { ...item, id };
      save();
      return db[col][i];
    },
    remove(col, id) {
      const before = db[col].length;
      db[col] = db[col].filter((d) => d.id !== id);
      save();
      return db[col].length !== before;
    },
    replaceAll(next) {
      for (const col of COLLECTIONS) {
        if (!Array.isArray(next[col])) throw new Error(`Backup is missing "${col}"`);
      }
      db = { orders: next.orders, menu: next.menu, societies: next.societies };
      save();
    },
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const safeEqual = (x, y) => {
  const a = Buffer.from(String(x));
  const b = Buffer.from(String(y));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ---------- sign-in sessions ----------
// A session is a signed cookie "<email>|<expiry>|<hmac>", so it survives server restarts
// without storing anything. The signing secret lives next to the data file.
const COOKIE = 'kk_session';
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const SHORT_MS = 12 * 60 * 60 * 1000;
const PUBLIC_PATHS = new Set(['/login', '/login.js', '/theme.js', '/styles.css', '/icon.svg', '/logo.png', '/favicon.png', '/apple-touch-icon.png']);
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

function loadSecret(dataFile) {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(path.dirname(dataFile), '.session-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Behind a reverse proxy (e.g. Caddy on the Docker network) every request comes from the
// proxy, so use the address it forwards — but only trust that header from a private address.
function clientIp(req) {
  const remote = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const isPrivate = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd])/i.test(remote);
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  return isPrivate && forwarded ? forwarded : remote;
}

function createAuth({ user, password, secret }) {
  const enabled = Boolean(user || password);
  const email = (user || '').trim().toLowerCase();
  const sign = (payload) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const fails = new Map(); // ip -> { count, since }

  function cookie(req, value, maxAgeMs) {
    const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
    return [
      `${COOKIE}=${encodeURIComponent(value)}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      secure ? 'Secure' : '',
      maxAgeMs === undefined ? '' : `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    ]
      .filter(Boolean)
      .join('; ');
  }

  return {
    enabled,
    session(req) {
      if (!enabled) return { user: null };
      const token = parseCookies(req)[COOKIE];
      if (!token) return null;
      const [who, exp, mac] = token.split('|');
      if (!who || !exp || !mac || !safeEqual(mac, sign(`${who}|${exp}`))) return null;
      if (Number(exp) < Date.now() || who !== email) return null;
      return { user: who };
    },
    // Returns { status, body, headers } for POST /api/login.
    login(req, body) {
      const ip = clientIp(req);
      const f = fails.get(ip);
      if (f && Date.now() - f.since > FAIL_WINDOW_MS) fails.delete(ip);
      if ((fails.get(ip)?.count || 0) >= MAX_FAILS) {
        return { status: 429, body: { error: 'Too many attempts. Please wait 15 minutes and try again.' } };
      }
      // Evaluate both so timing doesn't reveal which part was wrong.
      const userOk = safeEqual(String(body.email || '').trim().toLowerCase(), email);
      const passOk = safeEqual(String(body.password || ''), password);
      if (!(userOk && passOk)) {
        const cur = fails.get(ip) || { count: 0, since: Date.now() };
        cur.count += 1;
        fails.set(ip, cur);
        return { status: 401, body: { error: 'Incorrect email or password.' } };
      }
      fails.delete(ip);
      const ttl = body.remember ? REMEMBER_MS : SHORT_MS;
      const exp = Date.now() + ttl;
      const token = `${email}|${exp}|${sign(`${email}|${exp}`)}`;
      return {
        status: 200,
        body: { user: email },
        headers: { 'Set-Cookie': cookie(req, token, body.remember ? ttl : undefined) },
      };
    },
    logoutCookie: (req) => cookie(req, '', 0),
  };
}

// Cross-site form posts can't carry our SameSite cookie, but reject foreign origins anyway.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath === '/login' ? 'login.html' : urlPath.replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' };
    if (file.endsWith('.html')) headers['Cache-Control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(data);
  });
}

function createServer({ dataFile, user = '', password = '', secret } = {}) {
  const store = createStore(dataFile);
  const auth = createAuth({ user, password, secret: secret || loadSecret(dataFile) });

  return http.createServer(async (req, res) => {
    const { pathname, search } = new URL(req.url, 'http://x');
    const isApi = pathname.startsWith('/api/');
    if (req.method !== 'GET' && req.method !== 'HEAD' && !sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });

    if (pathname === '/api/login' && req.method === 'POST') {
      try {
        const r = auth.login(req, await readJson(req));
        res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...r.headers });
        return res.end(JSON.stringify(r.body));
      } catch (err) {
        return send(res, err.status || 400, { error: err.message });
      }
    }
    if (pathname === '/api/logout' && req.method === 'POST') {
      res.writeHead(204, { 'Set-Cookie': auth.logoutCookie(req), 'Cache-Control': 'no-store' });
      return res.end();
    }

    const session = auth.session(req);
    if (!session && !PUBLIC_PATHS.has(pathname)) {
      if (isApi) return send(res, 401, { error: 'Please sign in' });
      return redirect(res, '/login' + (pathname === '/' ? '' : '?next=' + encodeURIComponent(pathname + search)));
    }
    if (pathname === '/login' && (!auth.enabled || session)) return redirect(res, '/');
    if (pathname === '/api/session' && req.method === 'GET') return send(res, 200, { user: session.user, auth: auth.enabled });

    if (!isApi) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
      return serveStatic(req, res);
    }

    try {
      const parts = pathname.split('/').filter(Boolean).slice(1); // drop "api"
      if (parts[0] === 'state' && req.method === 'GET') return send(res, 200, store.all());
      if (parts[0] === 'import' && req.method === 'POST') {
        store.replaceAll(await readJson(req));
        return send(res, 200, store.all());
      }

      const [col, id] = parts;
      if (!COLLECTIONS.includes(col)) return send(res, 404, { error: 'Unknown collection' });
      if (req.method === 'GET' && !id) return send(res, 200, store.all()[col]);
      if (req.method === 'POST' && !id) return send(res, 201, store.create(col, await readJson(req)));
      if (req.method === 'PUT' && id) {
        const doc = store.update(col, id, await readJson(req));
        return doc ? send(res, 200, doc) : send(res, 404, { error: 'Not found' });
      }
      if (req.method === 'DELETE' && id) {
        return store.remove(col, id) ? send(res, 204) : send(res, 404, { error: 'Not found' });
      }
      return send(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      return send(res, err.status || 400, { error: err.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const dataFile = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
  const user = process.env.PANEL_USER || DEFAULT_USER;
  const password = process.env.PANEL_PASSWORD || DEFAULT_PASSWORD;
  createServer({ dataFile, user, password }).listen(port, () => {
    console.log(`Kanha's Kitchen panel running at http://localhost:${port}`);
    console.log(`Data file: ${dataFile}`);
    console.log(`Login: ${user}`);
  });
}

module.exports = { createServer, DEFAULT_USER, DEFAULT_PASSWORD };
