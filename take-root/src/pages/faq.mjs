import { page, phero, btn, linkU, img, sh, icons, faqs, faqItem, faqSchema, SITE } from "../lib.mjs";

const body = `
${phero({
  crumbs: ["FAQ"],
  title: ["Your questions,", "<em>answered.</em>"],
  lead: "Everything you might be wondering before you reach out — from how coaching differs from therapy to what a session actually feels like.",
  buttons: btn("Book a free call", "work-with-me.html", "btn--clay") + btn("Ask your own question", "contact.html", "btn--ghost-light"),
  media: "conversation",
  mediaAlt: "Two women talking in front of a laptop",
  caption: `<span>${faqs.length} questions</span><span>Answered by Adrienne</span>`,
  meta: ["Coaching vs therapy", "Sessions &amp; pricing", "Confidentiality", "Cancellations"],
})}

<section class="section">
  <div class="wrap">
    ${sh("01", "Frequently asked", `${faqs.length} questions`)}
    <div class="faq-layout">
      <aside class="faq-aside">
        <div class="card card--forest" data-reveal>
          <span class="mono">Still have a question?</span>
          <h2 class="h3" style="margin-top:40px">Let’s just <em>talk.</em></h2>
          <p style="margin-top:12px">The free 30-minute First Step call is the easiest way to get a real answer — and see if we’re a good fit.</p>
          <div class="btn-row" style="margin-top:26px">${btn("Book a free call", "work-with-me.html", "btn--clay")}</div>
          <p style="margin-top:22px;padding-top:18px;border-top:1px solid var(--line-light);font-size:14.5px">Prefer email? <a href="mailto:${SITE.email}" style="color:var(--ember)">${SITE.email}</a></p>
        </div>
      </aside>
      <div class="faq-list" data-reveal>${faqs.map(faqItem).join("")}</div>
    </div>
  </div>
</section>
`;

export default {
  path: "faq.html",
  html: page({
    slug: "faq", path: "faq.html", title: "FAQ",
    description: "Answers about life coaching with Adrienne Phelps: how coaching differs from therapy, what to expect in a session, pricing, confidentiality and cancellations.",
    current: "faq", body, schema: [faqSchema(faqs)],
  }),
};
