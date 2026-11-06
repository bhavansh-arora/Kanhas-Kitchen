import { page, phero, btn, linkU, img, sh, icons, testimonials, tCard, SITE } from "../lib.mjs";

const ext = 'target="_blank" rel="noopener"';

const body = `
${phero({
  crumbs: ["Book a session"],
  title: ["You’ve found your way here.", "<em>That’s the first step.</em>"],
  long: true,
  lead: "Whether something has been quietly nagging at you for a while or you’ve reached a point where you know something needs to change — reaching out takes courage. I’m glad you’re here.",
  buttons: btn("Choose a time", "#book", "btn--clay") + btn("Ask a question first", "contact.html", "btn--ghost-light"),
  media: "adrienne-sofa",
  mediaAlt: "Adrienne Phelps smiling on a sofa",
  caption: "<span>Free · 30 minutes</span><span>No pressure</span>",
  meta: ["Free 30-minute First Step call", "Virtual sessions", "Pick a time that suits you"],
})}

<section class="section" id="book" style="scroll-margin-top:60px">
  <div class="wrap">
    ${sh("01", "Book your time", "New or returning")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>Are you a new or <em>returning</em> client?</h2>
      <div data-reveal style="--d:.1s;justify-self:end">
        <div class="seg" role="tablist" aria-label="Client type">
          <span class="seg-thumb" aria-hidden="true"></span>
          <button type="button" role="tab" id="tab-new" aria-controls="panel-new" aria-selected="true" data-hash="new">New client</button>
          <button type="button" role="tab" id="tab-returning" aria-controls="panel-returning" aria-selected="false" tabindex="-1" data-hash="returning">Returning client</button>
        </div>
      </div>
    </div>

    <div class="book-panel" id="panel-new" role="tabpanel" aria-labelledby="tab-new">
      <div class="book-grid">
        <div class="card card--forest book-main">
          <div class="card-top"><span class="mono">Start here · Free</span><span class="badge">30 min</span></div>
          <h3 class="h2" style="margin-top:clamp(28px,4vw,56px)">Start with a free <em>First Step</em> call.</h3>
          <p class="lead" style="margin-top:18px;max-width:520px">No pressure, no commitment — just an honest conversation to see if we’re a good fit.</p>
          <ul class="tick-list" style="max-width:520px">
            <li>Share what’s been on your mind, in your own words</li>
            <li>Ask anything about how coaching works</li>
            <li>Leave with clarity on your next step — whatever you decide</li>
          </ul>
          <div class="btn-row">${btn("Choose a time", SITE.bookNew, "btn--clay", ext)}${btn("Take the Footing Check first", "footing-check.html", "btn--ghost-light")}</div>
        </div>
        <div class="card">
          <span class="mono">What happens next</span>
          <ol class="next-steps" style="margin-top:14px">
            <li><span class="n">01</span><div><b>Pick a time that suits you</b><p>Choose a date and time on the calendar that feels right for you.</p></div></li>
            <li><span class="n">02</span><div><b>Get your confirmation</b><p>You’ll receive an email with everything you need, including the video link.</p></div></li>
            <li><span class="n">03</span><div><b>We talk, virtually</b><p>Thirty relaxed minutes. Bring a coffee, bring your questions — no preparation needed.</p></div></li>
            <li><span class="n">04</span><div><b>You decide</b><p>If it feels right, we choose a single session or the 3-session package together.</p></div></li>
          </ol>
        </div>
      </div>
    </div>

    <div class="book-panel" id="panel-returning" role="tabpanel" aria-labelledby="tab-returning" hidden>
      <div class="book-grid">
        <div class="card card--clay book-main">
          <div class="card-top"><span class="mono">Returning clients</span><span class="badge">Welcome back</span></div>
          <h3 class="h2" style="margin-top:clamp(28px,4vw,56px)">Welcome <em>back.</em></h3>
          <p style="margin-top:18px;max-width:520px;font-size:clamp(1.08rem,1.3vw,1.28rem);line-height:1.55">I’m looking forward to continuing the work together. Book your next session whenever you’re ready.</p>
          <ul class="tick-list" style="max-width:520px">
            <li>Recurring Client sessions for a check-in or tune-up</li>
            <li>Single sessions or a new 3-session package</li>
            <li>Same judgment-free space, picking up where we left off</li>
          </ul>
          <div class="btn-row">${btn("Book my next session", SITE.bookReturning, "", ext)}</div>
        </div>
        <div class="card">
          <span class="mono">Session options</span>
          <ol class="next-steps" style="margin-top:14px">
            <li><span class="n">${icons.leaf.replace('aria-hidden="true"', 'aria-hidden="true" style="width:18px"')}</span><div><b>Recurring Client session</b><p>For past package clients — a check-in whenever you need a tune-up.</p></div></li>
            <li><span class="n">$150</span><div><b>Single session · 50 minutes</b><p>A focused session to work through what’s on your mind.</p></div></li>
            <li><span class="n">$390</span><div><b>3-session package · $130 each</b><p>Space and continuity to go deeper. Save $60.</p></div></li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("02", "Not ready to book?", "That’s okay")}
    <div class="bento">
      <a class="card card--img b-7" href="footing-check.html" style="min-height:420px" data-reveal>
        ${img("forest-path", { alt: "", sizes: "(max-width: 1024px) 100vw, 58vw" })}
        <div class="card-top"><span class="mono">Free · 2 minutes</span></div>
        <div class="card-foot"><div><h3 class="h3">Take the <em>Footing Check.</em></h3><p style="margin-top:10px;max-width:420px">A private, two-minute reflection across six areas of your life. Bring your results to our first call.</p></div>${`<span class="arrow-dot">${icons.arrow}</span>`}</div>
      </a>
      <a class="card b-5" href="contact.html" style="display:flex;flex-direction:column;justify-content:space-between;min-height:420px" data-reveal>
        <div class="card-top"><div class="icon-badge">${icons.mail}</div><span class="arrow-dot">${icons.arrow}</span></div>
        <div><h3 class="h3">Talk it through <em>first.</em></h3><p class="muted" style="margin-top:10px">Fill out the short contact form and I’ll reach out so we can talk it through before you book anything.</p></div>
      </a>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("03", "Kind words", "From real clients")}
    <div class="bento">
      <div class="b-6">${tCard(testimonials[2], 0, "height:100%;min-height:0")}</div>
      <div class="b-6">${tCard(testimonials[3], 0, "height:100%;min-height:0")}</div>
    </div>
  </div>
</section>
`;

export default {
  path: "work-with-me.html",
  html: page({
    slug: "book",
    path: "work-with-me.html",
    title: "Book a Session",
    description: "Book a free 30-minute First Step call with Adrienne Phelps, or schedule your next coaching session as a returning client. All sessions held virtually.",
    current: "book",
    body,
    bodyClass: "no-sticky",
    cta: { title: "Questions before you <em>book?</em>", text: "Send a quick message and I’ll get back to you personally, as soon as possible." },
  }),
};
