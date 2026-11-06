import { page, phero, btn, linkU, sh, icons } from "../lib.mjs";

const ideas = [
  {
    t: "Lead with <em>you</em>, from the first second.",
    noticed: "The current homepage opens on a forest photo. It’s beautiful, but a first-time visitor can’t yet see who they’d be talking to.",
    built: "The new hero shows you mid-session on a video call, with a “Free · 30 min First Step call” card one tap away.",
    why: "People book coaches they already feel they know. In three seconds visitors see who you are, that it’s one-on-one, and that it’s virtual.",
    href: "index.html",
  },
  {
    t: "One clear path to <em>yes.</em>",
    noticed: "Pricing, booking and “is this for me?” answers live on separate pages, so visitors have to piece the decision together.",
    built: "Side-by-side pricing (free call · $150 · $390 with “save $60”), a New / Returning booking switch, and a single “Book a free call” action on every page — sticky on phones.",
    why: "Fewer clicks between curiosity and a booked call. The package value is obvious, so more people start with three sessions instead of one.",
    href: "coaching.html#pricing",
  },
  {
    t: "The <em>Footing Check</em> — a free tool that starts conversations.",
    noticed: "Visitors who aren’t ready to book have nothing to do except leave.",
    built: "A private, two-minute whole-person self-assessment. Visitors rate six areas of life, see their own “root system” wheel, and get a gentle suggested next step.",
    why: "It turns browsers into warm enquiries — and their results attach to your contact form, so your first call starts with real context.",
    href: "footing-check.html",
  },
  {
    t: "Answer the big hesitation <em>up front.</em>",
    noticed: "Your best answers — coaching vs therapy, who you work with — are tucked inside the FAQ.",
    built: "A “Sound familiar?” section on the homepage and a clear coaching vs therapy comparison on the Coaching page, written in your own words.",
    why: "People who’ve “tried therapy and something’s still missing” recognise themselves straight away and feel safe reaching out.",
    href: "coaching.html",
  },
  {
    t: "Your journal, built for <em>reading.</em>",
    noticed: "Your posts are warm, funny and wise — but they’re hard to find and don’t lead anywhere when someone finishes reading.",
    built: "A magazine-style journal with all nine entries, reading time, a progress bar, and an invitation to talk at the end of every post. Coaching topics link to the related story.",
    why: "Your stories do the selling for you. Each post becomes a doorway from Google straight to a booked call.",
    href: "journal.html",
  },
  {
    t: "Built to be <em>found</em> and trusted.",
    noticed: "Search engines and AI assistants need structured information to recommend a coach confidently.",
    built: "Search-friendly page titles and descriptions, Google-ready business, FAQ and article data, fast self-hosted fonts and images, accessible markup, and a layout tuned for phone, tablet and desktop.",
    why: "More people find you when they search for a life coach in Raleigh or online — and the site loads fast on any phone.",
    href: "faq.html",
  },
];

const body = `
${phero({
  crumbs: ["A few short ideas"],
  title: ["A few short ideas", "for <em>Take Root.</em>"],
  long: true,
  lead: "Written for Adrienne Phelps by Bhavansh at Code Bunny — as promised. Every idea below is already built into this concept, so you can click through and feel it rather than imagine it.",
  buttons: btn("Explore the concept", "index.html", "btn--clay"),
  side: `<div class="glass" style="align-self:end">
    <span class="mono" style="color:var(--ember)">At a glance</span>
    <ul class="tick-list">
      <li>Same words, same story, same pricing — presented more clearly</li>
      <li>A free self-assessment tool that creates warm enquiries</li>
      <li>One clear booking path, on every page and every device</li>
      <li>Journal and FAQ working as search-engine entry points</li>
    </ul>
  </div>`,
  meta: ["Prepared for Adrienne Phelps", "Code Bunny", "November 2026"],
})}

<section class="section">
  <div class="wrap-narrow letter" data-reveal>
    <p>Hi Adrienne,</p>
    <p>Your current site already does something many coaching sites don’t: it sounds like a real person. Your warmth, your honesty and your “is this it?” story come through clearly — so we kept every word of that.</p>
    <p>What we focused on is <strong>how easily the right person can say yes.</strong> Below are six short ideas, what we noticed, what we built, and why it matters for you.</p>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("01", "Six ideas", "Noticed · built · why it helps")}
    <div>
      ${ideas.map((d, i) => `<article class="idea" data-reveal>
        <div class="idea-num">0${i + 1}</div>
        <div>
          <h3>${d.t}</h3>
          <div class="idea-cols">
            <div><span class="mono">What we noticed</span><p>${d.noticed}</p></div>
            <div><span class="mono">What we built</span><p>${d.built}</p></div>
            <div><span class="mono">Why it helps you</span><p>${d.why}</p></div>
          </div>
          ${linkU("See it live", d.href)}
        </div>
      </article>`).join("")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    ${sh("02", "What stays the same", "Your voice, untouched")}
    <div class="details">
      <div class="card detail" data-reveal><div class="icon-badge">${icons.heart}</div><h3>Your words</h3><p>Copy comes straight from your site and journal — refined in layout, not rewritten.</p></div>
      <div class="card detail" data-reveal style="--d:.07s"><div class="icon-badge">${icons.leaf}</div><h3>Your brand</h3><p>The rooted-heart logo, your orange and green — elevated into a richer palette.</p></div>
      <div class="card detail" data-reveal style="--d:.14s"><div class="icon-badge">${icons.card}</div><h3>Your pricing</h3><p>Free call, $150 single, $390 package, $50 late-cancellation — exactly as today.</p></div>
      <div class="card detail card--forest" data-reveal style="--d:.21s"><div class="icon-badge">${icons.calendar}</div><h3>Your booking</h3><p>Buttons point to your existing scheduler, so nothing changes for current clients.</p></div>
    </div>
  </div>
</section>
`;

export default {
  path: "ideas.html",
  html: page({
    slug: "ideas", path: "ideas.html", title: "A few short ideas for Take Root",
    description: "Six short ideas for the Take Root Life Coaching website, prepared for Adrienne Phelps by Code Bunny.",
    current: "", body, noindex: true,
    cta: { title: "Shall we walk through it <em>together?</em>", text: "Happy to take you through the concept on a short call — or answer any questions by email. No pressure either way." },
  }),
};
