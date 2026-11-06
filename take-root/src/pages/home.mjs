import { page, btn, linkU, img, imgUrl, sh, icons, arrowDot, testimonials, tCard, posts, postCard, marquee } from "../lib.mjs";

const pill = (name) => `<span class="pill-img" style="background-image:url('${imgUrl(name, 600)}')" aria-hidden="true"></span>`;

// Root system illustration: paths, tips and labels share one coordinate space (560 x 620)
const roots = [
  { d: "M280 150 C 282 230 272 300 280 380 S 286 500 280 560", w: 3, tip: [280, 560], label: "Purpose", below: true },
  { d: "M280 168 C 240 200 170 196 92 236", w: 2.2, tip: [92, 236], label: "Career" },
  { d: "M280 168 C 320 200 390 196 468 236", w: 2.2, tip: [468, 236], label: "Health" },
  { d: "M279 282 C 240 330 180 360 130 430", w: 2, tip: [130, 430], label: "Relationships", below: true },
  { d: "M281 300 C 320 350 380 370 430 440", w: 2, tip: [430, 440], label: "Daily life", below: true },
];
const hairs = [
  "M200 205 C 190 230 170 250 160 280", "M360 205 C 372 232 392 250 400 282", "M190 360 C 170 370 150 372 120 368",
  "M372 384 C 392 396 412 398 446 392", "M281 470 C 260 490 248 510 236 540", "M281 450 C 300 470 318 492 326 520",
  "M140 222 C 130 250 120 262 100 290", "M420 222 C 432 250 444 262 462 290", "M230 330 C 222 350 214 362 200 372",
];
const rootsSvg = `<div class="roots-stage" id="roots">
  <svg viewBox="0 0 560 620" aria-hidden="true">
    <line class="ground" x1="20" y1="150" x2="540" y2="150"/>
    ${hairs.map((d) => `<path class="hair draw" d="${d}"/>`).join("")}
    ${roots.map((r) => `<path class="root draw" d="${r.d}" stroke-width="${r.w}"/>`).join("")}
    ${roots.map((r, i) => `<g class="tip" data-i="${i}"><circle class="ring" cx="${r.tip[0]}" cy="${r.tip[1]}" r="12"/><circle class="node" cx="${r.tip[0]}" cy="${r.tip[1]}" r="6"/></g>`).join("")}
  </svg>
  <img class="seed" src="assets/img/logo-mark-sm.png" width="196" height="240" alt="">
  ${roots.map((r, i) => `<span class="root-label${r.below ? " below" : ""}" data-i="${i}" style="left:${((r.tip[0] / 560) * 100).toFixed(2)}%;top:${((r.tip[1] / 620) * 100).toFixed(2)}%">${r.label}</span>`).join("")}
</div>`;

const steps = [
  ["Untangle the noise", "Competing thoughts, options and obligations get loud. We slow everything down so you can finally hear yourself think."],
  ["Discover clarity", "Get clear on who you are, what you truly want, and what’s been standing in your way — across your career, health and daily life."],
  ["Take meaningful steps", "Leave every session with a next step, and build the self-trust to keep moving toward the most fulfilled version of yourself."],
];

const process = [
  { pill: "Step 01", meta: "Free · 30 minutes", h: "The First <em>Step</em> call", p: "An honest conversation to see if we’re a good fit. No pressure, no commitment — just space to say out loud what’s been on your mind.", chips: ["Free", "On video", "No pressure"], img: "adrienne-sofa", pos: "50% 30%" },
  { pill: "Step 02", meta: "Sessions 1–2", h: "Find your <em>footing</em>", p: "We look at the whole you — not just the problem. Untangle the noise, notice the patterns, and name what’s really been missing.", chips: ["Whole-person", "Judgment-free"], img: "conversation", pos: "50% 50%" },
  { pill: "Step 03", meta: "Your clarity", h: "Choose your <em>path</em>", p: "Clarity around who you are and what you truly want turns into a direction you actually believe in — at a pace that feels right for you.", chips: ["Values", "Direction", "Self-trust"], img: "forest-path", pos: "50% 40%" },
  { pill: "Step 04", meta: "The new chapter", h: "Take root &amp; <em>thrive</em>", p: "Meaningful steps, momentum between sessions, and the confidence to keep going on your own. A life that feels fulfilling — not just manageable.", chips: ["Momentum", "Confidence"], img: "roots-grass", pos: "50% 60%" },
];

