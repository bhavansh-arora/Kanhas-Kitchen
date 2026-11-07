import { page, phero, btn, linkU, img, sh, icons, arrowDot, posts, postCard, fmtDate, esc, strip, SITE } from "../lib.mjs";

const [first, ...rest] = posts;

const index = `
${phero({
  crumbs: ["Journal"],
  title: ["Notes on growing,", "<em>letting go</em> &amp;", "finding your footing."],
  long: true,
  lead: "Honest stories from everyday life — gardens, CrossFit, teenagers and trash cans — and what they teach us about boundaries, balance and change.",
  media: "post-garden",
  mediaAlt: "Small blue flowers growing through dry leaves",
  caption: `<span>${posts.length} entries</span><span>By Adrienne Phelps</span>`,
  meta: [...new Set(posts.map((p) => p.tag))].slice(0, 5),
})}

<section class="section">
  <div class="wrap">
    ${sh("01", "Latest entry", fmtDate(first.date))}
    <a class="post-card post-feature" href="journal/${first.slug}.html" data-reveal>
      <div class="media">${img(first.image, { alt: "", sizes: "(max-width: 1024px) 100vw, 60vw" })}${arrowDot}</div>
      <div>
        <div class="post-meta" style="margin-top:0"><span class="tag">${first.tag}</span><i></i><span>${first.minutes} min read</span></div>
        <h3 style="margin-top:16px">${first.title}</h3>
        <p>${first.excerpt}</p>
        <span class="link-u">Read the entry ${icons.arrow}</span>
      </div>
    </a>
    ${sh("02", "All entries", `${rest.length} more`)}
    <div class="posts posts--4">${rest.map((p, i) => postCard(p, "", i)).join("")}</div>
  </div>
</section>
`;

const articles = posts.map((p, i) => {
  const base = "../";
  const prev = posts[(i + 1) % posts.length];
  const next = posts[(i + 2) % posts.length];
  const desc = strip(p.excerpt).slice(0, 155);
  const body = `
<div class="progress" aria-hidden="true"></div>
${phero({
  base,
  crumbs: [`<a href="../journal.html">Journal</a>`, p.tag],
  title: [p.title],
  long: true,
  lead: `${fmtDate(p.date)} · ${p.minutes} min read · By Adrienne Phelps`,
  media: p.image,
  mediaAlt: "",
  caption: `<span>${p.tag}</span><span>Take Root Journal</span>`,
})}
<article class="article">
  <div class="wrap-narrow">
    ${p.quote ? `<figure class="article-quote" data-reveal><p>${p.quote.text}</p>${p.quote.cite ? `<cite>— ${p.quote.cite}</cite>` : ""}</figure>` : ""}
    <div class="prose">${p.body.map(([, html]) => `<p>${html}</p>`).join("\n")}</div>
    <div class="author" data-reveal>
      ${img("adrienne-standing", { alt: "Adrienne Phelps", sizes: "88px", base })}
      <div><b>Adrienne Phelps</b><p>Whole-person life coach and founder of Take Root. If this one landed, let’s talk about it.</p></div>
      ${btn("Book a free call", "../work-with-me.html", "btn--clay btn--sm")}
    </div>
  </div>
</article>
<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("→", "Keep reading", "From the journal")}
    <div class="posts">${[prev, next].map((q, j) => postCard(q, base, j)).join("")}
      <a class="card card--forest card-split journal-card" href="../journal.html" style="--d:.16s" data-reveal>
        <span class="mono">The journal</span>
        <div><h3 class="h3">All <em>${posts.length} entries</em></h3><p style="margin-top:10px">Stories and reflections on boundaries, balance, letting go and finding your footing.</p></div>
        <div class="card-foot"><span></span>${arrowDot}</div>
      </a>
    </div>
  </div>
</section>`;
  return {
    path: `journal/${p.slug}.html`,
    html: page({
      slug: "article", path: `journal/${p.slug}.html`, base, title: strip(p.title), description: desc, current: "journal", body,
      ogImage: `${p.image}-1200.webp`,
      schema: [{
        "@context": "https://schema.org", "@type": "BlogPosting", headline: strip(p.title), datePublished: p.date,
        image: `${SITE.url}/assets/img/${p.image}-1200.webp`, author: { "@type": "Person", name: "Adrienne Phelps" },
        publisher: { "@id": `${SITE.url}/#business` }, mainEntityOfPage: `${SITE.url}/journal/${p.slug}.html`, description: desc,
      }],
    }),
  };
});

export default [
  { path: "journal.html", html: page({ slug: "journal", path: "journal.html", title: "Journal", description: "Reflections from life coach Adrienne Phelps on letting go, boundaries, balance, decisions and finding your footing.", current: "journal", body: index }) },
  ...articles,
];
