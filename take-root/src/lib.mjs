// Shared layout, components and helpers for the Take Root site build.
import { readFileSync } from "node:fs";

const here = new URL(".", import.meta.url);
const images = JSON.parse(readFileSync(new URL("images.json", here), "utf8"));
export const posts = JSON.parse(readFileSync(new URL("posts.json", here), "utf8"));

export const SITE = {
  name: "Take Root Life Coaching",
  url: "https://www.takerootlifecoaching.com",
  email: "adrienne@takerootlifecoaching.com",
  facebook: "https://www.facebook.com/profile.php?id=61576414054838",
  instagram: "https://www.instagram.com/takeroot.lifecoaching/",
  // Live booking links (Adrienne's current scheduler). Swap for direct scheduler URLs if preferred.
  bookNew: "https://www.takerootlifecoaching.com/work-with-me#new",
  bookReturning: "https://www.takerootlifecoaching.com/work-with-me#returning",
  privacy: "https://www.takerootlifecoaching.com/privacy-policy",
  terms: "https://www.takerootlifecoaching.com/terms-of-service",
};

export const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const strip = (s = "") => s.replace(/<[^>]+>/g, "");

export const fmtDate = (iso) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/* ---------- Icons ---------- */
const arrowPath = `<path d="M3 8h10M9 4l4 4-4 4"/>`;
export const arrow = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${arrowPath}</svg>`;
export const icons = {
  arrow,
  career: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21V9"/><path d="M12 9c0-3 2-5 5-5 0 3-2 5-5 5Z"/><path d="M12 13c0-2.5-1.8-4.3-4.5-4.3 0 2.5 1.8 4.3 4.5 4.3Z"/><path d="M8 21h8"/></svg>`,
  path: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21c0-5 4-6 6-9s1-6 6-9"/><circle cx="6" cy="21" r="0.6"/><path d="M15 3h3v3"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M3 12h4l2-3 3 6 2-3h7"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z"/><path d="M9 12h6"/></svg>`,
  balance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M7 20h10"/><path d="M5 8h14"/><path d="m5 8-3 6a3 3 0 0 0 6 0L5 8ZM19 8l-3 6a3 3 0 0 0 6 0l-3-6Z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>`,
  leaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14Z"/><path d="M5 19 13 11"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></svg>`,
  mountain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 20 6-11 4 7 2-3 6 7H3Z"/><path d="m7.5 12 1.5 1 1.5-1"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h12"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 12c-3 0-5 3-5 5.5 0 1.5 1.2 2.5 2.6 2.1 1-.3 1.6-.6 2.4-.6s1.4.3 2.4.6c1.4.4 2.6-.6 2.6-2.1C17 15 15 12 12 12Z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 4l8 7v9H4v-9Z"/><path d="M10 20v-5h4v5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21h3Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/></svg>`,
  sprig: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1.7 2.3 1.7 4.7 0 7-1.7-2.3-1.7-4.7 0-7Zm0 13c1.7 2.3 1.7 4.7 0 7-1.7-2.3-1.7-4.7 0-7ZM2 12c2.3-1.7 4.7-1.7 7 0-2.3 1.7-4.7 1.7-7 0Zm13 0c2.3-1.7 4.7-1.7 7 0-2.3 1.7-4.7 1.7-7 0Z"/></svg>`,
};

/* ---------- Components ---------- */
export const btn = (label, href, variant = "", extra = "") =>
  `<a class="btn ${variant}" href="${href}" ${extra}><span>${label}</span><span class="ico">${arrow}${arrow}</span></a>`;

export const linkU = (label, href, extra = "") => `<a class="link-u" href="${href}" ${extra}>${label} ${arrow}</a>`;

export const arrowDot = `<span class="arrow-dot" aria-hidden="true">${arrow}</span>`;

export function srcset(name) {
  const v = images[name];
  if (!v) throw new Error("Unknown image " + name);
  return v.map(([w]) => `assets/img/${name}-${w}.webp ${w}w`).join(", ");
}

