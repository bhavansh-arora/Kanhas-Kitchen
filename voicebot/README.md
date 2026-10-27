# Voicebot — a talking assistant for any website

A voice and chat assistant that a business adds to its website with one line of code. Visitors can type or **talk** to it, and it answers out loud about that business: products, prices, timings, policies and anything on its website or in its files. When a visitor wants to order, book or get a call back, it takes their name and number as a lead.

There are three parts:

| Part | Who uses it | Where |
|---|---|---|
| **Admin panel** | You | `/admin` |
| **Business panel** | Each business owner you onboard | `/app` |
| **Website widget** | Visitors on the business's website | `<script src=".../widget.js" data-key="...">` |

## What each part does

**Admin panel (`/admin`)**
- Onboard a business: name, website, owner's email and password (or a generated one), monthly message limit. You get login details and the website script to send them.
- Optionally reads their website straight away, so the assistant already knows the business.
- See every business's usage, chats and leads; open any business's panel; edit, pause or suspend it; reset the owner's password; delete it.

**Business panel (`/app`)**
- **Assistant**: a chat that trains the website assistant. It interviews the owner about the business (one or two questions at a time), reads files and photos they attach, paste or drop in (menus, price lists, brochures), saves what it learns to the knowledge, answers questions about it, can change the greeting and instructions when asked, and reports what visitors ask. The mic button dictates.
- **Knowledge**: read the website (up to 100 pages, following links and sitemap.xml), upload PDFs, images, Word (.docx), PowerPoint (.pptx), text, CSV and HTML files, or write notes and FAQs. Every item can be viewed and edited.
- **Conversations**: every visitor chat, searchable, marked when voice was used.
- **Leads**: name, phone, email and what they want, with a status (new, contacted, won, lost) and CSV download.
- **Bot settings**: name, greeting, suggested questions, colour, position, language, voice and speaking speed (with a preview), reading replies aloud by default, owner instructions, taking leads on or off, and which websites may show the assistant.
- **Install & test**: the script, where to paste it (WordPress, Shopify, Wix, Squarespace, Google Tag Manager), a live preview and a shareable demo page.

**Website widget**
- A chat bubble with a greeting. Visitors type, tap the mic to speak, or tap the phone icon for a hands-free **voice conversation** (listen, answer aloud, listen again; tap to interrupt).
- Replies stream in and are read aloud sentence by sentence as they arrive.
- It also reads the page the visitor is on, so "how much is this one?" works.
- It replies in the visitor's language (English, Hindi, Hinglish and others).
- Runs inside a shadow DOM, so the website's styles can't break it and it can't break the website. Works on phones (full screen). The chat survives moving between pages.
- Voice uses the browser's built-in speech recognition and voices, so it costs nothing extra. Speaking works in Chrome, Edge and Safari (including phones). In Firefox visitors can type and still hear replies.
- JavaScript API for the website: `Voicebot.open()`, `Voicebot.ask("…")`, `Voicebot.talk()`, `Voicebot.close()`.

## How answers work

Answers come from Claude (Anthropic). Each business's knowledge (website pages, file contents, notes) is stored as text. When the knowledge is small (under ~150,000 characters, `FULL_KNOWLEDGE_CHARS`), all of it goes to Claude with each question, and prompt caching keeps that cheap. Larger knowledge is searched, and only the most relevant parts are sent. The assistant is told to answer only from that knowledge and never make up prices, timings or policies. PDFs and images are read once by Claude when uploaded and turned into text.

Usage is counted per business per month. A business over its monthly message limit gets a polite "please contact us directly" message, and no Claude call is made.

## Running it locally

Needs Node.js 22.13 or newer.

```bash
cd voicebot
npm install
cp .env.example .env            # fill in ANTHROPIC_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
set -a; . ./.env; set +a
npm start                       # http://localhost:3000
npm test
```

Data is stored in `data/` (`voicebot.db` SQLite database plus `uploads/`). Back this folder up.

| Environment variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (required for answers) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin login (required). Changing the password here and restarting resets it. |
| `PUBLIC_URL` | Public HTTPS address used in website scripts, e.g. `https://voice.codebunny.net` |
| `CHAT_MODEL` | Model for visitor chat (default `claude-opus-5-5`; `claude-haiku-5-5` is much cheaper and faster) |
| `CHAT_EFFORT` | Thinking effort for visitor chat (default `low`, keeps voice replies quick) |
| `OWNER_MODEL`, `EXTRACT_MODEL` | Models for the owner's assistant and for reading files (default `claude-opus-5-5`) |
| `CHAT_PER_MINUTE` | Visitor messages allowed per minute from one address (default 20) |
| `FULL_KNOWLEDGE_CHARS` | Above this size, knowledge is searched instead of sent in full (default 150000) |
| `DATA_DIR`, `PORT`, `SESSION_SECRET` | Data folder, port, cookie signing key (random and saved by default) |

## Deploying on the shared VPS

Runs as its own Docker container next to the CRM, Leads Finder and Kanha's Kitchen, behind the CRM's Caddy (same pattern as those apps).

```bash
cd /opt/kanhas-kitchen && git pull          # this folder lives inside the Kanha's Kitchen repo
cd voicebot
cp .env.example .env
nano .env        # ANTHROPIC_API_KEY, ADMIN_EMAIL, a strong ADMIN_PASSWORD, PUBLIC_URL
docker compose up -d --build
```

`docker-compose.yml` joins the `crm_default` network itself, so no `docker network connect` is needed. The project is named `voicebot` and so is the service, so the container is `voicebot-voicebot-1` and its network alias is `voicebot`. The alias is deliberately not `app` (the CRM) or `web` (Kanha's Kitchen), because two containers with the same alias on one network make Docker's DNS alternate between them.

Point a DNS record (e.g. `voice.codebunny.net`) at the VPS, then add this to `/opt/crm/Caddyfile` and reload with `docker compose restart caddy` in `/opt/crm`:

```
voice.codebunny.net {
    reverse_proxy voicebot-voicebot-1:3000 {
        flush_interval -1
    }
}
```

`flush_interval -1` makes Caddy pass each word of a reply through immediately, so replies stream (and start speaking) without waiting for the whole answer.

HTTPS is required: browsers only allow the microphone on secure pages, and the customer's website must also be HTTPS for visitors to talk.

Data persists in the `voicebot-data` volume (`/app/data`). To back it up:

```bash
docker run --rm -v voicebot_voicebot-data:/data -v "$PWD":/backup alpine tar czf /backup/voicebot-data.tgz -C /data .
```

Logs: `docker compose logs -f voicebot`. Health check: `GET /healthz`.

## Files

- `server.js`: HTTP server and all routes (admin, business panel, public widget API)
- `lib/db.js`: SQLite storage (Node's built-in `node:sqlite`, no native build)
- `lib/ai.js`: Claude calls: visitor chat (streamed, with lead capture), reading PDFs and images, the owner's training assistant
- `lib/knowledge.js`: website reading (stays on the same site and refuses private network addresses), HTML/Word/PowerPoint to text, knowledge search
- `lib/auth.js`: passwords (scrypt), signed session cookies, rate limits
- `public/widget.js`: the embeddable widget (no dependencies)
- `public/admin.*`, `public/app.*`, `public/login.*`: the panels (plain HTML/CSS/JS, no build step)
