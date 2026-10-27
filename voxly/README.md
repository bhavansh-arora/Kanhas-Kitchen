# Voxly — the front desk that talks

![Voxly](public/brand/voxly-logo.png)

A voice and chat assistant that a business adds to its website with one line of code. Visitors can type or **talk** to it, and it answers out loud about that business: products, prices, timings, policies and anything on its website or in its files. When a visitor wants to order, book or get a call back, it takes their name and number as a lead.

| Part | Who uses it | Where |
|---|---|---|
| **Landing page** | Prospective customers | `/` |
| **Voxly HQ** (admin) | You | `/admin` |
| **Voxly Studio** (business dashboard), with **Coach**, its setup assistant | Each business owner you onboard | `/app` |
| **Voxly widget**, with **Live Talk** hands-free voice | Visitors on the business's website | `<script src=".../widget.js" data-key="...">` |
| **Brand kit** | Anyone designing for Voxly | `/brand` |

## Brand

- **Name:** Voxly (said "VOX-lee"). Capital V in sentences; the logo is lowercase **voxly**. *Vox* is Latin for "voice".
- **Tagline:** The front desk that talks.
- **Logo:** a speech bubble holding a voice wave, in the Voxly gradient. All versions are in `public/brand/` as SVG (wordmark converted to outlines, so it looks the same everywhere) and PNG: full logo for light and dark backgrounds, one-colour versions, the mark, and an app icon.
- **Colours:** Voxly Violet `#5B4CF0`, Orchid `#A855F7`, Pink `#EC4899`, Midnight `#0B0A1F`, Ink `#0F1029`, Mist `#F6F6FB`. Gradient: Violet → Orchid → Pink.
- **Type:** Plus Jakarta Sans (ExtraBold for headlines and the wordmark).
- The brand kit page at `/brand` shows everything with download links, plus naming and tone of voice.

## What each part does

**Landing page (`/`)**
- A full marketing page: hero with an animated example conversation, the problem, voice features, how it works, features, a dashboard preview, use cases by industry, a comparison with contact forms and typical chatbots, pricing with a monthly/yearly switch, FAQ, and a free-trial form.
- **Talk to it now** opens a real voice conversation with your own Voxly assistant (set `LANDING_BOT_KEY`, see below).
- The free-trial form saves requests to **Demo requests** in the admin panel. One click on **Onboard** fills in the new-business form from the request. Optionally each request is also posted to Slack, Discord or n8n (`NOTIFY_WEBHOOK_URL`), and a WhatsApp button appears when `CONTACT_WHATSAPP` is set.
- Built for search and sharing: page title and description, share image (`og.png`), structured data, fast (no frameworks), and it works on phones with a sticky sign-up button.

**Voxly HQ (`/admin`)**
- Demo requests from the landing page, with status and one-click onboarding.
- Onboard a business: name, website, owner's email and password (or a generated one), plan and monthly message limit. You get login details and the website script to send them.
- Optionally reads their website straight away, so the assistant already knows the business.
- See every business's usage, chats and leads; open any business's panel; edit, pause or suspend it; reset the owner's password; delete it.

**Voxly Studio (`/app`)**
- **Coach**: a chat that trains the website assistant. It interviews the owner about the business (one or two questions at a time), reads files and photos they attach, paste or drop in (menus, price lists, brochures), saves what it learns to the knowledge, answers questions about it, can change the greeting and instructions when asked, and reports what visitors ask. The mic button dictates.
- **Knowledge**: read the website (up to 100 pages, following links and sitemap.xml), upload PDFs, images, Word (.docx), PowerPoint (.pptx), text, CSV and HTML files, or write notes and FAQs. Every item can be viewed and edited.
- **Conversations**: every visitor chat, searchable, marked when voice was used.
- **Leads**: name, phone, email and what they want, with a status (new, contacted, won, lost) and CSV download.
- **Bot settings**: name, greeting, suggested questions, colour, position, language, voice and speaking speed (with a preview), reading replies aloud by default, owner instructions, taking leads on or off, and which websites may show the assistant.
- **Install & test**: the script, where to paste it (WordPress, Shopify, Wix, Squarespace, Google Tag Manager), a live preview and a shareable demo page.

