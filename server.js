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

function checkAuth(req, password) {
  if (!password) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const [, pass = ''] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(/:(.*)/s);
  const a = Buffer.from(pass);
  const b = Buffer.from(password);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

function createServer({ dataFile, password = '' } = {}) {
  const store = createStore(dataFile);

  return http.createServer(async (req, res) => {
    if (!checkAuth(req, password)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Kanhas Kitchen"' });
      return res.end('Login required');
    }

    const { pathname } = new URL(req.url, 'http://x');
    if (!pathname.startsWith('/api/')) {
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
  createServer({ dataFile, password: process.env.PANEL_PASSWORD || '' }).listen(port, () => {
    console.log(`Kanha's Kitchen panel running at http://localhost:${port}`);
    console.log(`Data file: ${dataFile}`);
    if (!process.env.PANEL_PASSWORD) console.log('Tip: set PANEL_PASSWORD to require a login.');
  });
}

module.exports = { createServer };