/** Responsive <img>. `base` is the relative prefix for nested pages. */
export function img(name, { alt = "", sizes = "100vw", cls = "", eager = false, style = "", base = "" } = {}) {
  const v = images[name];
  if (!v) throw new Error("Unknown image " + name);
  const [w, h] = v[v.length - 1];
  const mid = v.find(([vw]) => vw >= 1000) || v[v.length - 1];
  const set = v.map(([vw]) => `${base}assets/img/${name}-${vw}.webp ${vw}w`).join(", ");
  return `<img src="${base}assets/img/${name}-${mid[0]}.webp" srcset="${set}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export const imgUrl = (name, width, base = "") => {
  const v = images[name];
  const pick = v.find(([vw]) => vw >= width) || v[v.length - 1];
  return `${base}assets/img/${name}-${pick[0]}.webp`;
};

export const sh = (num, label, meta = "") => `<div class="sh" data-reveal="fade"><span><b>(${num})</b> — ${label}</span>${meta ? `<span>${meta}</span>` : ""}</div>`;

/* Decorative root lines used behind inner-page heroes */
export const rootLines = `<svg class="phero-roots" viewBox="0 0 560 620" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true">
<path stroke-width="3" d="M280 0 C 282 120 272 220 280 330 S 286 500 280 620"/>
<path stroke-width="2" d="M280 40 C 230 90 150 90 40 160"/><path stroke-width="2" d="M280 40 C 330 90 410 90 520 160"/>
<path stroke-width="2" d="M279 190 C 230 250 170 300 90 400"/><path stroke-width="2" d="M281 210 C 330 270 390 300 470 410"/>
<path stroke-width="1.2" d="M170 95 C 160 130 140 160 120 200"/><path stroke-width="1.2" d="M390 95 C 402 132 422 160 440 200"/>
<path stroke-width="1.2" d="M180 300 C 150 320 120 322 70 316"/><path stroke-width="1.2" d="M380 320 C 410 340 440 342 500 334"/>
<path stroke-width="1.2" d="M281 430 C 250 470 240 520 220 580"/><path stroke-width="1.2" d="M281 410 C 310 450 330 500 340 560"/>
</svg>`;

/* ---------- Navigation ---------- */
const NAV = [
  ["about", "About", "about.html"],
  ["coaching", "Coaching", "coaching.html"],
  ["footing", "Footing Check", "footing-check.html"],
  ["journal", "Journal", "journal.html"],
  ["faq", "FAQ", "faq.html"],
  ["contact", "Contact", "contact.html"],
];

function header(base, current) {
  const links = NAV.map(([k, l, h]) => `<a href="${base}${h}"${k === current ? ' aria-current="page"' : ""}>${l}</a>`).join("");
  const menuLinks = [["home", "Home", "index.html"], ...NAV]
    .map(([k, l, h], i) => `<a href="${base}${h}"${k === current ? ' aria-current="page"' : ""}>${l}<small>0${i + 1}</small></a>`)
    .join("");
  return `<a class="skip" href="#main">Skip to content</a>
<header class="nav" id="nav">
  <a class="brand" href="${base}index.html" aria-label="Take Root Life Coaching — home">
    <img src="${base}assets/img/logo-mark-sm.png" width="196" height="240" alt="">
    <span class="brand-text"><span class="brand-name">take root</span><span class="brand-sub">Life Coaching</span></span>
  </a>
  <nav class="nav-links" aria-label="Main">${links}</nav>
  <div class="nav-cta">
    ${btn("Book a free call", `${base}work-with-me.html`, "btn--clay btn--sm")}
    <button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true">
  <nav class="menu-links" aria-label="Mobile">${menuLinks}</nav>
  <div class="menu-foot">
    <div><a href="mailto:${SITE.email}">${SITE.email}</a><br>Raleigh, NC · Sessions held virtually</div>
    ${btn("Book a free call", `${base}work-with-me.html`, "btn--clay")}
  </div>
</div>`;
}

function footer(base, cta = {}) {
  const title = cta.title || `Ready to take root and <em>thrive?</em>`;
  const text = cta.text || `Let’s chat to see if coaching is a good fit for you. Thirty minutes, free, and no pressure — just an honest conversation.`;
  const year = new Date().getFullYear();
  return `<footer class="footer" role="contentinfo">
  <div class="wrap">
    <div class="footer-cta">
      <div>
        <div class="eyebrow" data-reveal="fade"><span class="dot"></span> Your next chapter</div>
        <h2 class="h2 balance" data-reveal>${title}</h2>
      </div>
      <div data-reveal style="--d:.1s">
        <p>${text}</p>
        <div class="btn-row">
          ${btn("Book a free call", `${base}work-with-me.html`, "btn--clay")}
          ${btn("Send a message", `${base}contact.html`, "btn--ghost-light btn--plain")}
        </div>
      </div>
    </div>
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="${base}index.html" aria-label="Take Root Life Coaching — home">
          <img src="${base}assets/img/logo-mark-sm.png" width="196" height="240" alt="">
          <span class="brand-text"><span class="brand-name">take root</span><span class="brand-sub">Life Coaching</span></span>
        </a>
        <p>One-on-one coaching for the whole you — helping you build a life that feels fulfilling, not just manageable.</p>
        <div class="socials">
          <a href="${SITE.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icons.instagram}</a>
          <a href="${SITE.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${icons.facebook}</a>
          <a href="mailto:${SITE.email}" aria-label="Email Adrienne">${icons.mail}</a>
        </div>
      </div>
      <div class="footer-col"><h4>Explore</h4><ul>
        <li><a href="${base}index.html">Home</a></li><li><a href="${base}about.html">About Adrienne</a></li>
        <li><a href="${base}journal.html">Journal</a></li><li><a href="${base}faq.html">FAQ</a></li></ul></div>
      <div class="footer-col"><h4>Work together</h4><ul>
        <li><a href="${base}coaching.html">Coaching &amp; pricing</a></li><li><a href="${base}work-with-me.html">Book a session</a></li>
        <li><a href="${base}footing-check.html">The Footing Check</a></li><li><a href="${base}contact.html">Contact</a></li></ul></div>
      <div class="footer-col"><h4>Say hello</h4><ul>
        <li><a href="mailto:${SITE.email}">${SITE.email}</a></li><li><a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram</a></li>
        <li><a href="${SITE.facebook}" target="_blank" rel="noopener">Facebook</a></li><li><span class="muted" style="color:var(--on-dark-muted)">Raleigh, NC · Virtual</span></li></ul></div>
    </div>
  </div>
  <div class="wordmark" aria-hidden="true">take <em>root</em></div>
  <div class="wrap footer-bar">
    <span>© ${year} Take Root Life Coaching, LLC</span>
    <nav aria-label="Legal"><a href="${SITE.privacy}">Privacy</a><a href="${SITE.terms}">Terms</a><a href="#top" data-top>Back to top ↑</a></nav>
    <span>Site by <a href="https://codebunny.net" target="_blank" rel="noopener">Code Bunny</a></span>
  </div>
</footer>
<div class="sticky-book" id="sticky-book" aria-hidden="true">
  <span><b>Free 30-minute First Step call</b><small>No pressure, no commitment</small></span>
  ${btn("Book", `${base}work-with-me.html`, "btn--clay btn--sm", 'tabindex="-1"')}
</div>`;
}

/* ---------- Document ---------- */
export function page({ slug, path, title, description, body, base = "", current = "", cta, schema = [], scripts = [], ogImage = "og.jpg", noindex = false, bodyClass = "" }) {
  const url = `${SITE.url}/${path === "index.html" ? "" : path}`;
  const fullTitle = title.includes("Take Root") ? title : `${title} — Take Root Life Coaching`;
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${SITE.url}/#business`,
      name: SITE.name,
      url: SITE.url,
      email: SITE.email,
      image: `${SITE.url}/assets/img/adrienne-hero-1200.webp`,
      logo: `${SITE.url}/assets/img/icon-512.png`,
      description: "One-on-one, whole-person life coaching with Adrienne Phelps. Virtual sessions focused on self-discovery, career alignment and well-being.",
      priceRange: "$0–$390",
      areaServed: "United States",
      address: { "@type": "PostalAddress", addressLocality: "Raleigh", addressRegion: "NC", addressCountry: "US" },
      founder: { "@type": "Person", name: "Adrienne Phelps", jobTitle: "Life Coach" },
      sameAs: [SITE.instagram, SITE.facebook],
    },
    ...schema,
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#11301d">
<meta property="og:type" content="${slug === "article" ? "article" : "website"}">
<meta property="og:site_name" content="Take Root Life Coaching">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}/assets/img/${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${base}assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${base}assets/img/apple-touch-icon.png">
<link rel="manifest" href="${base}site.webmanifest">
<link rel="preload" href="${base}assets/fonts/inter-tight.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${base}assets/fonts/fraunces-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/css/main.css">
<script>(function(d){d.classList.add('js');setTimeout(function(){if(!d.classList.contains('is-ready'))d.classList.remove('js')},3000)})(document.documentElement);</script>
<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld)}</script>
</head>
<body id="top" class="${bodyClass}">
${header(base, current)}
<main id="main">
${body}
</main>
${footer(base, cta)}
<script src="${base}assets/vendor/gsap.min.js" defer></script>
<script src="${base}assets/vendor/ScrollTrigger.min.js" defer></script>
<script src="${base}assets/js/main.js" defer></script>
${scripts.map((s) => `<script src="${base}assets/js/${s}" defer></script>`).join("\n")}
</body>
</html>
`;
}

/** Inner page hero, shared by every page except home. */
export function phero({ crumbs = [], title, lead = "", media = "", mediaAlt = "", mediaPos = "", caption = "", meta = [], buttons = "", base = "", long = false, side = "" }) {
  const lines = title.map((t) => `<span class="line"><span>${t}</span></span>`).join("");
  return `<section class="phero">
  ${rootLines}
  <div class="wrap">
    <div class="phero-grid">
      <div>
        <nav class="crumbs fade-in" aria-label="Breadcrumb"><a href="${base}index.html">Home</a>${crumbs.map((c) => `<i></i>${c}`).join("")}</nav>
        <h1 class="h1${long ? " is-long" : ""}">${lines}</h1>
        ${lead ? `<p class="lead fade-in">${lead}</p>` : ""}
        ${buttons ? `<div class="btn-row fade-in">${buttons}</div>` : ""}
      </div>
      ${media ? `<figure class="phero-media">${img(media, { alt: mediaAlt, sizes: "(max-width: 1024px) 100vw, 40vw", eager: true, base, style: mediaPos ? `object-position:${mediaPos}` : "" })}${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>` : side}
    </div>
    ${meta.length ? `<div class="phero-meta fade-in">${meta.map((m) => `<span>${m}</span>`).join("")}</div>` : ""}
  </div>
