// Passwords (scrypt), signed session cookies and sign-in rate limiting.
const crypto = require('node:crypto');

const COOKIE = 'vx_session';
const REMEMBER_MS = 30 * 24 * 3600 * 1000;
const SHORT_MS = 12 * 3600 * 1000;
const MAX_FAILS = 5;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function checkPassword(password, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const want = Buffer.from(hash, 'base64');
  const got = crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), want.length);
  return crypto.timingSafeEqual(want, got);
}

function randomPassword() {
  // Readable: no 0/O/1/l confusion.
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Behind a reverse proxy every request comes from the proxy, so use the address it
// forwards — but only trust that header when the direct peer is a private address.
function clientIp(req) {
  const remote = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const isPrivate = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd])/i.test(remote);
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  return isPrivate && forwarded ? forwarded : remote;
}

function createSessions(secret) {
  const sign = (payload) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const fails = new Map();

  function cookie(req, value, maxAgeMs) {
    const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
    return [
      `${COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax',
      secure ? 'Secure' : '',
      maxAgeMs === undefined ? '' : `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    ].filter(Boolean).join('; ');
  }

  return {
    // Session token: "<userId>|<expiry>|<pwfp>|<hmac>". pwfp ties it to the current password,
    // so changing a password signs out every other session.
    issue(req, user, remember) {
      const ttl = remember ? REMEMBER_MS : SHORT_MS;
      const exp = Date.now() + ttl;
      const fp = sign(user.password_hash).slice(0, 12);
      const body = `${user.id}|${exp}|${fp}`;
      return cookie(req, `${body}|${sign(body)}`, remember ? ttl : undefined);
    },
    read(req, lookupUser) {
      const token = parseCookies(req)[COOKIE];
      if (!token) return null;
      const [id, exp, fp, mac] = token.split('|');
      if (!id || !exp || !fp || !mac) return null;
      const a = Buffer.from(mac);
      const b = Buffer.from(sign(`${id}|${exp}|${fp}`));
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      if (Number(exp) < Date.now()) return null;
      const user = lookupUser(id);
      if (!user || sign(user.password_hash).slice(0, 12) !== fp) return null;
      return user;
    },
    clear: (req) => cookie(req, '', 0),
    // Rate limiting for sign-in attempts, per client address.
    blocked(ip) {
      const f = fails.get(ip);
      if (f && Date.now() - f.since > FAIL_WINDOW_MS) fails.delete(ip);
      return (fails.get(ip)?.count || 0) >= MAX_FAILS;
    },
    failed(ip) {
      const cur = fails.get(ip) || { count: 0, since: Date.now() };
      cur.count += 1;
      fails.set(ip, cur);
    },
    succeeded: (ip) => fails.delete(ip),
  };
}

// Simple sliding-window counter, used to rate-limit the public chat endpoint.
function createLimiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const t = Date.now();
    const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
    if (list.length >= max) {
      hits.set(key, list);
      return false;
    }
    list.push(t);
    hits.set(key, list);
    if (hits.size > 10000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
    return true;
  };
}

module.exports = { hashPassword, checkPassword, randomPassword, createSessions, createLimiter, clientIp, parseCookies };
