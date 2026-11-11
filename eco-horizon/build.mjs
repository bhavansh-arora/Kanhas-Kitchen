// Static site build for the Eco Horizon concept.
// Each page in src/pages is wrapped in src/partials/layout.html.
// Usage: node build.mjs   ->  writes the finished site to ./dist
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const out = join(root, 'dist');

const partial = (name) => readFileSync(join(src, 'partials', `${name}.html`), 'utf8');

// {{> name}} pulls in a partial (partials may include other partials).
const expand = (html, depth = 0) => {
  if (depth > 5) return html;
  return html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => expand(partial(n), depth + 1));
};

// Pages start with a <!-- key: value --> block for their metadata.
const parseMeta = (html) => {
  const m = html.match(/^<!--([\s\S]*?)-->\s*/);
  const meta = {};
  if (!m) return { meta, body: html };
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: html.slice(m[0].length) };
};

if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });
cpSync(join(src, 'assets'), join(out, 'assets'), { recursive: true });

const layout = partial('layout');
const pages = readdirSync(join(src, 'pages')).filter((f) => f.endsWith('.html'));

for (const file of pages) {
  const { meta, body } = parseMeta(readFileSync(join(src, 'pages', file), 'utf8'));
  let html = layout
    .replace('{{content}}', expand(body))
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => expand(partial(n)));
  const vars = {
    title: meta.title || 'Eco Horizon',
    description: meta.description || '',
    bodyClass: meta.bodyClass || '',
    page: file.replace('.html', ''),
    scripts: (meta.scripts || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `<script src="assets/js/${s}.js" defer></script>`)
      .join('\n  '),
  };
  html = html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));
  // Mark the current nav item.
  const navs = [vars.page, ...(meta.nav || '').split(',').map((s) => s.trim()).filter(Boolean)];
  for (const nav of navs) {
    html = html.replace(new RegExp(`data-nav="${nav}"`, 'g'), `data-nav="${nav}" aria-current="page"`);
  }
  writeFileSync(join(out, file), html);
  console.log('built', file);
}