</section>`;
}

export const testimonials = [
  {
    name: "Rene K.", tone: "", initial: "R",
    text: "Adrienne came into my life when I didn’t know I needed her most. Her advice and support has guided me through many challenges in my life. Adrienne’s empathetic and realistic perspective has helped me look at life in a different way that I could have never adopted on my own. <strong>I have achieved new goals, altered my way of thinking and opened my world to more possibilities.</strong> I highly recommend Adrienne’s life coaching to anyone looking to improve their lifestyle whether it be personal or professional.",
  },
  {
    name: "Elizabeth K.", tone: "avatar--clay", initial: "E",
    text: "From the day I met Adrienne, I found it very easy to speak with her about any concerns or troubles I was having. I had a major life and career shift over the span of a few months (including moving across the country) and Adrienne was more than helpful at pointing me in the right direction. She gave me confidence to try new things and go outside my comfort zone. <strong>I have reached a point in my life and career where I am feeling happy and successful, thanks to her help.</strong> I would utilize her life coaching skills again, no questions asked!",
  },
  {
    name: "Anne K.", tone: "avatar--moss", initial: "A",
    text: "Talking to Adrienne helped me feel like it was possible to do things beyond what I thought I could do and <strong>helped me become a better me.</strong> I am so grateful to talk to someone so personal and understanding as well as having full confidence in me. Thank you so much Adrienne!",
  },
  {
    name: "K. Patel", tone: "avatar--sand", initial: "K",
    text: "We are all on a different journey influenced by our personal perspective. Having Adrienne as a confidant is helpful in navigating the paths and obstacles I encounter. <strong>I feel seen and validated whether I need advice or a listening ear.</strong> If you need another being in your corner… Adrienne is here!",
  },
];

export const tCard = (t, i = 0, style = "") => `<article class="card t-card${strip(t.text).length < 360 ? " is-short" : ""}" data-reveal style="--d:${i * 0.08}s;${style}">
  <span class="q" aria-hidden="true">“</span>
  <blockquote>${t.text}</blockquote>
  <div class="t-who"><span class="avatar ${t.tone}">${t.initial}</span><div><b>${t.name}</b><span>Coaching client</span></div></div>
