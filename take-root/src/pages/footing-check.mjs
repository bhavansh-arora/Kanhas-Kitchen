import { page, phero, btn, linkU, img, sh, icons } from "../lib.mjs";

export const AREAS = [
  ["career", "Career &amp; work", "How aligned does your work feel with who you are and what you want?", "#e5602a"],
  ["health", "Health &amp; energy", "How well are you caring for your body, sleep, movement and energy?", "#9cc27a"],
  ["relationships", "Relationships", "How supported, seen and connected do you feel by the people around you?", "#f6a065"],
  ["purpose", "Purpose &amp; meaning", "How clear are you on what matters most — and are you living by it?", "#d8c39c"],
  ["daily", "Daily life &amp; balance", "Do your days feel full and grounded — or just busy and on autopilot?", "#5f9e6e"],
  ["growth", "Personal growth", "How much space do you have to learn, stretch and try new things?", "#c94c19"],
];

const body = `
${phero({
  crumbs: ["Footing Check"],
  title: ["The Footing", "<em>Check.</em>"],
  lead: "Six roots. Two minutes. A clear, private snapshot of where you feel grounded — and where you might be stuck. Bring it to your free call and we’ll start right where it matters.",
  buttons: btn("Start the check", "#tool", "btn--clay"),
  media: "roots-grass",
  mediaAlt: "Green shoots with roots visible in dark soil",
  caption: "<span>Free · private</span><span>2 minutes</span>",
  meta: ["Nothing leaves your browser", "No sign-up", "Whole-person view"],
})}

<section class="section" id="tool" style="scroll-margin-top:40px">
  <div class="wrap">
    ${sh("01", "Rate each area", "1 = struggling · 10 = thriving")}
    <div class="head-row">
      <h2 class="h2 balance" data-reveal>How rooted do you feel, <em>right now?</em></h2>
      <p class="lead" data-reveal style="--d:.1s">Go with your gut — there are no right answers. Move each slider to where you honestly are today, not where you think you should be.</p>
    </div>
    <noscript><p class="card" style="margin-bottom:20px">The Footing Check needs JavaScript turned on. You can still <a href="work-with-me.html" style="color:var(--clay-deep)">book a free call</a>.</p></noscript>
    <div class="tool" data-footing>
      <form class="card tool-form" data-reveal onsubmit="return false">
        ${AREAS.map(([k, l, p, c]) => `<div class="slider" style="--c:${c}">
          <div class="slider-head"><label for="r-${k}"><i></i>${l}</label><output for="r-${k}" id="o-${k}">5</output></div>
          <p>${p}</p>
          <input type="range" id="r-${k}" name="${k}" min="1" max="10" step="1" value="5" data-label="${l.replace("&amp;", "&")}" data-short="${({ career: "Career", health: "Health", relationships: "People", purpose: "Purpose", daily: "Balance", growth: "Growth" })[k]}">
          <div class="scale-hint"><span>Struggling</span><span>Thriving</span></div>
        </div>`).join("")}
      </form>
      <aside class="card card--forest tool-result" aria-live="polite" data-reveal style="--d:.08s">
        <div class="card-top"><span class="mono">Your snapshot</span><span class="badge" data-badge>Live</span></div>
        <div class="wheel">
          <svg viewBox="-80 -34 560 468" role="img" aria-label="Wheel chart of your six scores" data-wheel></svg>
          <div class="wheel-center"><b data-avg>5.0</b><span>Average</span></div>
        </div>
        <div class="insight">
          <h3 data-title>Move the sliders to see your snapshot.</h3>
          <p data-text>Your wheel updates as you go. The shape matters more than the numbers — a lopsided wheel often explains that “something’s off” feeling.</p>
          <p class="rec" data-rec></p>
          <div class="tool-actions">
            ${btn("Bring this to a free call", "work-with-me.html", "btn--clay", "data-save")}
            ${btn("Send to Adrienne", "contact.html?topic=Not%20sure%20yet", "btn--ghost", "data-save")}
          </div>
          <p class="disclaimer">A reflection tool, not a diagnosis. Your answers are saved only in this browser so they can be attached to your message. <button type="button" data-reset style="text-decoration:underline;color:var(--ember)">Reset</button></p>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("02", "How to read your wheel", "Three things to notice")}
    <div class="flow" style="--line-light:var(--line)">
      <div class="flow-item" data-reveal style="border-color:var(--line)"><div class="num" style="color:var(--clay-deep)">01</div><h3 class="h3">The <em>shape.</em></h3><p class="muted" style="color:var(--muted)">A round wheel rolls. A lopsided one bumps along — even when the average looks fine.</p></div>
      <div class="flow-item" data-reveal style="--d:.08s;border-color:var(--line)"><div class="num" style="color:var(--clay-deep)">02</div><h3 class="h3">The <em>lowest</em> root.</h3><p style="color:var(--muted)">This is often where the restlessness is coming from — and the best place to start.</p></div>
      <div class="flow-item" data-reveal style="--d:.16s;border-color:var(--line)"><div class="num" style="color:var(--clay-deep)">03</div><h3 class="h3">The <em>strongest</em> root.</h3><p style="color:var(--muted)">What’s working is a resource. We use your strengths to lift the areas that feel stuck.</p></div>
    </div>
  </div>
</section>
`;

export default {
  path: "footing-check.html",
  html: page({
    slug: "footing", path: "footing-check.html", title: "The Footing Check — a free whole-person self-assessment",
    description: "A free, private two-minute self-assessment from Take Root Life Coaching. Rate six areas of your life, see your wheel, and get a suggested next step.",
    current: "footing", body, scripts: ["footing.js"],
    cta: { title: "Let’s look at your wheel <em>together.</em>", text: "Bring your Footing Check to a free 30-minute First Step call and we’ll start right where it matters most." },
  }),
};
