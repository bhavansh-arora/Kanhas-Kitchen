import { page, phero, btn, linkU, sh, icons, faqs, faqItem, SITE } from "../lib.mjs";

const topics = [
  [icons.career, "Career <em>alignment</em>", "Good job, wrong fit? Get clear on what you want from work — and what a better-aligned next move looks like.", "Get on a train. Any train.", "get-on-a-train-any-train"],
  [icons.path, "Life <em>transitions</em>", "A move, an empty nest, a new chapter. Find your footing when the ground is shifting under you.", "What the garden taught me about letting go", "what-the-garden-taught-me-about-letting-go"],
  [icons.heart, "Health &amp; <em>well-being</em>", "Rethink the habits that drain you and build ones that actually fit your body, energy and life.", "I was a mule in a previous life", "i-was-a-mule-in-a-previous-life"],
  [icons.shield, "Boundaries &amp; <em>saying no</em>", "Protect your time, energy and well-being — without guilt, and without losing who you are to others.", "I draw the line at maggots", "i-draw-the-line-at-maggots"],
  [icons.balance, "Balance &amp; <em>burnout</em>", "Stop running on autopilot. Find the “just right” place between pushing too hard and coasting.", "The genius of Goldilocks", "the-genius-of-goldilocks"],
  [icons.spark, "Confidence &amp; <em>self-belief</em>", "Quiet the inner critic, take up space, and try the thing you’ve been talking yourself out of.", "Pouring jet fuel on a burning building", "pouring-jet-fuel-on-an-already-burning-building"],
];

