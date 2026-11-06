// Builds the static site into ./site from the page modules in ./src/pages.
// Usage: node src/build.mjs
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcDir = dirname(fileURLToPath(import.meta.url));
const out = join(srcDir, "..", "site");
const pagesDir = join(srcDir, "pages");

let count = 0;
const indexed = [];
for (const file of readdirSync(pagesDir).filter((f) => f.endsWith(".mjs")).sort()) {
  const mod = await import(pathToFileURL(join(pagesDir, file)));
  const list = Array.isArray(mod.default) ? mod.default : [mod.default];
  for (const p of list) {
    const target = join(out, p.path);
    mkdirSync(dirname(target), { recursive: true });
    const dup = p.html.match(/<[^>]*\sstyle="[^"]*"[^>]*\sstyle="[^>]*>/);
    if (dup) console.warn(`Duplicate style attribute in ${p.path}: ${dup[0].slice(0, 120)}`);
    writeFileSync(target, p.html);
    if (!p.html.includes('content="noindex')) indexed.push(p.path);
    count++;
  }
}
const SITE_URL = "https://www.takerootlifecoaching.com";
const today = new Date().toISOString().slice(0, 10);
const loc = (path) => `${SITE_URL}/${path === "index.html" ? "" : path}`;
writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexed.map((path) => `  <url><loc>${loc(path)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
writeFileSync(join(out, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /ideas.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
writeFileSync(join(out, "site.webmanifest"), JSON.stringify({
  name: "Take Root Life Coaching", short_name: "Take Root", start_url: "./index.html", display: "standalone",
  background_color: "#f3ede1", theme_color: "#11301d",
  icons: [{ src: "assets/img/apple-touch-icon.png", sizes: "180x180", type: "image/png" }, { src: "assets/img/icon-512.png", sizes: "512x512", type: "image/png" }],
}, null, 2));
console.log(`Built ${count} pages (+ sitemap, robots, manifest) into ${out}`);
