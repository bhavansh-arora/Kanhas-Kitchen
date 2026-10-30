# George Dupont Leadership — website

A multi-page, hand-built static site for George Dupont Leadership and the DynastyDNA™ Leadership & Culture Operating System. Built by Code Bunny.

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | Hero, problem, DynastyDNA™ helix, 90-day engagement, audiences, legacy, keynotes, testimonials, scorecard, podcast |
| DynastyDNA™ | `dynastydna.html` | Philosophy, 3 domains, the 12 Non-Negotiables, ways to install, Champion’s Edge |
| 90-Day Engagement | `engagement.html` | Fit check, the shift, Diagnose/Align/Install roadmap, cost-of-drift calculator, other offers, FAQ |
| Speaking | `speaking.html` | Why George, 6 signature keynotes with one-click booking, what’s included, testimonials |
| About | `about.html` | Story, career timeline, philosophy, family, Champion’s Edge |
| Dynasty Scorecard | `scorecard.html` | 12-question diagnostic with instant score, tier and focus domain |
| Contact | `contact.html` | Discovery-call form (pre-fills interest, keynote and scorecard result) |
| 404 | `404.html` | Not-found page |

## Editing

- **Page content** lives in `src/pages/*.html`. Shared head, header, menu, closing CTA and footer live in `src/partials/`.
- After editing anything in `src/`, rebuild the root HTML files:

  ```bash
  node tools/build.mjs
  ```

- **Settings** (email, form endpoint, seats per quarter, DynastyDNA data) live in `assets/js/config.js`. No rebuild needed.
- Styles: `assets/css/main.css` (design tokens at the top). Behaviour: `assets/js/site.js`. Motion: `assets/js/motion.js`.

## Forms

Out of the box, the contact and newsletter forms open the visitor’s email app with the message already written to `info@georgedupontleadership.com`. To receive submissions directly, paste a Formspree / Basin / Netlify / Zapier webhook URL into `formEndpoint` and `newsletterEndpoint` in `assets/js/config.js`.

## Booking capacity

The “Now booking Q_ 20__” labels roll forward automatically to the next quarter. Set `seatsTaken` in `config.js` to show filled seats on the seat meters (e.g. `2` shows “1 of 3 seats open”).

## Deploy

Any static host (Netlify, Vercel, Cloudflare Pages, S3, cPanel). Upload the folder as-is; `src/` and `tools/` are only needed for editing. To preview locally:

```bash
python3 -m http.server 8080
```

## Content to confirm with George

Drafted from George’s public material and should be approved before launch:

- One-line descriptions of the 12 Non-Negotiables (names come from George’s three domains).
- Descriptions for The Champion’s Mirror Intensive™ and DynastyDNA Labs.
- FAQ answers on pricing approach, delivery format and mid-season starts.
- Phase deliverable names on the 90-day roadmap.
- Social links (only LinkedIn is linked today) and podcast platform links once live.

## Tech

Plain HTML/CSS/JS. GSAP 3.12.5 + ScrollTrigger and Lenis 1.1.13 (vendored in `assets/vendor/`). Fonts: Big Shoulders Display, Instrument Serif, Inter Tight, Geist Mono (Google Fonts). Respects `prefers-reduced-motion`; everything works without JavaScript animations.
