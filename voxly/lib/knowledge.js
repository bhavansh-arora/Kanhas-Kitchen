// Turning websites and files into plain-text knowledge, and finding the parts relevant to a question.
const dns = require('node:dns').promises;
const net = require('node:net');
const zlib = require('node:zlib');

// ---------- HTML to text ----------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', copy: '©', reg: '®', trade: '™', rupee: '₹', euro: '€', pound: '£', bull: '•', middot: '·' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function htmlToText(html) {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim());
  const metaDesc = decodeEntities(
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] || '',
  ).trim();
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head|nav|form|select)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<h([1-6])\b[^>]*>/gi, (m, n) => '\n\n' + '#'.repeat(Number(n)) + ' ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<(br|hr)\b[^>]*>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|main|aside|ul|ol|table|tr|blockquote|address|figure|dl|dt|dd)>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<img\b[^>]*alt=["']([^"']+)["'][^>]*>/gi, ' [image: $1] ')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s)
    .replace(/[ \t\f\v ]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (metaDesc && !s.includes(metaDesc)) s = metaDesc + '\n\n' + s;
  return { title, text: s };
}

function extractLinks(html, baseUrl) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#][^"']*)["']/gi)) {
    try {
      const u = new URL(decodeEntities(m[1]), baseUrl);
      u.hash = '';
      if (u.protocol === 'http:' || u.protocol === 'https:') out.add(u.toString());
    } catch {
      /* ignore bad links */
    }
  }
  return [...out];
}

// ---------- safe fetching (no requests into private networks) ----------
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
}

async function assertPublicUrl(url, allowPrivate) {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http and https links can be read');
  if (allowPrivate) return u;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error(`${u.hostname} is not a public website`);
  return u;
}

async function safeFetch(url, { allowPrivate = false, timeoutMs = 12000, maxBytes = 3 * 1024 * 1024 } = {}) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicUrl(current, allowPrivate);
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoxlyReader/1.0)', Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    const chunks = [];
    let size = 0;
    if (res.body) {
      for await (const c of res.body) {
        size += c.length;
        if (size > maxBytes) break;
        chunks.push(c);
      }
    }
    return { url: current, status: res.status, type: res.headers.get('content-type') || '', body: Buffer.concat(chunks).toString('utf8') };
  }
  throw new Error('Too many redirects');
}

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|rar|gz|mp4|mp3|wav|avi|mov|webm|css|js|json|xml|docx?|xlsx?|pptx?|exe|dmg|apk)$/i;
const sameSite = (a, b) => a.replace(/^www\./, '') === b.replace(/^www\./, '');