const body = `
<section class="hero" aria-label="Introduction">
  <div class="hero-media">
    ${img("adrienne-hero", { alt: "Adrienne Phelps smiling during a virtual coaching session at a café table", sizes: "(max-width: 760px) 260vw, 100vw", eager: true })}
  </div>
  <a class="hero-card fade-in" href="work-with-me.html">
    ${img("adrienne-sofa", { alt: "", sizes: "64px" })}
    <span><span class="mono">Free · 30 minutes</span><b>First Step call with Adrienne</b></span>
    ${arrowDot}
  </a>
  <div class="hero-side fade-in" aria-hidden="true"><span>01</span><i></i><span>Scroll</span></div>
  <div class="eyebrow fade-in"><span class="dot"></span> Whole-person life coaching · Raleigh, NC · Virtual</div>
  <h1 class="h-display"><span class="line"><span>Find your</span></span><span class="line"><span><em>footing.</em></span></span></h1>
  <div class="hero-foot fade-in">
    <p><strong>Choose your path.</strong>One-on-one coaching for the whole you — helping you get clear, find your footing, and build a life that feels fulfilling, not just manageable.</p>
    <div class="btn-row">
      ${btn("Book a free call", "work-with-me.html", "btn--clay")}
      ${btn("Take the Footing Check", "footing-check.html", "btn--ghost-light")}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="hello">
  <div class="wrap">
    ${sh("01", "Hello", "Adrienne Phelps · Life coach")}
    <h2 id="hello" class="sr-only">Hello, I’m Adrienne</h2>
    <p class="statement" data-words>I’m Adrienne, a whole-person life coach ${pill("adrienne-standing")} for people who look fine on paper but feel <em>quietly unfulfilled</em> ${pill("forest-path")} — helping you slow down, get clear, and build a life that feels <em>like yours again.</em> ${pill("roots-grass")}</p>
    <div class="statement-foot" data-reveal>
      <div class="chips">
        <span class="chip">${icons.check} Strategic Intervention certified</span>
        <span class="chip">${icons.check} Duke Health &amp; Well-Being Coach</span>
        <span class="chip">${icons.check} 100% virtual</span>
      </div>
      ${linkU("Meet Adrienne", "about.html")}
    </div>
  </div>
</section>

${marquee(["Clarity", "Confidence", "Courage", "Purpose", "Balance", "Growth"])}

<section class="section" aria-labelledby="familiar">
  <div class="wrap">
    ${sh("02", "Sound familiar?", "Successful · restless · ready")}
    <div class="signs">
      <div class="signs-left">
        <h2 id="familiar" class="h2 balance" data-reveal>You don’t have to keep living on <em>autopilot.</em></h2>
        <p class="lead" data-reveal style="--d:.1s">Maybe life looks fine from the outside. But inside feels restless, disconnected, or quietly unfulfilled. If a few of these ring true, you’re in the right place.</p>
        <div data-reveal style="--d:.15s">${btn("Talk it through, free", "work-with-me.html", "")}</div>
        <div class="mini-card" data-reveal style="--d:.2s">
          ${img("adrienne-standing", { alt: "Adrienne Phelps", sizes: "72px" })}
          <div><b>You’re not broken.</b><p>You just haven’t had the space to figure out what’s missing. Coaching gives you that space.</p></div>
        </div>
      </div>
      <ol class="signs-list">
        <li><span class="mono">01</span><p>You’ve checked every box — and still catch yourself asking, <em>“is this it?”</em></p></li>
        <li><span class="mono">02</span><p>Your days run on autopilot: busy, capable, and quietly disconnected.</p></li>
        <li><span class="mono">03</span><p>Something needs to shift, but you can’t quite name what it is yet.</p></li>
        <li><span class="mono">04</span><p>Your career, your health and your daily life feel out of sync.</p></li>
        <li><span class="mono">05</span><p>You’ve tried therapy and still feel like something is missing.</p></li>
      </ol>
    </div>
  </div>
</section>

<section class="panel panel--dark" aria-labelledby="connected">
  <div class="wrap">
    ${sh("03", "The whole you", "Mind · body · spirit")}
    <div class="roots-grid">
      <div class="roots-copy">
        <h2 id="connected" class="h2 balance" data-reveal>Everything is <em>connected.</em></h2>
        <p class="lead" data-reveal style="--d:.1s">How you feel about your career, your health and your daily life aren’t separate problems — they share the same roots. So we look at the whole you, not just the problem.</p>
        <ol class="steps">
          ${steps.map(([h, p], i) => `<li class="step"><span class="mono">0${i + 1} — ${["Find your footing", "Choose your path", "Take root"][i]}</span><h3 class="h3">${h}</h3><p>${p}</p></li>`).join("")}
        </ol>
      </div>
      <div class="roots-visual">
        ${rootsSvg}
        <p class="roots-caption">Strong roots · steady growth</p>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="ways">
  <div class="wrap">
    ${sh("04", "Ways to work together", "Free call · Single · Package")}
    <div class="head-row">
      <h2 id="ways" class="h2 balance" data-reveal>Simple ways to <em>begin.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">Whether you’re just curious or ready to dive in, there’s a clear, simple way to get started. Every session is held virtually, at a time that works for you.</p>
    </div>
    <div class="bento">
      <a class="card card--img b-7 b-tall" href="work-with-me.html" data-reveal>
        ${img("adrienne-laptop", { alt: "Adrienne on a video coaching call", sizes: "(max-width: 1024px) 100vw, 58vw", style: "object-position:50% 30%" })}
        <div class="card-top"><span class="mono">01 — Start here</span><span class="badge" style="background:var(--ember);color:var(--soil)">Free</span></div>
        <div class="card-foot">
          <div><h3 class="h3">A free 30-minute <em>First Step</em> call.</h3><p style="margin-top:10px;max-width:420px">An honest conversation to see if we’re a good fit. No pressure, no commitment.</p></div>
          ${arrowDot}
        </div>
      </a>
      <a class="card card--forest b-5" href="coaching.html#pricing" data-reveal style="--d:.08s;display:flex;flex-direction:column">
        <div class="card-top"><span class="mono">03 — Most popular</span><span class="badge">Save $60</span></div>
        <div style="margin-top:auto">
          <div class="price"><sup>$</sup>390<small>/ 3 sessions</small></div>
          <h3 class="h4" style="margin-top:18px">The 3-session <em>package</em></h3>
          <p style="margin-top:10px">Space and continuity to go deeper — discovering patterns, building clarity, and taking meaningful steps forward. Just $130 per session.</p>
        </div>
      </a>
      <a class="card b-4" href="coaching.html#pricing" data-reveal style="display:flex;flex-direction:column;justify-content:space-between">
        <div class="card-top"><span class="mono">02 — Single session</span>${arrowDot}</div>
        <div><div class="price" style="font-size:clamp(3rem,4.4vw,4.2rem)"><sup>$</sup>150</div><p class="muted" style="margin-top:12px">A focused 50-minute session to work through what’s on your mind. Perfect if you want to explore coaching first.</p></div>
      </a>
      <div class="card card--sand b-4" data-reveal style="--d:.08s;display:flex;flex-direction:column;justify-content:space-between">
        <div class="icon-badge">${icons.video}</div>
        <div><h3 class="h4">100% virtual, <em>wherever</em> you are.</h3><p class="muted" style="margin-top:10px">Sessions fit into your life — at home, at work, or on the road. Just bring yourself.</p></div>
      </div>
      <a class="card card--clay b-4" href="work-with-me.html#returning" data-reveal style="--d:.16s;display:flex;flex-direction:column;justify-content:space-between">
        <div class="card-top"><span class="mono">Returning clients</span><span class="arrow-dot" style="color:#fff">${icons.arrow}</span></div>
        <div><h3 class="h4">Welcome <em>back.</em></h3><p style="margin-top:10px">Recurring Client sessions are a check-in when you need a tune-up. Book your next session in a few taps.</p></div>
      </a>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="how" style="padding-top:0">
  <div class="wrap">
    ${sh("05", "How it works", "Talk · discover · grow")}
    <div class="head-row">
      <h2 id="how" class="h2 balance" data-reveal>From stuck to <em>rooted.</em></h2>
      <p class="lead" data-reveal style="--d:.1s">Coaching isn’t about being told what to do. It’s about finally having the space to figure out what you actually want — one conversation at a time.</p>
    </div>
    <div class="stack" id="stack">
      ${process.map((s, i) => `<article class="stack-card" style="--i:${i}">
        <div class="stack-copy">
          <div class="stack-top"><span class="step-pill">${s.pill}</span><span class="mono">${s.meta}</span></div>
          <h3>${s.h}</h3>
          <p>${s.p}</p>
          <div class="chips">${s.chips.map((c) => `<span class="chip">${c}</span>`).join("")}</div>
          ${i === 3 ? `<div style="margin-top:22px">${btn("Start with a free call", "work-with-me.html", "")}</div>` : ""}
          <span class="stack-num" aria-hidden="true">0${i + 1}</span>
        </div>
        <div class="stack-media">${img(s.img, { alt: "", sizes: "(max-width: 860px) 100vw, 50vw", style: `object-position:${s.pos}` })}</div>
      </article>`).join("")}
    </div>
  </div>
</section>

<section class="section" aria-labelledby="meet" style="padding-top:0">
  <div class="wrap">
    ${sh("06", "Meet your coach", "Raleigh, NC · Virtual")}
    <div class="meet">
      <div class="arch-wrap" data-reveal="scale">
        <div class="arch">${img("adrienne-standing", { alt: "Adrienne Phelps, founder of Take Root Life Coaching", sizes: "(max-width: 1024px) 90vw, 40vw" })}</div>
        <a class="spin-badge" href="work-with-me.html" aria-label="Book a free First Step call">
          <svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="circ" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0"/></defs><text><textPath href="#circ" textLength="236" lengthAdjust="spacing">Free first step call · 30 min · </textPath></text></svg>
          <img src="assets/img/logo-mark-sm.png" width="196" height="240" alt="">
        </a>
      </div>
      <div class="meet-copy">
        <h2 id="meet" class="h2 balance" data-reveal>Been there. <em>Checked every box.</em></h2>
        <p class="lead" data-reveal style="--d:.05s">For a long time, I was someone who had it mostly together — doing all the right things, checking the boxes — and still felt like something was missing.</p>
        <p data-reveal style="--d:.1s">I work with people who sense that something needs to shift but can’t quite name what it is yet. As an empath at heart, I meet you exactly where you are — with honesty, warmth, and zero judgment — and we figure it out together.</p>
        <blockquote class="pull" data-reveal style="--d:.15s">“You don’t need all the answers right now. You just need someone in your corner who truly gets it.”</blockquote>
        <div class="stats" data-reveal style="--d:.2s">
          <div class="stat"><b>2022</b><span>Strategic Intervention Life Coach certificate</span></div>
          <div class="stat"><b>Duke</b><span>Certified Health &amp; Well-Being Coach</span></div>
          <div class="stat"><b>UMGC</b><span>Master’s in Marketing Management, highest honors</span></div>
          <div class="stat"><b data-count="2">2</b><span>Wild Goldendoodles at home</span></div>
        </div>
        <div class="btn-row" data-reveal style="--d:.25s">${btn("Read my story", "about.html", "")}${btn("Book a free call", "work-with-me.html", "btn--ghost btn--plain")}</div>
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="words" style="padding-top:0">
  <div class="wrap">
    ${sh("07", "Kind words", "From real clients")}
    <div class="head-row">
      <h2 id="words" class="h2 balance" data-reveal>In their <em>own words.</em></h2>
      <div class="t-controls" data-reveal style="--d:.1s">
        <div class="t-progress"><i id="t-bar"></i></div>
        <button class="t-btn prev" type="button" aria-label="Previous testimonial" data-t="-1">${icons.arrow}</button>
        <button class="t-btn next" type="button" aria-label="Next testimonial" data-t="1">${icons.arrow}</button>
      </div>
    </div>
    <div class="t-track" id="t-track" tabindex="0" aria-label="Client testimonials">
      ${testimonials.map((t, i) => tCard(t, i)).join("")}
      <a class="card card--forest t-card" href="work-with-me.html" data-reveal style="--d:.3s">
        <span class="mono">Your turn</span>
        <div><h3 class="h2" style="font-size:clamp(2.6rem,4vw,3.8rem)">Your story, <em>next.</em></h3><p style="margin-top:16px">It starts with a free 30-minute conversation. No pressure — just an honest talk about what you want.</p></div>
        <div class="card-foot"><span class="mono">Book a First Step call</span>${arrowDot}</div>
      </a>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="check" style="padding-top:0">
  <div class="wrap">
    <div class="feature" data-reveal="scale">
      ${img("roots-grass", { alt: "", sizes: "100vw", style: "object-position:50% 70%" })}
      <div>
        <div class="eyebrow"><span class="dot"></span> (08) — Free 2-minute tool</div>
        <h2 id="check" class="h2 balance">Where are you <em>rooted</em> — and where are you stuck?</h2>
        <p class="lead">The Footing Check is a quick, private reflection across six areas of your life. You’ll get a visual snapshot and a suggested next step — and you can bring it to your first call.</p>
      </div>
      <div class="glass">
        <div class="mini-wheel">
          <svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="rgba(247,241,230,.18)"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="29"/><circle cx="50" cy="50" r="14"/></g><polygon points="50,14 82,32 76,70 50,80 22,66 28,30" fill="rgba(246,160,101,.35)" stroke="#f6a065" stroke-width="1.6" stroke-linejoin="round"/></svg>
          <div><b>Six roots. Two minutes.</b><span>Career · Health · Relationships · Purpose · Daily life · Growth</span></div>
        </div>
        <ul class="tick-list">
          <li>See your whole life on one simple wheel</li>
          <li>Spot where you feel strongest — and most stuck</li>
          <li>Get a gentle, personal suggestion for where to start</li>
        </ul>
        ${btn("Take the Footing Check", "footing-check.html", "btn--clay")}
      </div>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="journal" style="padding-top:0">
  <div class="wrap">
    ${sh("09", "From the journal", "Stories · reflections · nudges")}
    <div class="head-row">
      <h2 id="journal" class="h2 balance" data-reveal>Notes from <em>the garden.</em></h2>
      <div style="justify-self:end;--d:.1s" data-reveal>${linkU("Read the journal", "journal.html")}</div>
    </div>
    <div class="posts">${posts.slice(0, 3).map((p, i) => postCard(p, "", i)).join("")}</div>
  </div>
</section>
`;

export default {
  path: "index.html",
  html: page({
    slug: "home",
    path: "index.html",
    title: "Take Root Life Coaching — Find your footing. Choose your path.",
    description: "One-on-one, whole-person life coaching with Adrienne Phelps. Get clear, find your footing, and build a life that feels fulfilling — not just manageable. Free 30-minute First Step call.",
    current: "home",
    body,
  }),
};
