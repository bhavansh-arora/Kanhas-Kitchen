// Builds the static site: src/pages/*.html + src/partials -> ./*.html
// No dependencies. Run with: node build.mjs
//
// Template syntax
//   {{site.links.bookCall}}         value from src/site.json
//   {{page.title}}                  value from the page's front matter
//   {{> partial-name}}              contents of src/partials/partial-name.html
//   {{nav:coaching}}                aria-current="page" when the page's nav is "coaching"
//   {{img name | alt | sizes | class | eager}}   responsive <img> from assets/img

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const site = JSON.parse(readFileSync(join(src, 'site.json'), 'utf8'));
const images = JSON.parse(readFileSync(join(src, 'images.json'), 'utf8'));
const read = (p) => readFileSync(join(src, p), 'utf8');

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function img(args) {
  const [name, alt = '', sizes = '100vw', cls = '', eager = ''] = args.split('|').map((s) => s.trim());
  const meta = images[name];
  if (!meta) throw new Error(`Unknown image "${name}"`);
  const srcset = meta.widths.map((w) => `assets/img/${name}-${w}.webp ${w}w`).join(', ');
  const fallback = `assets/img/${name}-${meta.widths[meta.widths.length - 1]}.webp`;
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<img src="${fallback}" srcset="${srcset}" sizes="${sizes}" width="${meta.w}" height="${meta.h}" alt="${alt}"${cls ? ` class="${cls}"` : ''} ${loading}>`;
}

function render(tpl, page, depth = 0) {
  if (depth > 10) throw new Error('Partial nesting too deep');
  return tpl
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => render(read(`partials/${name}.html`), page, depth + 1))
    .replace(/\{\{img\s+([^}]+)\}\}/g, (_, args) => img(args))
    .replace(/\{\{nav:([\w-]+)\}\}/g, (_, key) => (page.nav === key ? ' aria-current="page"' : ''))
    .replace(/\{\{(site|page)\.([\w.]+)\}\}/g, (m, scope, path) => {
      const v = get(scope === 'site' ? site : page, path);
      if (v === undefined) throw new Error(`Missing value ${m} in ${page.file}`);
      return v;
    });
}

function parse(file) {
  const raw = read(`pages/${file}`);
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const page = { file, slug: file.replace(/\.html$/, ''), bodyClass: '', nav: '' };
  if (m) {
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) page[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  page.content = m ? raw.slice(m[0].length) : raw;
  page.path = page.slug === 'index' ? '' : file;
  page.canonical = `${site.url}/${page.path}`;
  page.year = String(new Date().getFullYear());
  return page;
}

const layout = read('partials/layout.html');
const pages = readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.html')).sort().map(parse);

for (const page of pages) {
  page.content = render(page.content, page);
  writeFileSync(join(root, page.file), render(layout, page));
  console.log('built', page.file);
}

const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .filter((p) => p.slug !== '404')
  .map((p) => `  <url><loc>${p.canonical}</loc><lastmod>${today}</lastmod></url>`)
  .join('\n');
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
console.log('built sitemap.xml');