// Reads a website: the start page, pages listed in sitemap.xml and pages linked from those,
// staying on the same site. Lines repeated on most pages (menus, footers) are kept only once.
async function crawlSite(startUrl, { maxPages = 30, allowPrivate = false, onPage } = {}) {
  const start = new URL(/^https?:\/\//i.test(startUrl) ? startUrl : `https://${startUrl}`);
  const queue = [start.toString()];
  const seen = new Set(queue);
  const pages = [];
  const errors = [];

  const enqueue = (link) => {
    try {
      const u = new URL(link);
      u.hash = '';
      const key = u.toString();
      if (!sameSite(u.hostname, start.hostname) || SKIP_EXT.test(u.pathname) || seen.has(key)) return;
      if (/\/(wp-admin|wp-login|cart|checkout|login|signin|account)\b/i.test(u.pathname)) return;
      seen.add(key);
      queue.push(key);
    } catch {
      /* ignore */
    }
  };

  try {
    const sm = await safeFetch(new URL('/sitemap.xml', start).toString(), { allowPrivate, timeoutMs: 8000 });
    if (sm.status === 200) for (const m of sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) if (!/\.xml$/i.test(m[1])) enqueue(decodeEntities(m[1]));
  } catch {
    /* no sitemap */
  }

  while (queue.length && pages.length < maxPages) {
    const batch = queue.splice(0, 4);
    await Promise.all(batch.map(async (url) => {
      try {
        const r = await safeFetch(url, { allowPrivate });
        if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
        if (!/html|text\/plain/i.test(r.type)) return;
        const { title, text } = /html/i.test(r.type) ? htmlToText(r.body) : { title: '', text: r.body };
        if (/html/i.test(r.type)) for (const l of extractLinks(r.body, r.url)) enqueue(l);
        if (text.length < 40 || pages.length >= maxPages) return;
        const page = { url: r.url, title: title || r.url, text };
        pages.push(page);
        if (onPage) onPage(page, pages.length);
      } catch (err) {
        errors.push({ url, error: err.message });
      }
    }));
  }
  if (pages.length >= 4) {
    const count = new Map();
    for (const p of pages) for (const l of new Set(p.text.split('\n'))) if (l.length > 2) count.set(l, (count.get(l) || 0) + 1);
    const common = new Set([...count].filter(([, n]) => n >= Math.ceil(pages.length * 0.6)).map(([l]) => l));
    pages.forEach((p, i) => {
      if (i > 0) p.text = p.text.split('\n').filter((l) => !common.has(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    });
  }
  return { pages: pages.filter((p) => p.text.length >= 40), errors };
}

// ---------- Office files (.docx / .pptx are zip files of XML) ----------
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid zip file');
  const entries = new Map();
  let p = buf.readUInt32LE(eocd + 16);
  const n = buf.readUInt16LE(eocd + 10);
  for (let k = 0; k < n && buf.readUInt32LE(p) === 0x02014b50; k++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + csize);
      return method === 8 ? zlib.inflateRawSync(data) : data;
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const xmlText = (xml) =>
  decodeEntities(xml.replace(/<w:tab\/>/g, '\t').replace(/<\/(w:p|a:p)>/g, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

function officeToText(buf, ext) {
  const zip = unzip(buf);
  if (ext === 'docx') {
    const doc = zip.get('word/document.xml');
    if (!doc) throw new Error('This .docx file has no document text');
    return xmlText(doc().toString('utf8'));
  }
  if (ext === 'pptx') {
    const slides = [...zip.keys()]
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    return slides.map((k, i) => `## Slide ${i + 1}\n${xmlText(zip.get(k)().toString('utf8'))}`).join('\n\n');
  }
  throw new Error('Unsupported file type');
}

// What we can do with an uploaded file: read it ourselves ("text"), or ask Claude to read it ("vision").
const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
function classifyFile(name, mime = '') {
  const ext = String(name).split('.').pop().toLowerCase();
  if (IMAGE_TYPES[ext] || /^image\/(png|jpeg|webp|gif)$/.test(mime)) return { kind: 'image', ext, mime: IMAGE_TYPES[ext] || mime };
  if (ext === 'pdf' || mime === 'application/pdf') return { kind: 'pdf', ext: 'pdf', mime: 'application/pdf' };
  if (ext === 'docx' || ext === 'pptx') return { kind: 'office', ext, mime };
  if (['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'html', 'htm', 'xml', 'log'].includes(ext) || /^text\//.test(mime)) return { kind: 'text', ext, mime: mime || 'text/plain' };
  return null;
}

function fileToText(buf, info) {
  if (info.kind === 'office') return officeToText(buf, info.ext);
  const s = buf.toString('utf8');
  return info.ext === 'html' || info.ext === 'htm' ? htmlToText(s).text : s;
}

// ---------- search ----------
const STOP = new Set('a an and are as at be by do does for from has have how i if in is it its me my of on or our so that the this to was we what when where which who why will with you your can tell about please hai hain kya ka ki ke ko se mein aur'.split(' '));
const tokenize = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((w) => w.length > 1 && !STOP.has(w));

function chunkSource(src, size = 1200) {
  const paras = src.content.split(/\n{2,}/);
  const chunks = [];
  let cur = '';
  for (const p of paras) {
    if (cur && cur.length + p.length > size) {
      chunks.push(cur);
      cur = '';
    }
    if (p.length > size * 1.5) {
      for (let i = 0; i < p.length; i += size) chunks.push(p.slice(i, i + size));
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) chunks.push(cur);
  return chunks.map((text) => ({ source: src, text }));
}

function buildIndex(sources) {
  const chunks = sources.flatMap((s) => chunkSource(s));
  const df = new Map();
  const docs = chunks.map((c) => {
    const toks = tokenize(`${c.source.title} ${c.text}`);
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { chunk: c, tf, len: toks.length };
  });
  const avg = docs.reduce((a, d) => a + d.len, 0) / (docs.length || 1);
  return { docs, df, avg, n: docs.length };
}

// Query words also match longer/shorter forms ("deliver" ~ "delivery", "cakes" ~ "cake"), at a lower weight.
function expand(index, word) {
  const terms = [[word, 1]];
  if (word.length < 4) return terms;
  for (const t of index.df.keys()) {
    if (t !== word && t.length >= 4 && (t.startsWith(word) || word.startsWith(t)) && Math.abs(t.length - word.length) <= 4) terms.push([t, 0.7]);
  }
  return terms;
}

function search(index, query, k = 12) {
  const q = [...new Set(tokenize(query))].map((w) => expand(index, w));
  const scored = index.docs.map((d) => {
    let s = 0;
    for (const variants of q) {
      let best = 0;
      for (const [t, weight] of variants) {
        const f = d.tf.get(t);
        if (!f) continue;
        const idf = Math.log(1 + (index.n - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
        best = Math.max(best, (weight * idf * f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.len / index.avg))));
      }
      s += best;
    }
    return { d, s };
  });
  const hits = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.d.chunk);
  // Nothing matched (e.g. "hello"): give the start of the knowledge rather than nothing.
  return hits.length ? hits : index.docs.slice(0, Math.min(k, 6)).map((d) => d.chunk);
}

const formatSource = (src, text) =>
  `<source title="${src.title.replace(/"/g, "'")}"${src.url ? ` url="${src.url}"` : ''}>\n${text}\n</source>`;

// Small knowledge bases go to the model in full (and get prompt-cached); big ones are searched.
function createKnowledge({ fullLimit = 150000 } = {}) {
  const cache = new Map(); // businessId -> { sig, index }
  return {
    full(sources) {
      const total = sources.reduce((a, s) => a + s.content.length, 0);
      return total <= fullLimit ? sources.map((s) => formatSource(s, s.content)).join('\n\n') : null;
    },
    relevant(businessId, sources, query, k = 12) {
      const sig = sources.map((s) => `${s.id}:${s.content.length}`).join(',');
      let entry = cache.get(businessId);
      if (!entry || entry.sig !== sig) {
        entry = { sig, index: buildIndex(sources) };
        cache.set(businessId, entry);
      }
      return search(entry.index, query, k).map((c) => formatSource(c.source, c.text)).join('\n\n');
    },
  };
}

module.exports = {
  htmlToText, extractLinks, crawlSite, safeFetch, assertPublicUrl, isPrivateIp,
  classifyFile, fileToText, officeToText, unzip, tokenize, buildIndex, search, createKnowledge, chunkSource,
};