const body = `
${phero({
  crumbs: ["Coaching"],
  title: ["Life coaching,", "<em>one conversation</em>", "at a time."],
  long: true,
  lead: "Coaching isn’t about being told what to do — it’s about finally having the space to figure out what you actually want.",
  buttons: btn("Book a free call", "work-with-me.html", "btn--clay") + btn("See pricing", "#pricing", "btn--ghost-light"),
  media: "adrienne-laptop",
  mediaAlt: "Adrienne in a virtual coaching session",
  caption: "<span>Sessions held virtually</span><span>50 minutes</span>",
  meta: ["Free First Step call", "Single session · $150", "3-session package · $390", "100% virtual"],
})}

<section class="section">
  <div class="wrap">
    ${sh("01", "The approach", "Judgment-free · forward-moving")}
    <p class="statement" data-words>Every session is a judgment-free zone where we slow down, dig deeper, and start building clarity <em>from the inside out.</em> Whether you’re just curious or ready to dive in, there’s a simple way to get started.</p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("02", "What we can work on", "Six common starting points")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>Whatever’s been <em>quietly nagging</em> at you.</h2>
      <p class="lead" data-reveal style="--d:.1s">You don’t need a crisis to justify coaching. Most clients arrive with a feeling more than a goal — and that’s exactly the right place to start.</p>
    </div>
    <div class="topics">
      ${topics.map(([ic, h, p, read, slug], i) => `<div class="card topic${i === 4 ? " card--sand" : ""}" data-reveal style="--d:${(i % 3) * 0.07}s">
        <div class="icon-badge">${ic}</div>
        <h3 class="h4">${h}</h3>
        <p style="margin-top:10px">${p}</p>
        ${linkU(`Read: ${read}`, `journal/${slug}.html`)}
      </div>`).join("")}
    </div>
  </div>
</section>

<section class="section" id="pricing" style="padding-top:0;scroll-margin-top:40px">
  <div class="wrap">
    ${sh("03", "Investment", "Simple, transparent pricing")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>Choose how you’d like to <em>begin.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">Start with a free conversation. When you’re ready, book a single session — or commit to three and go deeper for less.</p>
    </div>
    <div class="pricing">
      <article class="card plan" data-reveal>
        <div class="card-top"><span class="mono">01 — Start here</span><span class="badge">Free</span></div>
        <h3 class="h4">First Step <em>call</em></h3>
        <div class="price"><sup>$</sup>0<small>/ 30 min</small></div>
        <p class="muted">An honest conversation to see if we’re a good fit. No pressure, no commitment.</p>
        <ul class="tick-list">
          <li>Talk through what’s on your mind</li>
          <li>Ask anything about how coaching works</li>
          <li>Leave with clarity on a next step</li>
        </ul>
        ${btn("Book your free call", "work-with-me.html", "btn--ghost")}
      </article>
      <article class="card card--forest plan plan--featured" data-reveal style="--d:.08s">
        <div class="card-top"><span class="mono">03 — Most popular</span><span class="badge">Save $60</span></div>
        <h3 class="h4">3-session <em>package</em></h3>
        <div class="price"><sup>$</sup>390<small>/ $130 each</small></div>
        <p>The space and continuity to go deeper — discovering patterns, building clarity, and taking meaningful steps forward.</p>
        <ul class="tick-list">
          <li>Three 50-minute sessions</li>
          <li>Momentum built week to week</li>
          <li>Progress tracked between sessions</li>
          <li>Recurring Client tune-ups afterwards</li>
        </ul>
        ${btn("Start with a free call", "work-with-me.html", "btn--clay")}
      </article>
      <article class="card plan" data-reveal style="--d:.16s">
        <div class="card-top"><span class="mono">02 — Explore</span><span class="badge">50 min</span></div>
        <h3 class="h4">Single <em>session</em></h3>
        <div class="price"><sup>$</sup>150<small>/ session</small></div>
        <p class="muted">A focused session to work through what’s on your mind. Perfect if you want to explore coaching before committing to a package.</p>
        <ul class="tick-list">
          <li>One focused 50-minute session</li>
          <li>Judgment-free space to think out loud</li>
          <li>A clear next step to take away</li>
        </ul>
        ${btn("Book a session", "work-with-me.html", "btn--ghost")}
      </article>
    </div>
    <div class="note-bar" data-reveal>
      <p><b>Worked with me before?</b> Past package clients can book Recurring Client sessions — a check-in whenever you need a tune-up.</p>
      ${linkU("Returning client booking", "work-with-me.html#returning")}
    </div>
  </div>
</section>

<section class="panel panel--dark">
  <div class="wrap">
    ${sh("04", "Inside a session", "45–50 minutes · on video")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>What a session <em>feels like.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">A focused, judgment-free space to think out loud. You’ll walk away understanding yourself in ways you didn’t before.</p>
    </div>
    <div class="flow">
      <div class="flow-item" data-reveal><div class="num">01</div><h3 class="h3">Arrive as <em>you are.</em></h3><p>We start with what’s on your mind that week — no prep, no performance. Just honesty.</p></div>
      <div class="flow-item" data-reveal style="--d:.08s"><div class="num">02</div><h3 class="h3">Dig <em>beneath</em> the surface.</h3><p>We look at what’s really going on underneath — the patterns, the values, the things standing in your way.</p></div>
      <div class="flow-item" data-reveal style="--d:.16s"><div class="num">03</div><h3 class="h3">Leave with a <em>next step.</em></h3><p>Every session ends with clarity on what’s next. The real change happens when you do the work between sessions.</p></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${sh("05", "Coaching or therapy?", "An honest comparison")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>Tried therapy and still feel <em>something’s missing?</em></h2>
      <p class="lead" data-reveal style="--d:.1s">Both are valuable. Many of my clients have tried therapy and were ready for something more forward-moving. Coaching can work alongside it, or stand on its own.</p>
    </div>
    <div class="compare" data-reveal>
      <div class="compare-row compare-head"><span class="label"></span><div class="coach"><h3 class="h4">Life <em>coaching</em></h3></div><div class="other"><h3 class="h4">Therapy</h3></div></div>
      <div class="compare-row"><span class="label">Focus</span><div class="coach"><p>The present and the future — where you are now and where you want to go.</p></div><div class="other"><p>Often works through past experiences and mental health.</p></div></div>
      <div class="compare-row"><span class="label">How it feels</span><div class="coach"><p>Lighter. It lifts you up and moves you forward.</p></div><div class="other"><p>Can feel like working downward into what’s underneath.</p></div></div>
      <div class="compare-row"><span class="label">Who it’s for</span><div class="coach"><p>High-functioning adults who feel restless, stuck, or like something’s missing.</p></div><div class="other"><p>People needing support with mental health, trauma or clinical concerns.</p></div></div>
      <div class="compare-row"><span class="label">The outcome</span><div class="coach"><p>Clarity, action, and the self-efficacy to keep going on your own.</p></div><div class="other"><p>Healing, insight and treatment.</p></div></div>
      <div class="compare-row"><span class="label">Together?</span><div class="coach"><p>Yes — coaching can work alongside therapy, or stand on its own.</p></div><div class="other"><p>Yes — the two can complement each other well.</p></div></div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("06", "Practical details", "Good to know")}
    <div class="details">
      <div class="card detail" data-reveal><div class="icon-badge">${icons.video}</div><h3>All sessions are virtual</h3><p>Easy to fit into your life, wherever you are.</p></div>
      <div class="card detail" data-reveal style="--d:.07s"><div class="icon-badge">${icons.calendar}</div><h3>At a time that works for you</h3><p>Most clients meet weekly or every other week to build momentum.</p></div>
      <div class="card detail" data-reveal style="--d:.14s"><div class="icon-badge">${icons.card}</div><h3>Payment at booking</h3><p>Fees are paid in advance, at the time of service.</p></div>
      <div class="card detail card--forest" data-reveal style="--d:.21s"><div class="icon-badge">${icons.clock}</div><h3>24-hour cancellation</h3><p>Cancellations within 24 hours are subject to a $50 fee.</p></div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("07", "Quick answers", "From the FAQ")}
    <div class="faq-layout">
      <div class="faq-aside">
        <h2 class="h2 balance" data-reveal>Still <em>wondering?</em></h2>
        <p class="lead" style="margin-top:20px" data-reveal>A few of the questions I hear most. There’s more on the FAQ page — or just ask me on a free call.</p>
        <div style="margin-top:28px" data-reveal>${linkU("All questions", "faq.html")}</div>
      </div>
      <div class="faq-list" data-reveal>${[faqs[2], faqs[5], faqs[8], faqs[4]].map(faqItem).join("")}</div>
    </div>
  </div>
</section>
`;

export default {
  path: "coaching.html",
  html: page({
    slug: "coaching",
    path: "coaching.html",
    title: "Coaching & Pricing",
    description: "Whole-person life coaching sessions with Adrienne Phelps. Free 30-minute First Step call, single sessions ($150) and a 3-session package ($390). All sessions held virtually.",
    current: "coaching",
    body,
    schema: [{
      "@context": "https://schema.org", "@type": "Service", name: "Whole-person life coaching", provider: { "@id": `${SITE.url}/#business` },
      areaServed: "United States", serviceType: "Life coaching",
      offers: [
        { "@type": "Offer", name: "First Step call (30 minutes)", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Single session (50 minutes)", price: "150", priceCurrency: "USD" },
        { "@type": "Offer", name: "3-session package", price: "390", priceCurrency: "USD" },
      ],
    }],
  }),
};
