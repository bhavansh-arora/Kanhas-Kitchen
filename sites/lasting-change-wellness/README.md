# Lasting Change Wellness: website

A multi-page marketing site for Lauren Yellin Weinberg's coaching practice. It is built to turn visitors into booked calls.

**Pages:** Home · The S.H.I.N.E. Method · 1:1 Coaching · The Collective · Speaking · About · Resources · Contact · 404

## Preview

```
cd sites/lasting-change-wellness
python3 -m http.server 8000      # open http://localhost:8000
```

## Editing

The HTML files in this folder are generated. Edit the sources in `src/`, then rebuild:

```
node build.mjs                   # Node 18+, no dependencies
```

| What you want to change | Where |
| --- | --- |
| Booking links, email, phone, social links | `src/site.json` |
| Navigation, footer, the shared "next step" band | `src/partials/` |
| A page's words or sections | `src/pages/<page>.html` |
| Page title and search description | front matter at the top of each page |
| Colours, fonts, spacing | tokens at the top of `assets/css/main.css` |

Images go through `{{img name | alt text | sizes}}`, which outputs a responsive `<img>` with `srcset`. To add an image, save `assets/img/<name>-<width>.webp` (for example 800 and 1500 wide) and add an entry to `src/images.json`.

## How visitors book

| Button | Goes to | Acuity appointment type |
| --- | --- | --- |
| "Book a free call" (everywhere) | Contact page with live scheduler | Expect Amazing Free Power Up (30 min, free) |
| Clarity Power Session | Acuity direct | Clarity Power Session (90 min, $350) |
| The Collective | Contact page, Collective tab | The Collective Conversation (30 min, free) |
| Speaking | Contact page, Speaking tab | Consultation: Speaking or Corporate (30 min, free) |

The Contact page embeds her Acuity scheduler with three tabs. `contact.html?type=collective` or `?type=speaking` opens the matching tab.

**Contact form.** By default the form opens the visitor's email app with the message filled in. To receive messages directly, create a form endpoint (Formspree, Basin or similar), put its URL in `formEndpoint` in `src/site.json`, and rebuild. The form then sends JSON there and shows a thank-you message.

## Features

- Editorial design system: Instrument Serif and Manrope, an ivory, forest and mint palette taken from her logo, a subtle paper grain, and arch-framed portraits
- Interactive S.H.I.N.E. explorer (home) and a scroll-driven step-through with a sticky letter (method)
- RISE readiness quiz, a testimonial carousel, an "as seen in" marquee, and a statement that lights up word by word as you scroll
- Full-screen mobile menu, plus a booking bar that appears on phones after the first screen
- Smooth page-to-page transitions in supporting browsers
- SEO: per-page titles, descriptions and canonical URLs, Open Graph share image (`assets/img/og.jpg`), schema.org `ProfessionalService` data, `sitemap.xml` and `robots.txt`
- Accessibility: skip link, visible focus states, keyboard-operable tabs and carousel, reduced-motion support, alt text on every image, one `<h1>` per page
- Performance: responsive WebP images (about 1.2 MB in total), lazy loading below the fold, no frameworks, about 11 KB of JavaScript

## Deploying

The folder is a plain static site. Upload it to Netlify, Vercel, Cloudflare Pages or GitHub Pages; no build step is needed on the host. To serve the 404 page, point the host's "not found" page at `404.html`. If the domain changes, update `url` in `src/site.json` and rebuild, so canonical URLs and the sitemap stay correct.

## Content notes for Lauren to confirm

All facts, quotes, prices and links come from her current site, her LinkedIn and her public Acuity booking page. These items need her sign-off:

- **New wording.** Some text is new, written in her voice: the S.H.I.N.E. "In our sessions / What shifts" lines and reflection questions, the FAQ answers, the "Is this for you?" lists and the pain points.
- **Prices.** The $350 Clarity Power Session price comes from her Acuity page. Package prices are shown as "Tailored", because none are published.
- **Dates.** "2018: founded Lasting Change Wellness" is inferred from her site's ©2018. "2023: co-author" is inferred from the book's Amazon listing.
- **Testimonials.** These are lightly trimmed (marked with "…"). Kristy Crippen, Nikki Gangemi and Lisa Arning are labelled "Audience member", and Judy Siegel "Workshop participant", because her site gives no titles for them.
- **The Collective.** "Year-long" comes from her Workshops page. Cohort size, dates and price aren't stated, so the page sends people to the Collective Conversation call.
- **The Connection.** Her site says the monthly networking event is paused, and the page says the same.
- **Photos** are from her current site.
