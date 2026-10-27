// Builds the static site: src/pages/*.html + partials -> dist/
// Usage: node build.mjs   (no dependencies)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const out = join(root, "dist");
const SITE = "https://polish.nz";

const read = (p) => readFileSync(join(src, p), "utf8");
const partials = Object.fromEntries(
  readdirSync(join(src, "partials")).map((f) => [f.replace(/\.html$/, ""), read(join("partials", f))])
);

const icons = {
  arrow: '<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  arrowlink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.9L21 12l-7.2 3.1L12 22l-1.8-6.9L3 12l7.2-3.1z"/></svg>',
};

const nav = [
  ["coaching", "coaching.html", "Coaching"],
  ["programmes", "programmes.html", "Programmes"],
  ["approach", "approach.html", "Approach"],
  ["speaking", "speaking.html", "Speaking"],
  ["about", "about.html", "About"],
  ["insights", "insights.html", "Insights"],
];

function parse(file) {
  const raw = read(join("pages", file));
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (m) m[1].split("\n").forEach((l) => { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}

function fill(tpl, ctx) {
  return tpl
    .replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, n) => fill(partials[n] ?? "", ctx))
    .replace(/\{\{icon:(\w+)\}\}/g, (_, n) => icons[n] ?? "")
    .replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] ?? ""));
}

if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });
for (const dir of ["assets", "css", "js"]) cpSync(join(src, dir), join(out, dir), { recursive: true });

const pages = readdirSync(join(src, "pages")).filter((f) => f.endsWith(".html"));
for (const file of pages) {
  const { meta, body } = parse(file);
  const key = meta.nav || "";
  const navLinks = nav.map(([k, href, label]) => `<a class="nav__link" href="${href}"${k === key ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const mobileLinks = nav.map(([k, href, label], i) => `<li><a href="${href}"${k === key ? ' aria-current="page"' : ""}>${label}<small>0${i + 1}</small></a></li>`).join("") +
    `<li><a href="contact.html"${key === "contact" ? ' aria-current="page"' : ""}>Contact<small>0${nav.length + 1}</small></a></li>`;
  const scripts = (meta.scripts || "").split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => `<script src="js/${s}.js" defer></script>`).join("\n  ");
  const ctx = {
    title: meta.title ? `${meta.title} — Polish` : "Polish — AI Leadership & Executive Coaching, New Zealand",
    description: meta.description || "",
    canonical: `${SITE}/${file === "index.html" ? "" : file.replace(/\.html$/, "")}`,
    robots: meta.robots || "index, follow",
    bodyClass: meta.bodyClass || "",
    navLinks, mobileLinks, scripts,
  };
  ctx.content = fill(body, ctx);
  writeFileSync(join(out, file), fill(partials.layout, ctx));
  console.log("built", file);
}
