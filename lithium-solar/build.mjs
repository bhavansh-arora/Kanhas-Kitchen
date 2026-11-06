// Assembles src/pages/*.html with the shared partials into public/*.html.
// Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, 'src');
const out = path.join(root, 'public');

const SITE = {
  siteUrl: 'https://lisolarenergy.com',
  phone: '(951) 662-6748',
  phoneHref: 'tel:+19516626748',
  sms: 'sms:+19516626748',
  email: 'rowan@socalenergy.info',
  street: '12003 Fremont St',
  city: 'Yucaipa, CA 92399',
  year: String(new Date().getFullYear()),
};

const partial = (name) => fs.readFileSync(path.join(src, 'partials', `${name}.html`), 'utf8');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^<!--\s*\n([\s\S]*?)\n-->\s*\n/);
  const meta = {};
  if (m) {
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}

function fill(tpl, vars) {
  // {{> partial}} includes first, then {{var}} values.
  let s = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => partial(n));
  s = s.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => partial(n));
  return s.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_, k) => (k in vars ? vars[k] : `{{${k}}}`));
}

const pages = fs.readdirSync(path.join(src, 'pages')).filter((f) => f.endsWith('.html'));
for (const f of pages) {
  const { meta, body } = parse(path.join(src, 'pages', f));
  const vars = {
    ...SITE,
    title: meta.title || 'Lithium — Power for life',
    description: meta.description || '',
    page: meta.page || f.replace('.html', ''),
    bodyClass: meta.bodyClass || '',
    file: f === 'index.html' ? '' : f,
    image: meta.image || 'assets/img/roof-sunset-1000.webp',
  };
  const scripts = (meta.scripts || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `<script src="assets/js/${s}.js" defer></script>`)
    .join('\n');
  vars.pageScripts = scripts;

  let html = fill(partial('head') + partial('header') + body + partial('footer'), vars);
  // Mark the current page in every nav.
  html = html.replace(new RegExp(`data-nav="${vars.page}"`, 'g'), `data-nav="${vars.page}" aria-current="page"`);
  fs.writeFileSync(path.join(out, f), html);
  console.log('built', f);
}
