// Voicebot: a voice + chat assistant any website can add with one script tag.
//   /admin  - platform admin: onboard businesses and create their logins
//   /app    - business owner panel: knowledge, training assistant, conversations, leads, settings
//   /widget.js + /api/public/*  - the embeddable assistant used on customers' websites
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDb, DEFAULT_SETTINGS } = require('./lib/db');
const auth = require('./lib/auth');
const kn = require('./lib/knowledge');
const { createAI } = require('./lib/ai');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};
const MAX_FILE = 20 * 1024 * 1024;

const httpError = (status, message) => Object.assign(new Error(message), { status });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(httpError(413, 'That upload is too large.'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(httpError(400, 'Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const redirect = (res, to) => { res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' }); res.end(); };

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// Only plain http(s) addresses; anything else (e.g. javascript:) becomes empty.
function cleanWebsite(v) {
  let w = str(v, 300);
  if (!w) return '';
  if (!/^https?:\/\//i.test(w)) w = `https://${w}`;
  try {
    const u = new URL(w);
    const ok = /^https?:$/.test(u.protocol) && (u.hostname.includes('.') || u.hostname === 'localhost');
    return ok ? u.toString().replace(/\/$/, '') : '';
  } catch {
    return '';
  }
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function cleanSettings(input) {
  const s = {};
  if ('botName' in input) s.botName = str(input.botName, 60) || DEFAULT_SETTINGS.botName;
  if ('greeting' in input) s.greeting = str(input.greeting, 500);
  if ('color' in input && /^#[0-9a-f]{6}$/i.test(input.color)) s.color = input.color;
  if ('position' in input) s.position = input.position === 'left' ? 'left' : 'right';
  if ('language' in input) s.language = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(input.language) ? input.language : 'en-IN';
  if ('voiceReplies' in input) s.voiceReplies = Boolean(input.voiceReplies);
  if ('voiceName' in input) s.voiceName = str(input.voiceName, 120);
  if ('voiceRate' in input) s.voiceRate = Math.min(1.5, Math.max(0.6, Number(input.voiceRate) || 1));
  if ('instructions' in input) s.instructions = str(input.instructions, 8000);
  if ('collectLeads' in input) s.collectLeads = Boolean(input.collectLeads);
  if ('suggestions' in input && Array.isArray(input.suggestions)) s.suggestions = input.suggestions.map((x) => str(x, 120)).filter(Boolean).slice(0, 4);
  if ('allowedDomains' in input) {
    const list = Array.isArray(input.allowedDomains) ? input.allowedDomains : String(input.allowedDomains || '').split(/[\s,]+/);
    s.allowedDomains = list.map((d) => str(d, 200).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean).slice(0, 20);
  }
  return s;
}

// Runs background jobs (file reading) a few at a time.
function createQueue(concurrency = 2) {
  const waiting = [];
  let running = 0;
  const next = () => {
    while (running < concurrency && waiting.length) {
      const job = waiting.shift();
      running++;
      Promise.resolve().then(job).catch(() => {}).finally(() => { running--; next(); });
    }
  };
  const q = (job) => { waiting.push(job); next(); };
  q.idle = () => new Promise((resolve) => {
    const check = () => (running === 0 && waiting.length === 0 ? resolve() : setTimeout(check, 20));
    check();
  });
  return q;
}

function loadSecret(dataDir) {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(dataDir, '.session-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

function createApp(opts = {}) {
  const dataDir = opts.dataDir || path.join(__dirname, 'data');
  const uploadsDir = path.join(dataDir, 'uploads');
  const db = openDb(opts.dbFile || path.join(dataDir, 'voicebot.db'));
  const sessions = auth.createSessions(opts.secret || loadSecret(dataDir));
  const ai = opts.ai || createAI({
    chatModel: process.env.CHAT_MODEL, chatEffort: process.env.CHAT_EFFORT,
    ownerModel: process.env.OWNER_MODEL, extractModel: process.env.EXTRACT_MODEL,
  });
  const knowledge = kn.createKnowledge({ fullLimit: Number(opts.fullKnowledgeChars || process.env.FULL_KNOWLEDGE_CHARS) || 150000 });
  const allowPrivateUrls = Boolean(opts.allowPrivateUrls);
  const publicUrl = (opts.publicUrl || process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const queue = createQueue(2);
  const crawls = new Map(); // businessId -> { running, pages, url, error, finishedAt }
  const ipLimit = auth.createLimiter(Number(process.env.CHAT_PER_MINUTE) || 20, 60_000);
  const bizLimit = auth.createLimiter(240, 60_000);

  // ---------- admin account ----------
  if (opts.adminEmail && opts.adminPassword) {
    const existing = db.userByEmail(opts.adminEmail);
    if (!existing) db.createUser({ email: opts.adminEmail, name: 'Admin', passwordHash: auth.hashPassword(opts.adminPassword), role: 'admin' });
    else if (existing.role === 'admin' && !auth.checkPassword(opts.adminPassword, existing.password_hash)) {
      db.setPassword(existing.id, auth.hashPassword(opts.adminPassword));
    }
  }

  // ---------- knowledge processing ----------
  const fileOf = (bizId, src) => path.join(uploadsDir, bizId, `${src.id}.${(src.file_name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'}`);

  function processFile(bizId, sourceId) {
    queue(async () => {
      const src = db.source(bizId, sourceId);
      if (!src) return;
      try {
        const buf = fs.readFileSync(fileOf(bizId, src));
        const info = kn.classifyFile(src.file_name, src.mime);
        let text;
        if (info.kind === 'pdf' || info.kind === 'image') {
          const r = await ai.readDocument({ data: buf.toString('base64'), mime: info.mime, kind: info.kind, name: src.file_name });
          db.addUsage(bizId, r.usage);
          text = r.text;
        } else {
          text = kn.fileToText(buf, info);
        }
        if (!text.trim()) throw new Error('No readable text found in this file.');
        db.updateSource(bizId, sourceId, { status: 'ready', error: '', content: text.trim() });
      } catch (err) {
        console.error(`Reading ${src.file_name} failed:`, err.message);
        db.updateSource(bizId, sourceId, { status: 'error', error: err.message.slice(0, 300) });
      }
    });
  }

  function addFile(bizId, file) {
    const name = str(file?.name, 200) || 'file';
    const info = kn.classifyFile(name, str(file?.type, 100));
    if (!info) throw httpError(400, `${name}: this file type isn't supported. Use PDF, images, Word (.docx), PowerPoint (.pptx), text, CSV or HTML.`);
    const buf = Buffer.from(String(file.data || ''), 'base64');
    if (!buf.length) throw httpError(400, `${name} is empty.`);
    if (buf.length > MAX_FILE) throw httpError(413, `${name} is larger than 20 MB.`);
    const src = db.createSource(bizId, { type: 'file', title: name.replace(/\.[^.]+$/, ''), fileName: name, mime: info.mime, status: 'processing' });
    fs.mkdirSync(path.join(uploadsDir, bizId), { recursive: true });
    fs.writeFileSync(fileOf(bizId, src), buf);
    processFile(bizId, src.id);
    return { src, info, buf };
  }

  function startCrawl(bizId, url, maxPages = 30) {
    if (crawls.get(bizId)?.running) throw httpError(409, 'The website is already being read. Please wait for it to finish.');
    const state = { running: true, pages: 0, url, error: '', startedAt: Date.now() };
    crawls.set(bizId, state);
    const job = (async () => {
      try {
        const { pages, errors } = await kn.crawlSite(url, { maxPages, allowPrivate: allowPrivateUrls, onPage: (_, n) => { state.pages = n; } });
        if (!pages.length) throw new Error(errors[0]?.error ? `Couldn't read the website: ${errors[0].error}` : 'No readable pages were found on this website.');
        db.deleteSourcesOfType(bizId, 'website');
        for (const p of pages) db.createSource(bizId, { type: 'website', title: p.title.slice(0, 200), url: p.url, content: p.text });
        state.pages = pages.length;
      } catch (err) {
        state.error = err.message;
      } finally {
        state.running = false;
        state.finishedAt = Date.now();
      }
    })();
    state.done = job;
    return state;
  }

  // Resume files that were still being read when the server stopped.
  for (const b of db.raw.prepare("SELECT business_id, id FROM sources WHERE status = 'processing'").all()) processFile(b.business_id, b.id);

  function knowledgeFor(bizId, query) {
    const sources = db.readySources(bizId);
    const full = knowledge.full(sources);
    return { sources, full, relevant: full ? '' : knowledge.relevant(bizId, sources, query) };
  }

  const baseUrl = (req) => publicUrl || `${req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')}://${req.headers.host}`;
  const embedCode = (req, b) => `<script src="${baseUrl(req)}/widget.js" data-key="${b.bot_key}" async></script>`;

  // ---------- static files ----------
  function serveFile(res, file, headers = {}) {
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', ...headers });
      res.end(data);
    });
  }
  function serveStatic(res, rel) {
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'Forbidden' });
    serveFile(res, file, file.endsWith('.html') ? { 'Cache-Control': 'no-store' } : { 'Cache-Control': 'public, max-age=300' });
  }

  // ---------- public widget API ----------
  function cors(req, b) {
    const origin = req.headers.origin;
    if (!origin) return { ok: true, headers: {} };
    let host = '';
    try { host = new URL(origin).hostname.toLowerCase(); } catch { return { ok: false, headers: {} }; }
    const own = (req.headers.host || '').split(':')[0].toLowerCase();
    const allowed = !b || !b.settings.allowedDomains.length || host === own ||
      b.settings.allowedDomains.some((d) => host === d || host.endsWith(`.${d}`) || host === d.replace(/^www\./, '') || `www.${host}` === d);
    return { ok: allowed, headers: allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {} };
  }

  const publicConfig = (b) => ({
    name: b.name,
    botName: b.settings.botName,
    greeting: b.settings.greeting,
    color: b.settings.color,
    position: b.settings.position,
    language: b.settings.language,
    voiceReplies: b.settings.voiceReplies,
    voiceName: b.settings.voiceName,
    voiceRate: b.settings.voiceRate,
    suggestions: b.settings.suggestions,
  });

  async function publicChat(req, res) {
    const body = await readBody(req, 64 * 1024);
    const b = db.businessByKey(str(body.key, 100));
    const c = cors(req, b);
    if (!b || b.status !== 'active') return send(res, 404, { error: 'This assistant is not available.' }, c.headers);
    if (!c.ok) return send(res, 403, { error: 'This website is not allowed to use this assistant.' }, c.headers);
    const message = str(body.message, 2000);
    if (!message) return send(res, 400, { error: 'Message is empty.' }, c.headers);
    if (!ipLimit(auth.clientIp(req)) || !bizLimit(b.id)) return send(res, 429, { error: "You're sending messages too quickly. Please wait a moment." }, c.headers);

    let conv = body.conversationId ? db.conversation(b.id, str(body.conversationId, 100)) : null;
    const page = body.page && typeof body.page === 'object' ? { url: str(body.page.url, 500), title: str(body.page.title, 300), text: str(body.page.text, 6000) } : null;
    if (!conv) conv = db.createConversation(b.id, { visitorId: str(body.visitorId, 100), pageUrl: page?.url || '' });
    const via = body.via === 'voice' ? 'voice' : 'text';
    const history = db.messages(conv.id, 20).map((m) => ({ role: m.role, content: m.content }));
    while (history.length && history[0].role !== 'user') history.shift();
    db.addMessage(conv.id, 'user', message, via);

    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', ...c.headers });
    const emit = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    emit({ type: 'start', conversationId: conv.id });

    if (db.usage(b.id).messages >= b.monthly_limit) {
      const text = `Sorry, I can't chat right now. Please contact ${b.name} directly${b.website ? ` through ${b.website}` : ''}.`;
      db.addMessage(conv.id, 'assistant', text);
      emit({ type: 'delta', text });
      emit({ type: 'done', text });
      return res.end();
    }

    let closed = false;
    res.on('close', () => { closed = true; });
    try {
      const k = knowledgeFor(b.id, [...history.slice(-2).map((m) => m.content), message].join(' '));
      const r = await ai.visitorReply({
        business: b, history, message, via, page,
        fullKnowledge: k.full, relevantKnowledge: k.relevant,
        onText: (t) => !closed && emit({ type: 'delta', text: t }),
        onReset: () => !closed && emit({ type: 'reset' }),
        saveLead: (lead) => db.createLead(b.id, { conversationId: conv.id, ...lead }),
      });
      db.addMessage(conv.id, 'assistant', r.text || '…');
      db.addUsage(b.id, { messages: 1, ...r.usage });
      if (!closed) emit({ type: 'done', text: r.text });
    } catch (err) {
      console.error('Chat failed:', err.message);
      if (!closed) emit({ type: 'error', error: 'Sorry, something went wrong. Please try again.' });
    }
    res.end();
  }

  // ---------- owner assistant ----------
  async function assistantTurn(b, body) {
    const text = str(body.text, 20000);
    const files = Array.isArray(body.files) ? body.files.slice(0, 10) : [];
    if (!text && !files.length) throw httpError(400, 'Type a message or attach a file.');

    const added = files.map((f) => addFile(b.id, f));
    const current = [];
    for (const { src, info, buf } of added) {
      if (info.kind === 'image') current.push({ type: 'image', source: { type: 'base64', media_type: info.mime, data: buf.toString('base64') } });
      else if (info.kind === 'pdf') current.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') }, title: src.file_name });
      else {
        let t = '';
        try { t = kn.fileToText(buf, info); } catch (err) { t = `(Could not read: ${err.message})`; }
        current.push({ type: 'text', text: `<file name="${src.file_name}">\n${t}\n</file>` });
      }
    }
    const fileNote = added.length ? `[Attached and added to knowledge: ${added.map((a) => a.src.file_name).join(', ')}]` : '';
    current.push({ type: 'text', text: [fileNote, text].filter(Boolean).join('\n') || 'Please look at these files.' });

    // Earlier turns go back as plain text; only the newest message carries the files themselves.
    const history = [];
    for (const row of db.assistantHistory(b.id, 30)) {
      const content = row.role === 'user'
        ? [row.data.files?.length ? `[Attached and added to knowledge: ${row.data.files.map((f) => f.name).join(', ')}]` : '', row.data.text].filter(Boolean).join('\n')
        : [row.data.text, ...(row.data.actions || []).map((a) => `(${a})`)].join('\n');
      if (content) history.push({ role: row.role, content });
    }
    while (history.length && history[0].role !== 'user') history.shift();

    const k = knowledgeFor(b.id, text);
    const index = db.sources(b.id).map((s) => `- [${s.id}] ${s.type}: ${s.title}${s.url ? ` (${s.url})` : ''} — ${s.status === 'ready' ? `${s.chars} characters` : s.status}`).join('\n');
    const systemContext = [
      `Business: ${b.name}${b.website ? `, website ${b.website}` : ''}.`,
      `Website assistant settings: name "${b.settings.botName}", greeting "${b.settings.greeting}", owner instructions: ${b.settings.instructions ? `"${b.settings.instructions}"` : 'none'}.`,
      `Knowledge sources (id, type, title):\n${index || '(none yet — start by learning about the business)'}`,
      k.full ? `Full knowledge:\n<knowledge>\n${k.full}\n</knowledge>` : `Knowledge most relevant to the owner's message:\n<knowledge>\n${k.relevant}\n</knowledge>`,
    ].join('\n\n');

    const r = await ai.ownerAssistant({
      business: b,
      systemContext,
      messages: [...history, { role: 'user', content: current }],
      tools: {
        save_knowledge: (i) => {
          const title = str(i.title, 200) || 'Note';
          const content = str(i.content, 50000);
          if (!content) throw new Error('content is empty');
          const s = db.createSource(b.id, { type: 'assistant', title, content });
          return { result: `Saved as [${s.id}].`, action: `Saved to knowledge: ${title}` };
        },
        update_knowledge: (i) => {
          const s = db.source(b.id, str(i.source_id, 100));
          if (!s || !['assistant', 'text'].includes(s.type)) throw new Error('Only notes (type "text" or "assistant") can be updated.');
          const content = str(i.content, 50000);
          if (!content) throw new Error('content is empty');
          db.updateSource(b.id, s.id, { content });
          return { result: 'Updated.', action: `Updated knowledge: ${s.title}` };
        },
        update_bot_settings: (i) => {
          const s = cleanSettings(i);
          if (!Object.keys(s).length) throw new Error('No settings given.');
          db.updateBusiness(b.id, { settings: s });
          return { result: 'Settings updated.', action: `Updated assistant settings: ${Object.keys(s).join(', ')}` };
        },
        get_visitor_insights: () => {
          const st = db.stats(b.id);
          const qs = db.recentVisitorQuestions(b.id, 60).map((m) => `- ${new Date(m.created_at).toISOString().slice(0, 10)}: ${m.content.slice(0, 300)}`);
          return {
            result: `Conversations: ${st.conversations} total, ${st.conversations30} in the last 30 days (${st.voiceConversations30} used voice). Leads: ${st.leads} total, ${st.newLeads} not yet contacted.\nRecent visitor messages (newest first):\n${qs.join('\n') || '(none yet)'}`,
          };
        },
      },
    });
    db.addUsage(b.id, r.usage);
    const userData = { text, files: added.map((a) => ({ name: a.src.file_name, sourceId: a.src.id })) };
    db.addAssistantMessage(b.id, 'user', userData);
    db.addAssistantMessage(b.id, 'assistant', { text: r.text, actions: r.actions });
    return { user: userData, assistant: { text: r.text, actions: r.actions } };
  }

  // ---------- routes ----------
  async function route(req, res) {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    const m = req.method;

    if (p === '/healthz') return send(res, 200, { ok: true });
    // Public: the widget and its API (used cross-origin from customers' websites).
    if (p === '/widget.js') return serveFile(res, path.join(PUBLIC_DIR, 'widget.js'), { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' });
    if (p.startsWith('/api/public/')) {
      if (m === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': req.headers.origin || '*', 'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin',
        });
        return res.end();
      }
      const keyMatch = p.match(/^\/api\/public\/bot\/([\w-]+)$/);
      if (keyMatch && m === 'GET') {
        const b = db.businessByKey(keyMatch[1]);
        const c = cors(req, b);
        if (!b || b.status !== 'active') return send(res, 404, { error: 'This assistant is not available.' }, c.headers);
        if (!c.ok) return send(res, 403, { error: 'This website is not allowed to use this assistant.' }, c.headers);
        return send(res, 200, publicConfig(b), c.headers);
      }
      if (p === '/api/public/chat' && m === 'POST') return publicChat(req, res);
      return send(res, 404, { error: 'Not found' });
    }

    // A shareable demo page that shows a business's assistant on a blank page.
    const demo = p.match(/^\/demo\/([\w-]+)$/);
    if (demo && m === 'GET') {
      const b = db.businessByKey(demo[1]);
      if (!b) return send(res, 404, { error: 'Not found' });
      const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.name)} — assistant demo</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f5f5f7;color:#1d1d1f;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px;box-sizing:border-box}h1{margin:0 0 8px}p{color:#555;max-width:520px}</style></head>
<body><main><h1>${esc(b.name)}</h1><p>This is a preview of the assistant for ${esc(b.name)}. Tap the button in the corner to chat by typing or by voice.</p></main>
<script src="/widget.js" data-key="${esc(b.bot_key)}" data-open="1" async></script></body></html>`);
    }

    if (m !== 'GET' && m !== 'HEAD' && !sameOrigin(req)) return send(res, 403, { error: 'Forbidden' });

    if (p === '/api/login' && m === 'POST') {
      const ip = auth.clientIp(req);
      if (sessions.blocked(ip)) return send(res, 429, { error: 'Too many attempts. Please wait 15 minutes and try again.' });
      const body = await readBody(req, 16 * 1024);
      const user = db.userByEmail(str(body.email, 200));
      const ok = auth.checkPassword(String(body.password || ''), user?.password_hash || 'scrypt$AAAA$AAAA');
      if (!user || !ok) {
        sessions.failed(ip);
        return send(res, 401, { error: 'Incorrect email or password.' });
      }
      if (user.role === 'owner' && db.business(user.business_id)?.status === 'suspended') return send(res, 403, { error: 'This account is suspended. Please contact support.' });
      sessions.succeeded(ip);
      return send(res, 200, { role: user.role, redirect: user.role === 'admin' ? '/admin' : '/app' }, { 'Set-Cookie': sessions.issue(req, user, Boolean(body.remember)) });
    }
    if (p === '/api/logout' && m === 'POST') return send(res, 204, undefined, { 'Set-Cookie': sessions.clear(req) });

    const user = sessions.read(req, db.userById);
    const publicPage = ['/login', '/styles.css', '/login.js', '/common.js', '/favicon.svg'].includes(p);
    if (!user && !publicPage) {
      if (p.startsWith('/api/')) return send(res, 401, { error: 'Please sign in' });
      return redirect(res, '/login' + (p === '/' ? '' : `?next=${encodeURIComponent(p + url.search)}`));
    }

    if (!p.startsWith('/api/')) {
      if (m !== 'GET' && m !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
      if (p === '/') return redirect(res, user.role === 'admin' ? '/admin' : '/app');
      if (p === '/login') return user ? redirect(res, user.role === 'admin' ? '/admin' : '/app') : serveStatic(res, 'login.html');
      if (p === '/admin') return user.role === 'admin' ? serveStatic(res, 'admin.html') : redirect(res, '/app');
      if (p === '/app') return serveStatic(res, 'app.html');
      if (p.endsWith('.html')) return send(res, 404, { error: 'Not found' });
      return serveStatic(res, p.slice(1));
    }

    if (p === '/api/me' && m === 'GET') {
      const b = user.business_id ? db.business(user.business_id) : null;
      return send(res, 200, { email: user.email, name: user.name, role: user.role, business: b ? { id: b.id, name: b.name } : null });
    }
    if (p === '/api/me/password' && m === 'POST') {
      const body = await readBody(req, 16 * 1024);
      if (!auth.checkPassword(String(body.current || ''), user.password_hash)) return send(res, 400, { error: 'Your current password is not correct.' });
      if (String(body.next || '').length < 8) return send(res, 400, { error: 'Use at least 8 characters for the new password.' });
      db.setPassword(user.id, auth.hashPassword(String(body.next)));
      return send(res, 200, { ok: true }, { 'Set-Cookie': sessions.issue(req, db.userById(user.id), true) });
    }

    // ----- admin -----
    if (p.startsWith('/api/admin/')) {
      if (user.role !== 'admin') return send(res, 403, { error: 'Admins only' });
      const parts = p.split('/').slice(3); // after /api/admin/
      if (parts[0] === 'businesses' && !parts[1] && m === 'GET') {
        return send(res, 200, db.businesses().map((b) => ({
          id: b.id, name: b.name, website: b.website, status: b.status, monthlyLimit: b.monthly_limit, notes: b.notes,
          createdAt: b.created_at, conversations: b.conversations, leads: b.leads, sources: b.sources,
          messagesThisMonth: b.messages_this_month, ownerEmail: b.owner_email, botKey: b.bot_key, embed: embedCode(req, b),
        })));
      }
      if (parts[0] === 'businesses' && !parts[1] && m === 'POST') {
        const body = await readBody(req, 64 * 1024);
        const name = str(body.name, 120);
        const ownerEmail = str(body.ownerEmail, 200).toLowerCase();
        if (!name) return send(res, 400, { error: 'Business name is required.' });
        if (!isEmail(ownerEmail)) return send(res, 400, { error: 'Enter a valid email for the business owner.' });
        if (db.userByEmail(ownerEmail)) return send(res, 409, { error: 'That email already has an account.' });
        const website = cleanWebsite(body.website);
        const password = str(body.ownerPassword, 200) || auth.randomPassword();
        if (password.length < 8) return send(res, 400, { error: 'Use at least 8 characters for the password.' });
        const b = db.createBusiness({
          name, website, monthlyLimit: Math.max(0, Number(body.monthlyLimit) || 2000), notes: str(body.notes, 2000),
          settings: { botName: str(body.botName, 60) || `${name} Assistant`, greeting: `Hi! Welcome to ${name}. How can I help you today?` },
        });
        db.createUser({ email: ownerEmail, name: str(body.ownerName, 120), passwordHash: auth.hashPassword(password), role: 'owner', businessId: b.id });
        let crawl = null;
        if (website && body.readWebsite !== false) {
          try { crawl = startCrawl(b.id, website, 30).running; } catch (err) { crawl = err.message; }
        }
        return send(res, 201, { id: b.id, ownerEmail, password, embed: embedCode(req, b), readingWebsite: Boolean(crawl) });
      }
      const id = parts[1];
      const b = id && db.business(id);
      if (parts[0] === 'businesses' && !b) return send(res, 404, { error: 'Business not found' });
      if (parts[0] === 'businesses' && !parts[2] && m === 'PUT') {
        const body = await readBody(req, 64 * 1024);
        const fields = {};
        if ('name' in body) fields.name = str(body.name, 120) || b.name;
        if ('website' in body) fields.website = cleanWebsite(body.website);
        if ('status' in body) fields.status = ['active', 'paused', 'suspended'].includes(body.status) ? body.status : b.status;
        if ('monthlyLimit' in body) fields.monthlyLimit = Math.max(0, Number(body.monthlyLimit) || 0);
        if ('notes' in body) fields.notes = str(body.notes, 2000);
        if ('ownerEmail' in body) {
          const email = str(body.ownerEmail, 200).toLowerCase();
          const owner = db.ownersOf(b.id)[0];
          if (!isEmail(email)) return send(res, 400, { error: 'Enter a valid email.' });
          const other = db.userByEmail(email);
          if (other && other.id !== owner?.id) return send(res, 409, { error: 'That email already has an account.' });
          if (owner) db.updateUser(owner.id, { email, name: owner.name });
        }
        db.updateBusiness(b.id, fields);
        return send(res, 200, { ok: true });
      }
      if (parts[0] === 'businesses' && !parts[2] && m === 'DELETE') {
        db.deleteBusiness(b.id);
        fs.rmSync(path.join(uploadsDir, b.id), { recursive: true, force: true });
        return send(res, 204);
      }
      if (parts[0] === 'businesses' && parts[2] === 'reset-password' && m === 'POST') {
        const owner = db.ownersOf(b.id)[0];
        if (!owner) return send(res, 404, { error: 'This business has no owner login.' });
        const password = auth.randomPassword();
        db.setPassword(owner.id, auth.hashPassword(password));
        return send(res, 200, { email: owner.email, password });
      }
      return send(res, 404, { error: 'Not found' });
    }

    // ----- business owner (admins can open any business with ?b=<id>) -----
    if (p === '/api/biz' || p.startsWith('/api/biz/')) {
      const bizId = user.role === 'admin' ? str(url.searchParams.get('b') || req.headers['x-business-id'], 100) : user.business_id;
      const b = bizId && db.business(bizId);
      if (!b) return send(res, user.role === 'admin' ? 400 : 404, { error: user.role === 'admin' ? 'Pick a business from the admin panel first.' : 'Business not found' });
      if (user.role !== 'admin' && b.status === 'suspended') return send(res, 403, { error: 'This account is suspended. Please contact support.' });
      const parts = p.split('/').slice(3);
      const [a0, a1, a2] = parts;

      if (!a0 && m === 'GET') {
        return send(res, 200, {
          id: b.id, name: b.name, website: b.website, status: b.status, monthlyLimit: b.monthly_limit, settings: b.settings,
          botKey: b.bot_key, embed: embedCode(req, b), demoUrl: `${baseUrl(req)}/demo/${b.bot_key}`, stats: db.stats(b.id),
          crawl: crawls.get(b.id) ? { ...crawls.get(b.id), done: undefined } : null, viewer: user.role,
        });
      }
      if (a0 === 'settings' && m === 'PUT') {
        const body = await readBody(req, 64 * 1024);
        const fields = { settings: cleanSettings(body.settings || {}) };
        if ('name' in body && str(body.name, 120)) fields.name = str(body.name, 120);
        if ('website' in body) fields.website = cleanWebsite(body.website);
        db.updateBusiness(b.id, fields);
        return send(res, 200, db.business(b.id).settings);
      }
      if (a0 === 'rotate-key' && m === 'POST') {
        const nb = db.rotateKey(b.id);
        return send(res, 200, { botKey: nb.bot_key, embed: embedCode(req, nb) });
      }

      // knowledge
      if (a0 === 'sources' && !a1 && m === 'GET') {
        const c = crawls.get(b.id);
        return send(res, 200, { sources: db.sources(b.id), crawl: c ? { ...c, done: undefined } : null });
      }
      if (a0 === 'sources' && a1 === 'text' && m === 'POST') {
        const body = await readBody(req, 512 * 1024);
        const content = str(body.content, 200000);
        if (!content) return send(res, 400, { error: 'Write something first.' });
        return send(res, 201, db.createSource(b.id, { type: 'text', title: str(body.title, 200) || 'Note', content }));
      }
      if (a0 === 'sources' && a1 === 'files' && m === 'POST') {
        const body = await readBody(req, 30 * 1024 * 1024);
        const files = Array.isArray(body.files) ? body.files : [];
        if (!files.length) return send(res, 400, { error: 'Choose a file to upload.' });
        return send(res, 201, files.map((f) => addFile(b.id, f).src));
      }
      if (a0 === 'sources' && a1 === 'website' && m === 'POST') {
        const body = await readBody(req, 16 * 1024);
        const target = str(body.url, 500) || b.website;
        if (!target) return send(res, 400, { error: 'Enter the website address.' });
        try { await kn.assertPublicUrl(/^https?:\/\//i.test(target) ? target : `https://${target}`, allowPrivateUrls); } catch (err) { return send(res, 400, { error: err.message }); }
        const state = startCrawl(b.id, target, Math.min(100, Math.max(1, Number(body.maxPages) || 30)));
        if (!b.website) db.updateBusiness(b.id, { website: cleanWebsite(target) });
        return send(res, 202, { ...state, done: undefined });
      }
      if (a0 === 'sources' && a1) {
        const s = db.source(b.id, a1);
        if (!s) return send(res, 404, { error: 'Not found' });
        if (!a2 && m === 'GET') return send(res, 200, s);
        if (a2 === 'file' && m === 'GET') {
          if (!s.file_name) return send(res, 404, { error: 'No file' });
          return serveFile(res, fileOf(b.id, s), { 'Content-Disposition': `inline; filename="${s.file_name.replace(/[^\w.\- ]/g, '_')}"`, 'Cache-Control': 'private, no-store' });
        }
        if (a2 === 'retry' && m === 'POST' && s.file_name) {
          db.updateSource(b.id, s.id, { status: 'processing', error: '' });
          processFile(b.id, s.id);
          return send(res, 200, { ok: true });
        }
        if (!a2 && m === 'PUT') {
          const body = await readBody(req, 512 * 1024);
          return send(res, 200, db.updateSource(b.id, s.id, {
            title: str(body.title, 200) || s.title,
            content: 'content' in body ? str(body.content, 200000) : s.content,
            status: 'content' in body && str(body.content, 10) ? 'ready' : s.status,
          }));
        }
        if (!a2 && m === 'DELETE') {
          db.deleteSource(b.id, s.id);
          if (s.file_name) fs.rmSync(fileOf(b.id, s), { force: true });
          return send(res, 204);
        }
      }

      // conversations
      if (a0 === 'conversations' && !a1 && m === 'GET') {
        return send(res, 200, db.conversations(b.id, {
          search: str(url.searchParams.get('search'), 200), offset: Number(url.searchParams.get('offset')) || 0, limit: 50,
        }));
      }
      if (a0 === 'conversations' && a1) {
        const c = db.conversation(b.id, a1);
        if (!c) return send(res, 404, { error: 'Not found' });
        if (m === 'GET') {
          const lead = db.raw.prepare('SELECT * FROM leads WHERE conversation_id = ?').get(c.id) || null;
          return send(res, 200, { ...c, messages: db.messages(c.id, 1000), lead });
        }
        if (m === 'DELETE') return db.deleteConversation(b.id, c.id), send(res, 204);
      }

      // leads
      if (a0 === 'leads' && !a1 && m === 'GET') return send(res, 200, db.leads(b.id));
      if (a0 === 'leads.csv' && m === 'GET') {
        const rows = [['Date', 'Name', 'Phone', 'Email', 'Note', 'Status'], ...db.leads(b.id).map((l) => [new Date(l.created_at).toISOString(), l.name, l.phone, l.email, l.note, l.status])];
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"', 'Cache-Control': 'no-store' });
        return res.end(rows.map((r) => r.map(csvCell).join(',')).join('\n'));
      }
      if (a0 === 'leads' && a1 && m === 'PUT') {
        const body = await readBody(req, 16 * 1024);
        const status = ['new', 'contacted', 'won', 'lost'].includes(body.status) ? body.status : 'new';
        return db.updateLead(b.id, a1, status) ? send(res, 200, { ok: true }) : send(res, 404, { error: 'Not found' });
      }
      if (a0 === 'leads' && a1 && m === 'DELETE') return db.deleteLead(b.id, a1) ? send(res, 204) : send(res, 404, { error: 'Not found' });

      // owner's assistant
      if (a0 === 'assistant' && m === 'GET') return send(res, 200, db.assistantHistory(b.id, 200).map((r) => ({ role: r.role, ...r.data, createdAt: r.created_at })));
      if (a0 === 'assistant' && m === 'DELETE') return db.clearAssistant(b.id), send(res, 204);
      if (a0 === 'assistant' && m === 'POST') {
        const body = await readBody(req, 30 * 1024 * 1024);
        try {
          return send(res, 200, await assistantTurn(b, body));
        } catch (err) {
          if (err.status) throw err;
          console.error('Assistant failed:', err.message);
          return send(res, 502, { error: 'The assistant could not answer right now. Please try again.' });
        }
      }
      return send(res, 404, { error: 'Not found' });
    }

    return send(res, 404, { error: 'Not found' });
  }

  const server = http.createServer((req, res) => {
    route(req, res).catch((err) => {
      if (!err.status) console.error(err);
      if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong.' });
      else res.end();
    });
  });
  server.on('close', () => db.close());
  return { server, db, queue, crawls };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example) to create the admin login.');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) console.warn('Warning: ANTHROPIC_API_KEY is not set, so the assistants cannot answer.');
  const { server } = createApp({
    dataDir: process.env.DATA_DIR || path.join(__dirname, 'data'),
    adminEmail, adminPassword,
    allowPrivateUrls: process.env.ALLOW_PRIVATE_URLS === '1',
  });
  server.listen(port, () => console.log(`Voicebot running at http://localhost:${port} (admin: ${adminEmail})`));
}

module.exports = { createApp, cleanSettings, cleanWebsite };
