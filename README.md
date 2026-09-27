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

The browser asks you to sign in. The default login is:

- **Email:** `bhavansharora21@gmail.com`
- **Password:** `Kanha@26`

To use a different login without editing the code, set `PANEL_USER` and `PANEL_PASSWORD`.

Data is saved to `data/db.json`. Back up this file, or use Settings → Download backup.

| Environment variable | Purpose |
|---|---|
| `PORT` | Port to listen on (default `3000`) |
| `DATA_FILE` | Where to store data (default `data/db.json`) |
| `PANEL_USER` | Login email (default `bhavansharora21@gmail.com`) |
| `PANEL_PASSWORD` | Login password (default `Kanha@26`) |

To use it from your phone, run it on a computer or server on the same network and open `http://<computer-ip>:3000`. If it's reachable from the internet, use HTTPS (for example behind a hosting provider or reverse proxy), because basic auth sends the login with every request.

### Deploying on the shared VPS

This app runs as its own Docker container on the same VPS as the CRM and
Leads Finder, sharing the CRM's Caddy instance for HTTPS (same pattern as
those two, see their own repos for the fuller writeup).

```bash
cd /opt/kanhas-kitchen
cp .env.example .env
nano .env   # set a real PANEL_PASSWORD -- the README/code default is public
docker compose up -d --build
docker network connect crm_default kanhas-kitchen-app-1  # first deploy only
```

Then add a block to `/opt/crm/Caddyfile` (reload with `docker compose
restart caddy` in `/opt/crm`):

```
kanha.codebunny.net {
    reverse_proxy kanhas-kitchen-app-1:3000
}
```

Data persists in the `kanha-data` Docker volume (`/app/data/db.json` inside
the container) across restarts and rebuilds.

### Without a server

The `public/` folder also works on its own, for example on GitHub Pages or opened from a static host. In that case data is saved **only in that browser** (localStorage), so download a backup regularly from Settings. The login only works when running `npm start`: a static host has no server to check it.

## Development

```bash
npm test             # API tests (node:test)
```

- `server.js`: a dependency-free HTTP server and JSON REST API (`/api/state`, `/api/{orders|menu|societies}[/:id]`, `/api/import`)
- `public/`: the single-page app (plain HTML/CSS/JS, no build step)
- `public/defaults.js`: the default societies, shared by the server and the browser
