# Insight Transformational Coaching — website redesign

A multi-page static redesign of [insighttransform.com](https://insighttransform.com/) for Alberta McKnight,
built by Code Bunny. All copy, testimonials, photography and the logo come from the current site.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home: hero, philosophy, "Wishing → Action" switch, "You belong here if…", "From fog to light" journey, packages, testimonials, how it starts |
| `about.html` | About Alberta: mission, ontology approach, clarity/focus/ease/grace, promise, testimonials |
| `coaching.html` | Packages Level I–III, comparison table, who it's for, FAQ |
| `find-your-level.html` | 5-question quiz that recommends a level and pre-fills the booking form |
| `contact.html` | 3-step booking request (focus → level & format → details) |
| `404.html` | Not-found page |

## Settings

Edit `assets/js/config.js`:

- `formEndpoint`: a JSON POST endpoint (Formspree, Basin, Zapier/Make webhook…). While it's empty, the booking form opens a pre-filled email to `email` instead, so no request is lost.
- `bookingUrl`: optional Calendly, Acuity or TidyCal link. It shows a "Pick a time" link on the contact page and after a request is sent.
- `instagram` / `linkedin`: profile URLs. The links stay hidden until these are set.

## Preview notes for the pitch

Add `?notes` to any URL (for example `index.html?notes`) to show numbered pins that explain each addition.
The setting is remembered for the browser tab. Use `?notes=off` or the "Hide" button to turn it off.

## Run locally

It's plain HTML, CSS and JS with no build step:

```bash
cd insight-transformation && python3 -m http.server 8080
```

## Tech notes

- Motion uses GSAP + ScrollTrigger and Lenis, all vendored in `assets/vendor/`. Every effect is optional: without JS, or with "reduce motion" turned on, all content stays visible and usable.
- Design: "from fog to light" — Bodoni Moda (headings) and Manrope (text) from Google Fonts; warm ivory with deep plum bands, Alberta's violet for accents and her sunrise orange for small details. Colours live as variables at the top of `assets/css/main.css`.
- Landscape photos are public domain / CC0 from Wikimedia Commons (see `assets/img/PHOTO-CREDITS.txt`).
- Images are optimised WebP in `assets/img/`. The share image is `assets/img/og.jpg`.
- `404.html` uses `<base href="/">`, so it assumes the site is served from the domain root.
