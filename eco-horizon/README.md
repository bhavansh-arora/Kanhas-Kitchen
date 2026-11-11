# Eco Horizon: website concept

A multi-page concept redesign of [ecohorizon.ie](https://ecohorizon.ie) by Code Bunny, built as a preview pack for Ciarán Kells. It's a static site with no framework and no plugins, so it's fast and can be hosted anywhere.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Home: hero quote starter, live solar clock, sector panels, grant & savings calculator, energy-flow simulator, work, process, reviews, grants, FAQ |
| `homes.html` | Residential solar, sizing guide, SEAI grant steps |
| `business.html` | Commercial solar, Microgen grant band calculator, commercial storage |
| `farms.html` | Agri solar, TAMS 3 vs SEAI comparison, calculator picks the better scheme |
| `grants.html` | Grant hub with tabs and yes/no eligibility checkers |
| `technology.html` | Components, batteries, EV chargers, app, brands |
| `about.html` | Story, values, installs, reviews, map |
| `quote.html` | Adaptive 5-step quote funnel with live estimate and autosave |
| `preview-pack.html` | The pitch: what we found, what we built, what happens next |

## Work on it

```bash
cd eco-horizon
node build.mjs            # builds src/ into dist/
cd dist && python3 -m http.server 8080
```

- `src/pages/*.html`: page content. The comment block at the top sets the title, description and extra scripts.
- `src/partials/*.html`: shared pieces (header and footer in `layout.html`, calculator, flow simulator, reviews, CTA). Include one with `{{> name}}`.
- `src/assets/css/main.css`: the whole design system (tokens at the top).
- `src/assets/js/main.js`: navigation, motion, calculators and checkers. `flow.js` runs the energy simulator and `quote.js` the funnel.

`dist/` is committed so it can be deployed as-is (Netlify, Vercel, Cloudflare Pages, or any static host).

## Before it goes live

1. **Connect the quote form.** Set `data-endpoint` on the `<form data-funnel>` in `src/pages/quote.html` to a URL that accepts a JSON POST (CRM webhook, Zapier/Make, or a small serverless function). Until then the form shows the thank-you screen without sending anything.
2. **Remove the preview notes.** Delete `assets/js/preview-notes.js`, its `<script>` tag in `layout.html` and the `data-note*` attributes. Unpublish or remove `preview-pack.html`.
3. **Add real project details.** Project cards show category only. Add kWp, county and year for each install.
4. **Re-check grant figures.** Calculators follow the rules on ecohorizon.ie as of November 2026 (SEAI residential, enhanced Non-Domestic Microgen 7 Oct 2026 – 6 Jul 2027, TAMS 3). Tariff and cost assumptions are at the top of the calculator code in `main.js`.
5. **Redirect old URLs** (e.g. `/solar-power-services/residential-solar/` → `/homes.html`) to keep search rankings.

## Credits

- Project photos, product images and logo: Eco Horizon (ecohorizon.ie).
- Landscape and installation photos: Unsplash (free to use under the Unsplash licence).
- Fonts: Bricolage Grotesque, Fraunces, Inter Tight, JetBrains Mono (Google Fonts).
- Smooth scrolling: Lenis 1.1.13.
