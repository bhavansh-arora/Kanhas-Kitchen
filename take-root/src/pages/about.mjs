import { page, phero, btn, linkU, img, sh, icons, testimonials, tCard } from "../lib.mjs";

const timeline = [
  ["Before coaching", "A career in <em>media</em>", "Seller, marketer and project manager in New York and Washington, D.C. — fast-paced, results-driven, and good on paper."],
  ["Community", "Nonprofit <em>work</em>", "Years of involvement with local nonprofit organizations, learning how people and communities really grow."],
  ["Education", "B.A. Speech <em>Communication</em>", "University of Georgia. Communication has always been at the heart of how I connect with people."],
  ["Education", "Master’s in Marketing <em>Management</em>", "University of Maryland Global Campus — graduated with highest honors."],
  ["2022", "Strategic Intervention <em>Life Coach</em>", "Certificate in Strategic Intervention Life Coaching from Robbins-Madanes Training."],
  ["Certified", "Health &amp; Well-Being <em>Coach</em>", "Certified through Duke Health — because how you feel in your body is part of how you feel about your life."],
  ["Today", "Take Root Life <em>Coaching</em>", "One-on-one, whole-person coaching from the Raleigh, NC area — held virtually, for people anywhere."],
];

const values = [
  [icons.leaf, "The whole <em>you</em>", "Mind, body and spirit. Your career, your health and your daily life are connected — so we look at all of it, not just the problem."],
  [icons.heart, "Warmth &amp; <em>honesty</em>", "I bring warmth and honesty to every conversation. You’ll feel supported — and you’ll also hear the truth, kindly."],
  [icons.shield, "Zero <em>judgment</em>", "Every session is a judgment-free zone. I meet you exactly where you are, at a pace that feels right for you."],
  [icons.path, "Forward-<em>moving</em>", "Coaching is future-focused. I help you build the self-efficacy to act on your own — not depend on me for answers."],
];