**Voxly widget**
- A chat bubble with a greeting. Visitors type, tap the mic to speak, or tap the phone icon for **Live Talk**, a hands-free voice conversation (listen, answer aloud, listen again; tap to interrupt).
- Replies stream in and are read aloud sentence by sentence as they arrive.
- It also reads the page the visitor is on, so "how much is this one?" works.
- It replies in the visitor's language (English, Hindi, Hinglish and others).
- Runs inside a shadow DOM, so the website's styles can't break it and it can't break the website. Works on phones (full screen). The chat survives moving between pages.
- Voice uses the browser's built-in speech recognition and voices, so it costs nothing extra. Speaking works in Chrome, Edge and Safari (including phones). In Firefox visitors can type and still hear replies.
- JavaScript API for the website: `Voxly.open()`, `Voxly.ask("…")`, `Voxly.talk()`, `Voxly.close()`.

## Plans and pricing

Prices are in USD and live in `lib/plans.js` (the landing page shows the same numbers; a test fails if they drift apart).

| Plan | Price | Messages / month | Website pages read | Widget badge |
|---|---|---|---|---|
| Free trial (14 days) | $0 | 300 | 30 | "Powered by Voxly" |
| Starter | $49/mo ($490/yr) | 1,000 | 30 | "Powered by Voxly" |
| Growth | $129/mo ($1,290/yr) | 3,000 | 100 | none |
| Pro | $399/mo ($3,990/yr) | 10,000 | 100 | none |
| Custom | by agreement | set per business | 100 | none |

Picking a plan in the admin panel sets the business's message limit (you can still override it), the most website pages it can read, and whether the widget shows the "Powered by Voxly" link (free marketing from every Starter site). The admin panel also shows monthly revenue at list price for active businesses. Billing itself isn't automated yet: you invoice customers yourself and change their plan here.

**How the prices were set.** With the default model (Claude Opus 5.5 at low effort), a visitor message costs roughly $0.01–0.03, depending on how much knowledge the business has and whether the prompt cache is warm. A fully used plan therefore costs about $10–30 (Starter), $30–90 (Growth) or $100–300 (Pro) in Claude usage. Most businesses use well under their limit. Setting `CHAT_MODEL=claude-haiku-5-5` cuts this cost by about 40× if you want bigger margins.

## How answers work

Answers come from Claude (Anthropic). Each business's knowledge (website pages, file contents, notes) is stored as text. When the knowledge is small (under ~150,000 characters, `FULL_KNOWLEDGE_CHARS`), all of it goes to Claude with each question, and prompt caching keeps that cheap. Larger knowledge is searched, and only the most relevant parts are sent. The assistant is told to answer only from that knowledge and never make up prices, timings or policies. PDFs and images are read once by Claude when uploaded and turned into text.

Usage is counted per business per month. A business over its monthly message limit gets a polite "please contact us directly" message, and no Claude call is made.

## Running it locally

Needs Node.js 22.13 or newer.

```bash
cd voxly
npm install
cp .env.example .env            # fill in ANTHROPIC_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
set -a; . ./.env; set +a
npm start                       # http://localhost:3000
npm test
```

Data is stored in `data/` (`voxly.db` SQLite database plus `uploads/`). Back this folder up.

