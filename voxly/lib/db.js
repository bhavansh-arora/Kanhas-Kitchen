// SQLite storage (Node's built-in node:sqlite, no native modules to build).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  bot_key TEXT NOT NULL UNIQUE,
  settings TEXT NOT NULL DEFAULT '{}',
  monthly_limit INTEGER NOT NULL DEFAULT 2000,
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  mime TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ready',
  error TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sources_biz ON sources(business_id, created_at);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  used_voice INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS conv_biz ON conversations(business_id, last_at);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  via TEXT NOT NULL DEFAULT 'text',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS msg_conv ON messages(conversation_id, id);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_biz ON leads(business_id, created_at);
CREATE TABLE IF NOT EXISTS assistant_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS amsg_biz ON assistant_messages(business_id, id);
CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  business TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS usage (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, month)
);
`;

const DEFAULT_SETTINGS = {
  botName: 'Assistant',
  greeting: 'Hi! How can I help you today?',
  color: '#5b4cf0',
  position: 'right',
  language: 'en-IN',
  voiceReplies: true,
  voiceName: '',
  voiceRate: 1,
  instructions: '',
  collectLeads: true,
  suggestions: [],
  allowedDomains: [],
};

const now = () => Date.now();
const uid = () => crypto.randomUUID();
const month = (t = Date.now()) => new Date(t).toISOString().slice(0, 7);

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  // Columns added after the first release.
  const cols = db.prepare('PRAGMA table_info(businesses)').all().map((c) => c.name);
  if (!cols.includes('plan')) db.exec("ALTER TABLE businesses ADD COLUMN plan TEXT NOT NULL DEFAULT 'starter'");

  const q = (sql) => db.prepare(sql);
  const parseBiz = (b) => b && { ...b, settings: { ...DEFAULT_SETTINGS, ...JSON.parse(b.settings || '{}') } };

  return {
    raw: db,
    close: () => db.close(),

    // ---------- users ----------
    userByEmail: (email) => q('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase()),
    userById: (id) => q('SELECT * FROM users WHERE id = ?').get(id),
    createUser({ email, name = '', passwordHash, role, businessId = null }) {
      const id = uid();
      q('INSERT INTO users (id, email, name, password_hash, role, business_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, String(email).trim().toLowerCase(), name, passwordHash, role, businessId, now(),
      );
      return this.userById(id);
    },
    setPassword: (id, passwordHash) => q('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id),
    updateUser: (id, { email, name }) =>
      q('UPDATE users SET email = ?, name = ? WHERE id = ?').run(String(email).trim().toLowerCase(), name, id),
    ownersOf: (businessId) => q("SELECT id, email, name, created_at FROM users WHERE business_id = ? AND role = 'owner'").all(businessId),

    // ---------- businesses ----------
    createBusiness({ name, website = '', monthlyLimit = 1000, notes = '', settings = {}, plan = 'starter' }) {
      const id = uid();
      const key = 'vx_' + crypto.randomBytes(12).toString('base64url');
      q('INSERT INTO businesses (id, name, website, bot_key, settings, monthly_limit, notes, plan, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, name, website, key, JSON.stringify(settings), monthlyLimit, notes, plan, now(),
      );
      return this.business(id);
    },
    business: (id) => parseBiz(q('SELECT * FROM businesses WHERE id = ?').get(id)),
    businessByKey: (key) => parseBiz(q('SELECT * FROM businesses WHERE bot_key = ?').get(String(key))),
    businesses() {
      const m = month();
      return q(`SELECT b.*,
          (SELECT COUNT(*) FROM conversations c WHERE c.business_id = b.id) AS conversations,
          (SELECT COUNT(*) FROM leads l WHERE l.business_id = b.id) AS leads,
          (SELECT COUNT(*) FROM sources s WHERE s.business_id = b.id) AS sources,
          COALESCE((SELECT messages FROM usage u WHERE u.business_id = b.id AND u.month = ?), 0) AS messages_this_month,
          (SELECT email FROM users WHERE business_id = b.id AND role = 'owner' LIMIT 1) AS owner_email
        FROM businesses b ORDER BY b.created_at DESC`).all(m).map(parseBiz);
    },
    updateBusiness(id, fields) {
      const b = this.business(id);
      if (!b) return null;
      const next = {
        name: fields.name ?? b.name,
        website: fields.website ?? b.website,
        status: fields.status ?? b.status,
        monthly_limit: fields.monthlyLimit ?? b.monthly_limit,
        notes: fields.notes ?? b.notes,
        plan: fields.plan ?? b.plan,
        settings: JSON.stringify(fields.settings ? { ...b.settings, ...fields.settings } : b.settings),
      };
      q('UPDATE businesses SET name = ?, website = ?, status = ?, monthly_limit = ?, notes = ?, plan = ?, settings = ? WHERE id = ?').run(
        next.name, next.website, next.status, next.monthly_limit, next.notes, next.plan, next.settings, id,
      );
      return this.business(id);
    },
    rotateKey(id) {
      q('UPDATE businesses SET bot_key = ? WHERE id = ?').run('vx_' + crypto.randomBytes(12).toString('base64url'), id);
      return this.business(id);
    },
    deleteBusiness: (id) => q('DELETE FROM businesses WHERE id = ?').run(id).changes > 0,

    // ---------- knowledge sources ----------
    createSource(businessId, { type, title = '', url = '', fileName = '', mime = '', status = 'ready', content = '' }) {
      const id = uid();
      const t = now();
      q('INSERT INTO sources (id, business_id, type, title, url, file_name, mime, status, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, businessId, type, title, url, fileName, mime, status, content, t, t,
      );
      return this.source(businessId, id);
    },
    source: (businessId, id) => q('SELECT * FROM sources WHERE business_id = ? AND id = ?').get(businessId, id),
    sources: (businessId) =>
      q(`SELECT id, type, title, url, file_name, mime, status, error, length(content) AS chars, substr(content, 1, 240) AS preview,
          created_at, updated_at FROM sources WHERE business_id = ? ORDER BY created_at DESC`).all(businessId),
    readySources: (businessId) =>
      q("SELECT id, type, title, url, content FROM sources WHERE business_id = ? AND status = 'ready' AND content != '' ORDER BY created_at, id").all(businessId),
    updateSource(businessId, id, fields) {
      const s = this.source(businessId, id);
      if (!s) return null;
      const n = { ...s, ...fields };
      q('UPDATE sources SET title = ?, url = ?, status = ?, error = ?, content = ?, updated_at = ? WHERE id = ?').run(
        n.title, n.url, n.status, n.error, n.content, now(), id,
      );
      return this.source(businessId, id);
    },
    deleteSource: (businessId, id) => q('DELETE FROM sources WHERE business_id = ? AND id = ?').run(businessId, id).changes > 0,
    deleteSourcesOfType: (businessId, type) => q('DELETE FROM sources WHERE business_id = ? AND type = ?').run(businessId, type).changes,

    // ---------- visitor conversations ----------
    conversation: (businessId, id) => q('SELECT * FROM conversations WHERE business_id = ? AND id = ?').get(businessId, id),
    createConversation(businessId, { visitorId = '', pageUrl = '' }) {
      const id = uid();
      const t = now();
      q('INSERT INTO conversations (id, business_id, visitor_id, page_url, started_at, last_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, businessId, visitorId, pageUrl, t, t,
      );
      return this.conversation(businessId, id);
    },
    addMessage(conversationId, role, content, via = 'text') {
      const t = now();
      q('INSERT INTO messages (conversation_id, role, content, via, created_at) VALUES (?, ?, ?, ?, ?)').run(conversationId, role, content, via, t);
      q(`UPDATE conversations SET last_at = ?, message_count = message_count + 1,
           used_voice = CASE WHEN ? = 'voice' THEN 1 ELSE used_voice END WHERE id = ?`).run(t, via, conversationId);
    },
    messages: (conversationId, limit = 200) =>
      q('SELECT role, content, via, created_at FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id').all(conversationId, limit),
    conversations(businessId, { limit = 50, offset = 0, search = '' } = {}) {
      const like = `%${search}%`;
      return q(`SELECT c.*,
          (SELECT content FROM messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY id LIMIT 1) AS first_message,
          (SELECT COUNT(*) FROM leads l WHERE l.conversation_id = c.id) AS lead_count
        FROM conversations c WHERE c.business_id = ?
          AND (? = '' OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.content LIKE ?))
        ORDER BY c.last_at DESC LIMIT ? OFFSET ?`).all(businessId, search, like, limit, offset);
    },
    deleteConversation: (businessId, id) => q('DELETE FROM conversations WHERE business_id = ? AND id = ?').run(businessId, id).changes > 0,
    recentVisitorQuestions: (businessId, limit = 60) =>
      q(`SELECT m.content, m.created_at FROM messages m JOIN conversations c ON c.id = m.conversation_id
         WHERE c.business_id = ? AND m.role = 'user' ORDER BY m.id DESC LIMIT ?`).all(businessId, limit),

    // ---------- leads ----------
    createLead(businessId, { conversationId = '', name = '', phone = '', email = '', note = '' }) {
      const existing = conversationId
        ? q('SELECT * FROM leads WHERE business_id = ? AND conversation_id = ?').get(businessId, conversationId)
        : null;
      if (existing) {
        // One lead per conversation: fill in whatever new details the visitor gave.
        q('UPDATE leads SET name = ?, phone = ?, email = ?, note = ? WHERE id = ?').run(
          name || existing.name, phone || existing.phone, email || existing.email,
          [existing.note, note].filter(Boolean).join('\n'), existing.id,
        );
        return q('SELECT * FROM leads WHERE id = ?').get(existing.id);
      }
      const id = uid();
      q('INSERT INTO leads (id, business_id, conversation_id, name, phone, email, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, businessId, conversationId, name, phone, email, note, now(),
      );
      return q('SELECT * FROM leads WHERE id = ?').get(id);
    },
    leads: (businessId) => q('SELECT * FROM leads WHERE business_id = ? ORDER BY created_at DESC').all(businessId),
    updateLead: (businessId, id, status) => q('UPDATE leads SET status = ? WHERE business_id = ? AND id = ?').run(status, businessId, id).changes > 0,
    deleteLead: (businessId, id) => q('DELETE FROM leads WHERE business_id = ? AND id = ?').run(businessId, id).changes > 0,

    // ---------- owner assistant chat ----------
    assistantHistory: (businessId, limit = 40) =>
      q('SELECT id, role, data, created_at FROM (SELECT * FROM assistant_messages WHERE business_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id')
        .all(businessId, limit)
        .map((r) => ({ ...r, data: JSON.parse(r.data) })),
    addAssistantMessage: (businessId, role, data) =>
      q('INSERT INTO assistant_messages (business_id, role, data, created_at) VALUES (?, ?, ?, ?)').run(businessId, role, JSON.stringify(data), now()),
    clearAssistant: (businessId) => q('DELETE FROM assistant_messages WHERE business_id = ?').run(businessId),

    // ---------- demo requests from the landing page ----------
    createInquiry(f) {
      const id = uid();
      q('INSERT INTO inquiries (id, name, business, phone, email, website, industry, plan, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, f.name, f.business, f.phone, f.email, f.website, f.industry, f.plan, f.message, now(),
      );
      return q('SELECT * FROM inquiries WHERE id = ?').get(id);
    },
    inquiries: () => q('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500').all(),
    updateInquiry: (id, status) => q('UPDATE inquiries SET status = ? WHERE id = ?').run(status, id).changes > 0,
    deleteInquiry: (id) => q('DELETE FROM inquiries WHERE id = ?').run(id).changes > 0,

    // ---------- usage ----------
    usage: (businessId, m = month()) =>
      q('SELECT * FROM usage WHERE business_id = ? AND month = ?').get(businessId, m) || { messages: 0, input_tokens: 0, output_tokens: 0 },
    addUsage(businessId, { messages = 0, input = 0, output = 0 }) {
      q(`INSERT INTO usage (business_id, month, messages, input_tokens, output_tokens) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(business_id, month) DO UPDATE SET messages = messages + excluded.messages,
           input_tokens = input_tokens + excluded.input_tokens, output_tokens = output_tokens + excluded.output_tokens`).run(
        businessId, month(), messages, input, output,
      );
    },

    stats(businessId) {
      const since = now() - 30 * 24 * 3600 * 1000;
      const one = (sql, ...a) => Object.values(q(sql).get(...a))[0];
      const daily = q(`SELECT strftime('%Y-%m-%d', started_at / 1000, 'unixepoch') AS day, COUNT(*) AS n
          FROM conversations WHERE business_id = ? AND started_at >= ? GROUP BY day ORDER BY day`).all(businessId, since);
      return {
        conversations: one('SELECT COUNT(*) FROM conversations WHERE business_id = ?', businessId),
        conversations30: one('SELECT COUNT(*) FROM conversations WHERE business_id = ? AND started_at >= ?', businessId, since),
        voiceConversations30: one('SELECT COUNT(*) FROM conversations WHERE business_id = ? AND started_at >= ? AND used_voice = 1', businessId, since),
        leads: one('SELECT COUNT(*) FROM leads WHERE business_id = ?', businessId),
        newLeads: one("SELECT COUNT(*) FROM leads WHERE business_id = ? AND status = 'new'", businessId),
        sources: one("SELECT COUNT(*) FROM sources WHERE business_id = ? AND status = 'ready'", businessId),
        knowledgeChars: one("SELECT COALESCE(SUM(length(content)), 0) FROM sources WHERE business_id = ? AND status = 'ready'", businessId),
        usage: this.usage(businessId),
        daily,
      };
    },
  };
}

module.exports = { openDb, DEFAULT_SETTINGS, month };