const body = `
${phero({
  crumbs: ["About"],
  title: ["Find your footing.", "<em>Choose your path.</em>"],
  long: true,
  lead: "Whatever brought you here — a transition, a decision, or a quiet sense that something important is missing — you don’t have to figure it out alone.",
  buttons: btn("Book a free call", "work-with-me.html", "btn--clay") + btn("How coaching works", "coaching.html", "btn--ghost-light"),
  media: "adrienne-standing",
  mediaAlt: "Adrienne Phelps, life coach and founder of Take Root Life Coaching",
  caption: "<span>Adrienne Phelps</span><span>Founder · Life coach</span>",
  meta: ["Take Root Life Coaching, LLC", "Raleigh, NC area", "Sessions held virtually", "Whole-person coaching"],
})}

<section class="section">
  <div class="wrap">
    ${sh("01", "Why I do this", "Mind · body · spirit")}
    <p class="statement" data-words>There’s a moment many of us reach when life feels uncertain, restless, or quietly unfulfilling — and you’re not quite sure why. I help you slow down, discover clarity around who you are and what you truly want, so you can move forward with <em>confidence and purpose.</em></p>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${sh("02", "Meet Adrienne", "In my own words")}
    <div class="story">
      <figure class="story-media" data-reveal="scale">
        <div class="frame">${img("adrienne-cafe", { alt: "Adrienne smiling during a virtual session", sizes: "(max-width: 1024px) 90vw, 40vw" })}</div>
        <figcaption><span>On a session, somewhere good</span><span>Raleigh, NC</span></figcaption>
      </figure>
      <div class="story-copy">
        <h2 class="h2 balance" data-reveal>I’ve always been someone who <em>pays attention.</em></h2>
        <div class="prose" style="margin-top:32px">
          <p data-reveal>To the small shifts, the quiet “what ifs,” and the moments when life is good on paper but something still feels off.</p>
          <p data-reveal>I know what it’s like to feel capable and accomplished and still wonder…</p>
        </div>
        <p class="big-q" data-reveal><em>“Is this it?”</em></p>
        <div class="prose">
          <p data-reveal>Over time, I learned to slow down, ask better questions, and start making choices that actually aligned with who I am and what I wanted — not just what made sense on a checklist.</p>
          <p data-reveal>That experience shapes how I work with clients. Whether you’re navigating a career decision, rethinking your health habits, working through a life transition, or just trying to figure out your next move — I’m here to help you get clear, get grounded, and get moving.</p>
          <p data-reveal>I bring warmth and honesty to every conversation, and I meet people exactly where they are.</p>
        </div>
        <p class="signature" data-reveal>— Adrienne</p>
        <div class="btn-row" style="margin-top:32px" data-reveal>${btn("Book a free call", "work-with-me.html", "")}${linkU("Read the journal", "journal.html")}</div>
      </div>
    </div>
  </div>
</section>

<section class="panel panel--sand">
  <div class="wrap quote-band">
    <img src="assets/img/logo-mark-sm.png" width="196" height="240" alt="" data-reveal="scale">
    <blockquote data-reveal>“…strength takes many forms, and the most obvious forms are not always the most significant.”</blockquote>
    <cite data-reveal>President John F. Kennedy · Amherst, Massachusetts, 1963</cite>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${sh("03", "How I coach", "Four promises")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>Compassion, honesty, and <em>real connection.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">You don’t need all the answers right now. You just need someone in your corner who truly gets it. Here’s what you can count on from me.</p>
    </div>
    <div class="details">
      ${values.map(([ic, h, p], i) => `<div class="card detail${i === 1 ? " card--forest" : ""}" data-reveal style="--d:${i * 0.07}s"><div class="icon-badge">${ic}</div><h3 class="h4" style="margin-top:auto;padding-top:34px">${h}</h3><p>${p}</p></div>`).join("")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("04", "Education &amp; experience", "Credentials")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>A path that led <em>here.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">From media and marketing to nonprofit work and two coaching certifications — every chapter shaped how I listen, ask, and help people move.</p>
    </div>
    <div class="timeline">
      ${timeline.map(([k, h, p], i) => `<div class="tl-row" data-reveal style="--d:${(i % 3) * 0.05}s"><span class="mono">${k}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("05", "Off the clock", "Whole-person wellness, in real life")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>Small, grounding <em>moments.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">Those small, grounding moments remind me every day what whole-person wellness really looks like.</p>
    </div>
    <div class="life">
      <div class="card card--img" style="grid-column:span 5;min-height:460px" data-reveal>
        ${img("adrienne-sofa", { alt: "Adrienne laughing at home", sizes: "(max-width: 860px) 100vw, 42vw", style: "object-position:50% 35%" })}
        <span class="mono">At home</span>
        <div><h3 class="h3">Raleigh, NC — with family and two <em>wild Goldendoodles.</em></h3></div>
      </div>
      <div style="grid-column:span 7;display:grid;grid-template-columns:1fr 1fr;gap:var(--gap)" class="life-sub">
        <div class="card" data-reveal style="--d:.05s"><div class="icon-badge">${icons.dumbbell}</div><div><h3>CrossFit</h3><p>A workout over twenty minutes long? You bet.</p></div></div>
        <div class="card card--forest" data-reveal style="--d:.1s"><div class="icon-badge">${icons.mountain}</div><div><h3>Hiking, every chance I get</h3><p>Twenty-mile hike? Yes, I’m in. Plus daily walks with the dogs.</p></div></div>
        <div class="card card--sand" data-reveal style="--d:.15s"><div class="icon-badge">${icons.book}</div><div><h3>Reading</h3><p>Lately: <em>Chatter</em> by Ethan Kross — more on that in the journal.</p></div></div>
        <div class="card card--clay" data-reveal style="--d:.2s"><div class="icon-badge" style="background:rgba(255,255,255,.18);color:#fff">${icons.home}</div><div><h3>Mom of teenagers</h3><p>…and trying not to embarrass them.</p></div></div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("06", "Kind words", "From real clients")}
    <div class="bento">
      <div class="b-7">${tCard(testimonials[1], 0, "height:100%;min-height:0")}</div>
      <div class="b-5">${tCard(testimonials[0], 0, "height:100%;min-height:0")}</div>
    </div>
  </div>
</section>
`;

export default {
  path: "about.html",
  html: page({
    slug: "about",
    path: "about.html",
    title: "About Adrienne Phelps",
    description: "Meet Adrienne Phelps — Strategic Intervention certified life coach and Duke Health & Well-Being Coach. Whole-person coaching with warmth, honesty and zero judgment.",
    current: "about",
    body,
    schema: [{
      "@context": "https://schema.org", "@type": "Person", name: "Adrienne Phelps", jobTitle: "Life Coach",
      worksFor: { "@id": "https://www.takerootlifecoaching.com/#business" },
      alumniOf: [{ "@type": "CollegeOrUniversity", name: "University of Georgia" }, { "@type": "CollegeOrUniversity", name: "University of Maryland Global Campus" }],
      hasCredential: ["Strategic Intervention Life Coaching Certificate — Robbins-Madanes Training (2022)", "Certified Health & Well-Being Coach — Duke Health"],
      address: { "@type": "PostalAddress", addressLocality: "Raleigh", addressRegion: "NC", addressCountry: "US" },
    }],
  }),
};
