// Builds the static site: each page in _src/pages is wrapped in the shared
// layout (head, header, footer, cart drawer) and written to the site root.
// Run with: node build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, '_src');
const partial = (name) => readFileSync(join(src, 'partials', `${name}.html`), 'utf8');
const layout = partial('layout');

const SITE_URL = 'https://www.dancecart.com.au';

for (const file of readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.html'))) {
  const raw = readFileSync(join(src, 'pages', file), 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${file}: missing front matter`);

  const meta = Object.fromEntries(
    match[1].split('\n').filter(Boolean).map((line) => {
      const i = line.indexOf(':');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
  );
  const body = raw.slice(match[0].length);
  const page = meta.page || file.replace('.html', '');

  // Mark the current page in the nav.
  const header = partial('header').replace(
    new RegExp(`data-nav="${page}"`, 'g'),
    `data-nav="${page}" aria-current="page"`
  );

  const scripts = (meta.scripts || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => `  <script src="assets/js/${s}.js" defer></script>`)
    .join('\n');

  const vars = {
    title: meta.title,
    description: meta.description,
    page,
    canonical: `${SITE_URL}/${file === 'index.html' ? '' : file}`,
    robots: meta.robots || 'index, follow',
    bodyClass: meta.bodyClass || '',
    header,
    footer: meta.footer === 'none' ? '' : partial('footer'),
    drawer: partial('drawer'),
    preloader: partial('preloader'),
    scripts,
    content: body.trim(),
  };

  const html = layout.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`${file}: unknown variable ${key}`);
    return vars[key] ?? '';
  });

  writeFileSync(join(root, file), html);
  console.log(`built ${file}`);
}
