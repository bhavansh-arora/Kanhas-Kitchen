# Polish — website redesign (concept)

A multi-page, mobile-first redesign of [polish.nz](https://polish.nz) built as a pitch for Melissa Frerk.
It uses Polish's own brand guide (Midnight Black, Soft White, Rose `#E58F99`, Slate, Manrope), its hero film,
photography and published copy.

**Deployable output is in `dist/`** — plain static files. Upload the folder to any host (Netlify, Vercel,
Cloudflare Pages, S3) or open it with a local server:

```bash
cd polish-site
node build.mjs                                   # rebuild dist/ from src/
python3 -m http.server 4173 --directory dist     # http://localhost:4173
```

No dependencies. Node 18+ for the build script.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Film hero, approach statement, pathways, coaching feature, nine-pillar dial, programmes, readiness check teaser, founder, insights, FAQ |
| `coaching.html` | Executive coaching page with the **4-step booking flow** (`#book`) |
| `programmes.html` | Programmes, **RBP co-funding calculator**, online courses, comparison table |
| `approach.html` | The nine pillars (dial + grid), why Polish, how we work |
| `speaking.html` | Signature keynotes, formats, booking process |
| `about.html` | Melissa's story, values, who Polish works with |
| `assessment.html` | **AI Leadership Readiness Check** — 9 questions, score, radar, recommendation |
| `insights.html`, `article.html` | Insights list with filters + newsletter; article template |
| `contact.html` | Enquiry form that adapts to the enquiry type |
| `ideas.html` | The written ideas for Melissa (not in navigation, `noindex`) |
| `404.html` | Not-found page |

## Structure

```
src/
  pages/      one file per page (front matter: title, description, nav, scripts)
  partials/   layout, header, footer, cta — shared by every page
  css/        polish.css — the whole design system (tokens, components, responsive)
  js/         main.js (motion, header, dial…), booking.js, assessment.js, forms.js, data.js
  assets/     images, film, logos
build.mjs     assembles src/ into dist/
```

## Going live

- **Bookings & enquiries** — in `src/partials/layout.html`, set `bookingEndpoint` / `enquiryEndpoint` to a
  form endpoint (Formspree, Make, Zapier, or a Cal.com / Google Calendar webhook). Requests are POSTed as JSON.
  Until then, the confirmation screens offer a pre-filled email to `hello@polish.nz` so nothing is lost.
- **Availability** — `booking.js` currently shows indicative weekday slots (Auckland time). Connect it to
  Melissa's real calendar before launch.
- **To confirm with Melissa** — pillar names (`src/js/data.js`), coaching engagement shapes, keynote topics,
  and any testimonials to add.
