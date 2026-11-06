# Take Root Life Coaching: website concept

A multi-page static site for Adrienne Phelps / Take Root Life Coaching, built by Code Bunny.
It needs no framework and no server. `site/` is the finished website and can be uploaded to any static host
(Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3, or a plain web server).

All copy, pricing, testimonials, credentials and journal posts come from takerootlifecoaching.com.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Home | `index.html` | Hero, "sound familiar?" signs, whole-person roots animation, ways to begin, 4-step process, meet Adrienne, testimonials, Footing Check teaser, journal |
| About | `about.html` | Story, JFK quote, coaching principles, education and experience timeline, life outside coaching |
| Coaching | `coaching.html` | Topics (each linked to a related journal post), pricing, what a session feels like, coaching vs therapy, practical details, FAQ excerpt |
| Book | `work-with-me.html` | New / Returning switch (`#new`, `#returning` deep links), what happens next, alternatives |
| Footing Check | `footing-check.html` | Free self-assessment: six sliders, live radar wheel, tailored suggestion; results can be attached to the contact form |
| Journal | `journal.html`, `journal/*.html` | All nine of Adrienne's posts, with reading progress, an author card and related posts |
| FAQ | `faq.html` | All ten answers (FAQPage structured data) |
| Contact | `contact.html` | Contact form, direct details, Footing Check attachment |
| Ideas | `ideas.html` | A short proposal written for Adrienne (`noindex`, not linked in the navigation) |
| 404 | `404.html` | Not-found page |

## Editing and rebuilding

The HTML in `site/` is generated. Edit the sources, then rebuild:

```bash
node take-root/src/build.mjs
```

- `src/lib.mjs`: shared header, footer, `<head>`/SEO, components, testimonials, FAQ, and the `SITE` settings
- `src/pages/*.mjs`: one module per page
- `src/posts.json`: journal content
- `src/images.json`: image sizes used for responsive `srcset`
- `site/assets/css/main.css`: the design system (colour tokens at the top)
- `site/assets/js/main.js`: interactions (GSAP + ScrollTrigger in `assets/vendor/`)
- `site/assets/js/footing.js`: the Footing Check

To preview locally:

```bash
python3 -m http.server 8080 --directory take-root/site
```

## Settings to check before launch

- **Booking links**: `SITE.bookNew` / `SITE.bookReturning` in `src/lib.mjs` point to Adrienne's current
  scheduler page. Replace them with direct scheduler URLs if preferred.
- **Contact form**: `FORM_ENDPOINT` in `src/pages/contact.mjs` is empty. In that state, submitting opens the
  visitor's email app with the message filled in. Set it to a form service URL (for example Formspree) to receive
  submissions directly.
- **Domain**: `SITE.url` (canonical links, Open Graph tags, sitemap) is `https://www.takerootlifecoaching.com`.
- **Privacy / Terms** link to the existing pages on the current site.

## Built-in quality

- Works at phone, tablet and desktop widths, with a sticky booking bar on phones and a full-screen menu
- Self-hosted fonts (Inter Tight, Fraunces, JetBrains Mono) and responsive WebP images
- Structured data for the business, person, service, FAQ and articles; Open Graph image; sitemap; robots; web manifest
- Respects `prefers-reduced-motion`; content stays visible if JavaScript fails; keyboard-accessible menu, tabs and accordion
