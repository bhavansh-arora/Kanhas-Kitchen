# Lithium — Power for life

A multi-page marketing site and quote funnel for **Lithium LLC** (Yucaipa, CA): solar, battery backup, panel upgrades and EV charging. Built by Code Bunny as a redesign preview of lisolarenergy.com.

`public/` is the finished site: plain HTML, CSS and JS with no server code. Upload that folder to any static host (Netlify, Vercel, Cloudflare Pages, S3, cPanel).

## Pages

| Page | What it does |
|---|---|
| `index.html` | Home: live WebGL sun hero, instant savings estimator, pinned 6-step process, benefits, testimonials, FAQ |
| `residential.html` | Home solar, battery backup, main panel upgrades, EV charging, why storage matters under NEM 3.0 |
| `commercial.html` | Business solar, backup, electrical upgrades, EV charging, subcontracting for contractors |
| `process.html` | The six steps with typical timing and what the customer does at each one |
| `savings.html` | Full calculator with editable assumptions, 25-year cost chart (hover + table view) |
| `about.html` | Story, values, expertise, equipment partners |
| `quote.html` | 7-step quote funnel: live estimate, autosave and resume, ZIP check, site-visit time request, confirmation with tracking code and calendar file |
| `track.html` | Project tracker: look up a project by code + ZIP. Includes a sample project (`LI-SAMPLE`, ZIP `92399`) |
| `contact.html` | Phone, email, map card, contact form |
| `privacy.html`, `404.html` | Privacy notice and not-found page |

## Run it locally

```bash
cd lithium-solar/public
```

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Editing content

Pages are written in `src/pages/*.html` and share the header, footer and closing call-to-action from `src/partials/`. After editing, rebuild:

```bash
cd lithium-solar
```

```bash
node build.mjs
```

That writes the finished pages into `public/`. CSS, JS, images and fonts live directly in `public/assets/` and need no build.

## Going live: connect the forms

Edit `public/assets/js/config.js`:

- `formEndpoint`: any URL that accepts a JSON `POST` (Formspree, HubSpot, GoHighLevel, a Zapier or Make webhook, or a CRM). Quote and contact submissions are sent there.
  Until it is set, submissions open a pre-filled email to `leadEmail` so nothing is lost.
  If the endpoint fails, the visitor sees a one-tap email fallback, never a fake success.
- `trackEndpoint`: optional URL that returns a project as JSON for `?code=&zip=`. Until it is set, the tracker shows projects created on the same device plus the sample project. See `assets/js/track.js` for the expected shape.

The quote payload includes: tracking code, property type, monthly bill, goals, ownership, roof shade, timeline, address, requested day and time window (or "call me first"), name, phone, email, preferred contact method, and the estimate.

## Savings model

`public/assets/js/calc.js` holds every assumption: rate $0.34/kWh, 5.6 peak sun hours, 80% system efficiency, $3.10/W installed, 3% yearly utility increase, 0.5% yearly panel degradation, 410 W panels. All results are labeled as estimates before incentives.

## Motion and accessibility

- GSAP + ScrollTrigger + SplitText and Lenis smooth scrolling (vendored in `assets/vendor/`; GSAP is free under its standard license).
- First visit shows a short preloader; later page loads use a quick curtain transition.
- `prefers-reduced-motion` turns off smooth scrolling, pinning, parallax and text animation; the WebGL sun renders a still frame.
- Without WebGL the sun falls back to a CSS gradient. Without JavaScript all content is still visible.

## Credits

- Photography: Unsplash (free to use under the Unsplash License).
- Fonts: Archivo, Instrument Serif and JetBrains Mono (SIL Open Font License), self-hosted.
- Logo and testimonials: Lithium LLC's existing website.
