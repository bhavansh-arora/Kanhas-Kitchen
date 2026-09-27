# Kanha's Kitchen — Orders Panel

A small web panel for logging daily orders, tracking payments and seeing revenue for Kanha's Kitchen.

## Features

- **Dashboard**: today's revenue, this month's revenue compared with last month, money received, pending dues, a month-wise revenue chart for the last 12 months, top products and top houses.
- **Quick Add**: pick a society and then a house.
  - **Vaishnavi Gardenia**: blocks A–E, floors 1–18, flats 1–8 on each floor. Floor 14 shows 1401–1408, and so on.
  - **Pratham** and **PGL Apartments**: type the flat number, or tap a recent house. You can set up blocks and floors for these in Settings to get the same tap-to-pick grid.
  - **Outside order**: customer name, phone and address for anyone outside these apartments.
- **Order form**: tap + / − on menu items and the price fills in from the menu. You can change a price for one order, add an item that isn't on the menu (and save it to the menu), repeat a house's last order, or type the amount manually.
- **Daily Orders**: a day-by-day log with previous/next day buttons, the day's totals, an "items to prepare" count and a filter by society.
- **Payments**: pending dues grouped by house, with "Mark all received" (UPI, Cash, …) and the date. There is also a log of payments received each month, split by payment mode.
- **Analytics** (this month, last month, last 3 months, this year, all time or a custom range):
  - products ranked by quantity sold and by revenue
  - houses ranked by number of orders and by revenue
  - revenue by society
  - month-wise revenue table
- **Menu**: add dishes and edit their prices. Past orders keep the price they were logged at.
- **Settings**: edit societies, download or restore a JSON backup, and export orders as CSV.

## Running it

Needs Node.js 18 or newer. Nothing else to install.

```bash
npm start            # http://localhost:3000
```

Opening the panel takes you to the sign-in page. The default login is:

- **Email:** `bhavansharora21@gmail.com`
- **Password:** `Kanha@26`

To use a different login without editing the code, set `PANEL_USER` and `PANEL_PASSWORD`. "Keep me signed in" lasts 30 days; otherwise you stay signed in until the browser is closed (at most 12 hours). Use **Sign out** in the sidebar to end the session. After 5 wrong passwords, sign-in is paused for 15 minutes.

Data is saved to `data/db.json`. Back up this file, or use Settings → Download backup.

| Environment variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default `3000`) |
| `DATA_FILE` | Where to store data (default `data/db.json`) |
| `PANEL_USER` | Login email (default `bhavansharora21@gmail.com`) |
| `PANEL_PASSWORD` | Login password (default `Kanha@26`) |
| `SESSION_SECRET` | Key for signing session cookies (default: random, saved to `data/.session-secret`) |

To use it from your phone, run it on a computer or server on the same network and open `http://<computer-ip>:3000`. If it's reachable from the internet, use HTTPS (for example behind a hosting provider or reverse proxy), so the password and session cookie are encrypted in transit.

### Without a server

The `public/` folder also works on its own, for example on GitHub Pages or opened from a static host. In that case data is saved **only in that browser** (localStorage), so download a backup regularly from Settings. The login only works when running `npm start`: a static host has no server to check it.

### Logo

Put the logo at `public/logo.png` (a square PNG, ideally with a transparent background). It appears on the sign-in page, in the sidebar and as the home-screen icon on phones. Until then, the built-in icon is used.

## Development

```bash
npm test             # API tests (node:test)
```

- `server.js`: a dependency-free HTTP server and JSON REST API (`/api/state`, `/api/{orders|menu|societies}[/:id]`, `/api/import`)
- `public/`: the single-page app (plain HTML/CSS/JS, no build step)
- `public/defaults.js`: the default societies, shared by the server and the browser