| Environment variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key (required for answers) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your admin login (required). Changing the password here and restarting resets it. |
| `PUBLIC_URL` | Public HTTPS address used in website scripts, e.g. `https://voxly.codebunny.net` |
| `CHAT_MODEL` | Model for visitor chat (default `claude-opus-5-5`; `claude-haiku-5-5` is much cheaper and faster) |
| `CHAT_EFFORT` | Thinking effort for visitor chat (default `low`, keeps voice replies quick) |
| `OWNER_MODEL`, `EXTRACT_MODEL` | Models for the owner's assistant and for reading files (default `claude-opus-5-5`) |
| `CHAT_PER_MINUTE` | Visitor messages allowed per minute from one address (default 20) |
| `LANDING_BOT_KEY` | Bot key of the business whose assistant runs on the landing page ("Talk to it now") |
| `CONTACT_WHATSAPP` | Your WhatsApp number with country code (e.g. `14155550100`) for the landing page's WhatsApp button |
| `NOTIFY_WEBHOOK_URL` | Optional Slack/Discord/n8n webhook that gets a message for each new demo request |
| `FULL_KNOWLEDGE_CHARS` | Above this size, knowledge is searched instead of sent in full (default 150000) |
| `DATA_DIR`, `PORT`, `SESSION_SECRET` | Data folder, port, cookie signing key (random and saved by default) |

## Deploying on the shared VPS

Runs as its own Docker container next to the CRM, Leads Finder and Kanha's Kitchen, behind the CRM's Caddy (same pattern as those apps).

```bash
cd /opt/kanhas-kitchen && git pull          # this folder lives inside the Kanha's Kitchen repo
cd voxly
cp .env.example .env
nano .env        # ANTHROPIC_API_KEY, ADMIN_EMAIL, a strong ADMIN_PASSWORD, PUBLIC_URL
docker compose up -d --build
```

`docker-compose.yml` joins the `crm_default` network itself, so no `docker network connect` is needed. The project is named `voxly` and so is the service, so the container is `voxly-voxly-1` and its network alias is `voxly`. The alias is deliberately not `app` (the CRM) or `web` (Kanha's Kitchen), because two containers with the same alias on one network make Docker's DNS alternate between them.

Point a DNS record (e.g. `voxly.codebunny.net`) at the VPS, then add this to `/opt/crm/Caddyfile` and reload with `docker compose restart caddy` in `/opt/crm`:

```
voxly.codebunny.net {
    reverse_proxy voxly-voxly-1:3000 {
        flush_interval -1
    }
}
```

`flush_interval -1` makes Caddy pass each word of a reply through immediately, so replies stream (and start speaking) without waiting for the whole answer.

HTTPS is required: browsers only allow the microphone on secure pages, and the customer's website must also be HTTPS for visitors to talk.

Data persists in the `voxly-data` volume (`/app/data`). To back it up:

```bash
docker run --rm -v voxly_voxly-data:/data -v "$PWD":/backup alpine tar czf /backup/voxly-data.tgz -C /data .
```

### Setting up the landing page's live demo

1. In `/admin`, onboard a business called "Voxly" (use your own email as its owner, plan Custom, a generous message limit).
2. Open its panel. Under Knowledge, upload `docs/landing-assistant-knowledge.md` (edit prices or contact details first if they change). Under Bot settings, set the name and greeting (e.g. "Hi! I'm the Voxly assistant. Ask me anything, or tap the phone icon to talk.").
3. Put its bot key (from Install & test, the part after `data-key=`) in `.env` as `LANDING_BOT_KEY`, then `docker compose up -d`.

Leads that this assistant collects appear in that business's Leads page. Form sign-ups appear under Demo requests in `/admin`.

Logs: `docker compose logs -f voxly`. Health check: `GET /healthz`.

## Files

- `server.js`: HTTP server and all routes (admin, business panel, public widget API)
- `lib/db.js`: SQLite storage (Node's built-in `node:sqlite`, no native build)
- `lib/ai.js`: Claude calls: visitor chat (streamed, with lead capture), reading PDFs and images, the owner's training assistant
- `lib/knowledge.js`: website reading (stays on the same site and refuses private network addresses), HTML/Word/PowerPoint to text, knowledge search
- `lib/auth.js`: passwords (scrypt), signed session cookies, rate limits
- `lib/plans.js`: plans, prices and limits
- `public/landing.*`, `public/og.png`: the landing page and its share image
- `docs/landing-assistant-knowledge.md`: knowledge for the landing page's own assistant
- `public/widget.js`: the embeddable widget (no dependencies)
- `public/admin.*`, `public/app.*`, `public/login.*`: the panels (plain HTML/CSS/JS, no build step)
