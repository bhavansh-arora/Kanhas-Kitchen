// Builds the static site: wraps each page in src/pages with the shared
// head, header, menu, closing CTA and footer, then writes it to the site root.
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const part = (name) => readFileSync(join(src, "partials", name + ".html"), "utf8");

const SITE_URL = "https://georgedupontleadership.com";
const VERSION = Date.now().toString(36);

const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
  btn: '<span class="btn__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4v11H3zM9.5 9.75h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.45h-4v-4.83c0-1.15-.02-2.64-1.6-2.64-1.61 0-1.86 1.26-1.86 2.55v4.92h-4z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.75 15.02V8.98L15.5 12z"/></svg>',
  spotify: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21zm4.8 15.15a.65.65 0 0 1-.9.22c-2.46-1.5-5.55-1.84-9.2-1.01a.65.65 0 1 1-.29-1.27c3.99-.91 7.42-.52 10.17 1.16.31.19.41.59.22.9zm1.28-2.85a.82.82 0 0 1-1.12.27c-2.81-1.73-7.1-2.23-10.43-1.22a.82.82 0 1 1-.47-1.56c3.8-1.15 8.53-.59 11.75 1.39.38.23.5.74.27 1.12zm.11-2.97C14.82 8.83 9.27 8.65 6.06 9.62a.98.98 0 1 1-.57-1.88c3.69-1.12 9.81-.9 13.68 1.4a.98.98 0 0 1-1 1.69z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.24-1.46 1.49-1.46h1.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.87 1.4-3.87 3.98v2.22H7.8v3h2.6V21z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
  cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 21h8M9 18h6"/></svg>',
};

const nav = [
  ["index", "index.html", "Home"],
  ["dynastydna", "dynastydna.html", "DynastyDNA™"],
  ["engagement", "engagement.html", "90-Day Engagement"],
  ["speaking", "speaking.html", "Speaking"],
  ["about", "about.html", "About George"],
  ["scorecard", "scorecard.html", "Dynasty Scorecard"],
  ["contact", "contact.html", "Contact"],
];

function fill(html, vars) {
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : k in icons ? icons[k] : m));
  return html;
}

function markActive(html, page) {
  // aria-current on any link that points at the current page
  const file = nav.find((n) => n[0] === page)?.[1];
  if (!file) return html;
  return html.replace(new RegExp(`href="${file}"(?![^>]*aria-current)`, "g"), `href="${file}" aria-current="page"`);
}

const pagesDir = join(src, "pages");
const files = readdirSync(pagesDir).filter((f) => f.endsWith(".html"));

for (const f of files) {
  const raw = readFileSync(join(pagesDir, f), "utf8");
  const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`${f}: missing meta comment`);
  const meta = JSON.parse(m[1]);
  const body = raw.slice(m[0].length);
  const page = f.replace(/\.html$/, "");
  const canonical = page === "index" ? `${SITE_URL}/` : `${SITE_URL}/${f}`;
  const vars = {
    title: meta.title,
    desc: meta.desc,
    canonical,
    page,
    ogImage: `${SITE_URL}/assets/img/og-image.jpg`,
    v: VERSION,
    bodyClass: meta.bodyClass || "",
  };
  let headerHtml = markActive(part("header"), page);
  let out = [
    part("head"),
    headerHtml,
    `<main id="main">`,
    body.trim(),
    meta.noCta ? "" : part("cta"),
    `</main>`,
    part("footer"),
  ].join("\n");
  out = fill(out, vars);
  // Keep ™ small inside display headings
  out = out.replace(/<(h[1-3]|p class="statement")([^>]*)>([\s\S]*?)<\/(h[1-3]|p)>/g, (m) => m.replace(/™/g, '<sup class="tm">™</sup>'));
  writeFileSync(join(root, f), out);
  console.log("built", f);
}