</article>`;

export const faqs = [
  ["What is life coaching, and how is it different from therapy?", "Life coaching is future-focused. While therapy often works through past experiences and mental health, coaching starts from where you are now and helps you move forward. Coaching tends to feel lighter and lifts you up, while therapy can feel like it’s working downward into what’s underneath. Many of my clients have tried therapy and felt like something was still missing. Coaching can work alongside it, or stand on its own."],
  ["What can I expect from a coaching session?", "Each session is a focused, judgment-free space to think out loud. We’ll start with what’s on your mind that week, dig into what’s really going on beneath the surface, and leave with clarity on your next step. This is a process of self-discovery — you’ll walk away understanding yourself in ways you didn’t before, but coaching only works if you do the work between sessions too. I’ll help you build the self-efficacy to take action on your own, not depend on me to have the answers."],
  ["Who do you typically work with?", "I work with high-functioning adults who look like they have it all together on the outside, but feel restless, disconnected, or stuck on the inside. Many have tried therapy and are ready for something more forward-moving. If you’re successful by most measures but still asking “is this it?” — that’s who I’m here for."],
  ["How do I know if coaching is right for me?", "Coaching is a fit if you’re functioning well on paper but feel restless, stuck, or like something’s missing. You don’t need a crisis to justify coaching; you just need a willingness to get honest about what you want and take steps toward it. If you’re ready to do the work between sessions, not just talk about change, coaching can help you get there. You can reach me anytime via the contact page or email."],
  ["Are the sessions confidential?", "Yes. What you share in our sessions stays between us. I won’t share your information with anyone without your permission, except where I’m legally required to or where there’s a risk of serious harm to you or someone else."],
  ["How long is each session, and how often do we meet?", "Sessions typically run 45 to 50 minutes. Most clients meet weekly or every other week, especially at the start, so momentum builds and we can track progress between sessions. We’ll find a cadence that fits your schedule and goals."],
  ["Do you offer virtual or in-person sessions?", "All sessions are held virtually, making it easy to fit coaching into your life no matter where you are."],
  ["What’s the cost, and do you offer packages?", "I offer a free First Step call to talk through what you’re looking for. A single 50-minute session is $150, and the 3-session package is $390 ($130 per session) for clients ready to do real, ongoing work. For past package clients, I also offer Recurring Client sessions as a check-in when you need a tune-up."],
  ["How long should I commit to coaching?", "Most clients start with a package of several sessions, since real change tends to unfold over time rather than in a single conversation. We’ll check in along the way to see what’s working and adjust as needed."],
  ["What’s your cancellation policy?", "Fees are paid in advance when you book each session. If you need to cancel or reschedule, I ask for at least 24 hours’ notice. Cancellations made within 24 hours of your appointment are subject to a $50 fee, and missed sessions aren’t reimbursed or rescheduled unless we’ve agreed on that in advance."],
];

export const faqItem = ([q, a], i) => `<details class="faq-item"${i === 0 ? " open" : ""}>
  <summary><span class="mono">${String(i + 1).padStart(2, "0")}</span><h3>${q}</h3><span class="plus" aria-hidden="true"></span></summary>
  <div class="faq-body"><div><p>${a}</p></div></div>
</details>`;

export const faqSchema = (list) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: list.map(([q, a]) => ({ "@type": "Question", name: strip(q), acceptedAnswer: { "@type": "Answer", text: strip(a) } })),
});

export const postCard = (p, base = "", i = 0) => `<a class="post-card" href="${base}journal/${p.slug}.html" data-reveal style="--d:${(i % 3) * 0.08}s">
  <div class="media">${img(p.image, { alt: "", sizes: "(max-width: 760px) 100vw, (max-width: 1024px) 50vw, 33vw", base })}${arrowDot}</div>
  <div class="post-meta"><span class="tag">${p.tag}</span><i></i><span>${fmtDate(p.date)}</span><i></i><span>${p.minutes} min</span></div>
  <h3>${p.title}</h3>
  <p>${p.excerpt}</p>
</a>`;

export const marquee = (words) => {
  const group = words
    .map((w, i) => `<span class="marquee-item${i % 2 ? " i" : ""}">${w}</span><span class="marquee-sep">${icons.sprig}</span>`)
    .join("");
  return `<div class="marquee" aria-hidden="true"><div class="marquee-track"><div class="marquee-group">${group}</div><div class="marquee-group">${group}</div></div></div>`;
};
