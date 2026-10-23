# Lasting Change Wellness: website

An immersive, multi-page site for Lauren Yellin Weinberg's coaching practice. It is built to feel like an experience rather than a brochure, and to turn visitors into booked calls.

**Pages:** Home · The S.H.I.N.E. Method · 1:1 Coaching · The Collective · Speaking · About · The Experience · Resources · Contact · 404

## Preview

```
cd sites/lasting-change-wellness
python3 -m http.server 8000      # open http://localhost:8000
```

The preloader shows once per browser session. To see it again, open a new private window.

## What makes it an experience

**On every page**
- **Preloader.** The logo draws itself, Lauren's name rises in, and a counter runs to 100 before the page wipes open.
- **Page-to-page curtain.** It carries the destination's name ("1:1 *Coaching*", "The *Experience*").
- **Custom cursor.** It changes colour on dark sections and grows into a label ("Book", "Explore", "Flip it") over key elements.
- **Magnetic buttons.** They lean toward the pointer.
- **Headline reveals.** Headlines rise in word by word behind a mask.
- **Images.** Photos open with a clip reveal and drift with parallax.
- **Scroll progress line** along the top edge.

**On the Home page**
- **Hero.** A full-screen slideshow with wipe transitions, plus a floating "Power Up call" booking card.
- **Statement.** A sentence with small photos set into it, which lights up word by word as you scroll.
- **Bento grid** of the three ways to work with Lauren.
- **Word marquee** that speeds up and changes direction with your scrolling.
- **S.H.I.N.E. section.** The section pins, the five steps slide past sideways, and the room glows brighter as you move through them.
- **"Flip the switch."** A thought reframe from her workbook; the card lights up when you flip it.
- **Stacking "how it works" cards.**
- **Footer** with a giant gradient "Expect amazing" wordmark whose letters rise into place.

**The Experience page**
1. A guided one-minute breath, paced by a glowing orb.
2. Flip the switch, with six thought reframes.
3. A S.H.I.N.E. check-in. Visitors pick how they're arriving and get a step, an intention and a practice, and can download it as a shareable image card.
4. The RISE readiness check.

Motion uses GSAP and ScrollTrigger, kept in `assets/vendor/` so the site doesn't depend on a CDN. Scrolling stays native, with no scroll-jacking. If a script fails, every page still reads and works. With "reduce motion" switched on, all animation is turned off.

## Editing

The HTML files in this folder are generated. Edit the sources in `src/`, then rebuild:

```
node build.mjs                   # Node 18+, no dependencies
```

| What you want to change | Where |
| --- | --- |
| Booking links, email, phone, social links | `src/site.json` |
| Header, menu, footer, "next step" panel, marquees, RISE check | `src/partials/` |
| A page's words or sections | `src/pages/<page>.html` |
| Page title, search description, curtain label | front matter at the top of each page |
| Colours, type, spacing | tokens at the top of `assets/css/main.css` |
| Interactions / scroll choreography | `assets/js/main.js` / `assets/js/motion.js` |

Template helpers:
- `{{img name | alt | sizes | class | eager | focal point}}` outputs a responsive `<img>`. Images live in `assets/img/<name>-<width>.webp`, with sizes listed in `src/images.json`.
- `{{thumb name}}` gives the smallest version of an image, used for the small photos set into sentences.

## How visitors book

| Button | Goes to | Acuity appointment type |
| --- | --- | --- |
| "Book a free call" (everywhere) | Contact page, live scheduler | Expect Amazing Free Power Up (30 min, free) |
| Clarity Power Session | Acuity direct | Clarity Power Session (90 min, $350) |
| The Collective | Contact page, Collective tab | The Collective Conversation (30 min, free) |
| Speaking | Contact page, Speaking tab | Consultation: Speaking or Corporate (30 min, free) |

`contact.html?type=collective` or `?type=speaking` opens the matching tab.

**Contact form.** By default it opens the visitor's email app with the message filled in. To receive messages directly, put a form endpoint (Formspree, Basin or similar) in `formEndpoint` in `src/site.json` and rebuild.

## Quality

- Tested at 1440, 820 and 390 px wide: no sideways scrolling, and every interaction was checked in a real browser.
- Accessibility:
  - one `<h1>` per page and a skip link
  - keyboard-operable tabs, switch and menu
  - alt text on every image
  - live regions announce quiz, switch and check-in results
- SEO: per-page titles, descriptions and canonical URLs, an Open Graph image, schema.org `ProfessionalService` data, `sitemap.xml` and `robots.txt`.
- Weight: about 2 MB of responsive WebP images (lazy-loaded below the fold), about 120 KB of animation library, about 40 KB of site JavaScript.

## Deploying

The folder is a plain static site. Upload it to Netlify, Vercel, Cloudflare Pages or GitHub Pages; no build step is needed on the host. Point the host's "not found" page at `404.html`. If the domain changes, update `url` in `src/site.json` and rebuild.

## Content for Lauren to confirm

Facts, quotes, prices and links come from her current site, her LinkedIn and her public Acuity page. These need her sign-off:

- **New wording.** Some text is new, written in her voice:
  - the S.H.I.N.E. "In our sessions / What shifts" lines and reflection questions
  - the "Flip the switch" reframes
  - the S.H.I.N.E. check-in intentions and practices
  - the FAQ answers
  - the "Is this for you?" lists
- **Prices.** The $350 Clarity Power Session price is from her Acuity page. Package prices show as "Tailored".
- **Dates.** "2018: founded Lasting Change Wellness" is inferred from her site's ©2018. "2023: co-author" is inferred from the book's Amazon listing.
- **Testimonials.** These are lightly trimmed (marked "…"). People without listed titles are labelled "Audience member" or "Workshop participant".
- **Photos** are from her current site.
