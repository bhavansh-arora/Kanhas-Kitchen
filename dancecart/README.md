# Dance Cart: website concept by Code Bunny

A multi-page, mobile-first website concept for [Dance Cart](https://www.dancecart.com.au/), with a course catalogue, enrolment and payments built in. It's a static site: plain HTML, CSS and JavaScript, with no framework and no build server needed to run it.

The reply to Amy that goes with this concept is in [`REPLY-TO-AMY.md`](REPLY-TO-AMY.md).

## Pages

| Page | What it does |
|---|---|
| `index.html` | Home: hero, problem → fix, programs, 3-tap program finder, how it works, online program spotlight, testimonials, meet Amy, FAQ |
| `programs.html` | Course catalogue with year-level and format filters, search, sort, quick view and a comparison table |
| `online-foundation.html` | Online Foundation Program detail with a band picker, add-to-enrolment and Kajabi "buy now" links |
| `events.html` | Fete, concert and graduation performances with a live date-availability calendar |
| `about.html` | Story, timeline, values, Amy |
| `enrol.html` | 4-step enrolment: programs → school → schedule (Zoom induction booking) → payment (card, invoice or purchase order) → confirmation with calendar invite |
| `contact.html` | Enquiry form, book-a-call scheduler, free resources sign-up |
| `dashboard.html` | Admin preview: enrolments, payment status, upcoming inductions, revenue, CSV export |
| `404.html` | Not-found page |

## Features worth demoing

- **Cart that follows you around.** Add programs from any page; the cart drawer and badge stay in sync (saved in the browser).
- **Bundle upsell.** Add two or more bands and the cart offers the Whole School program at $1,499.
- **Enrol end to end.** Complete an enrolment, then open `dashboard.html`: it appears at the top of the table.
- **Event dates.** Request a fete or graduation date on `events.html`; it carries through to enrolment.
- **Motion.** "5, 6, 7, 8" preloader on first visit, page-to-page curtain, split-line headline reveals, magnetic buttons and a custom cursor on desktop. All of it respects "reduce motion" settings.

Checkout is in **demo mode**: no card is charged and no email is sent.

## Editing

Pages are built from `_src/` so the header, footer and cart stay identical everywhere.

```bash
node build.mjs
```

- `_src/pages/*.html`: page content (front matter sets title, description and page scripts)
- `_src/partials/*.html`: shared layout, header, footer, preloader, cart drawer
- `assets/js/data.js`: **every program, price and checkout link lives here**
- `assets/css/main.css`: the design system (tokens at the top)

## Running locally

```bash
cd dancecart && python3 -m http.server 8080
```

Then open http://localhost:8080.

## Going live

The `dancecart/` folder can be deployed as-is to any static host (for example `dancecart.codebunny.net`). For production, the demo hooks to replace are:

- `assets/js/enrol.js` `submit`: post to the enrolment endpoint (Stripe for cards; invoice and PO records for the rest) and trigger Kajabi access
- `assets/js/contact.js`: send the contact form and call bookings
- `assets/js/calendar.js`: read real availability from Amy's calendar
- `assets/js/dashboard.js`: read from the enrolment database behind a login

## Content to confirm with Amy

- Amy's title and bio wording (LinkedIn wasn't publicly readable)
- The "Online" year in the timeline on `about.html`
- In-school, fete and graduation inclusions (written from the current site and testimonials)
- Dashboard numbers are sample data
