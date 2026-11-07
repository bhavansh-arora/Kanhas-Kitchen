import { page, phero, btn, linkU, img, sh, icons, SITE } from "../lib.mjs";

// Set FORM_ENDPOINT to a form service URL (e.g. Formspree) to receive submissions directly.
// When empty, the form opens the visitor's email app with the message ready to send.
const FORM_ENDPOINT = "";

const topics = ["Career", "Life transition", "Health & well-being", "Boundaries", "Balance & burnout", "Not sure yet"];

const body = `
${phero({
  crumbs: ["Contact"],
  title: ["Talk to <em>me.</em>"],
  lead: "Questions, feedback, or just not sure where to start? Send a note and I’ll respond personally as soon as possible.",
  buttons: btn("Write to me", "#message", "btn--clay") + btn("Book a free call", "work-with-me.html", "btn--ghost-light"),
  media: "adrienne-cafe",
  mediaPos: "50% 56%",
  mediaAlt: "Adrienne at a café table with her laptop",
  caption: "<span>Replies from Adrienne</span><span>Personally</span>",
  meta: [SITE.email, "Raleigh, NC area", "Sessions held virtually"],
})}

<section class="section" id="message" style="scroll-margin-top:40px">
  <div class="wrap">
    ${sh("01", "Send a message", "Private &amp; confidential")}
    <div class="contact-grid">
      <div class="card" style="padding:clamp(24px,3.4vw,48px)" data-form-wrap data-reveal>
        <h2 class="h3">What’s on your <em>mind?</em></h2>
        <p class="muted" style="margin:10px 0 30px">Fill out this short form and I’ll reach out to schedule a time to talk.</p>
        <form class="form" data-form data-email="${SITE.email}" data-endpoint="${FORM_ENDPOINT}" novalidate>
          <div class="field"><label for="f-name">Your name</label><input id="f-name" name="name" autocomplete="name" required></div>
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field full"><label for="f-phone">Phone <span style="text-transform:none;letter-spacing:0">(optional)</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel"></div>
          <fieldset class="field full" style="border:0;padding:0;margin:0">
            <legend class="label" style="margin-bottom:10px">What would you like to work on?</legend>
            <div class="radio-chips">${topics.map((t, i) => `<label><input type="radio" name="topic" value="${t}"${i === topics.length - 1 ? " checked" : ""}><span>${t.replace("&", "&amp;")}</span></label>`).join("")}</div>
          </fieldset>
          <div class="field full"><label for="f-msg">Your message</label><textarea id="f-msg" name="message" required placeholder="Share as much or as little as you like."></textarea></div>
          <fieldset class="field full" style="border:0;padding:0;margin:0">
            <legend class="label" style="margin-bottom:10px">Best way to reach you</legend>
            <div class="radio-chips">${["Email", "Phone call", "Text"].map((t, i) => `<label><input type="radio" name="contact_pref" value="${t}"${i === 0 ? " checked" : ""}><span>${t}</span></label>`).join("")}</div>
          </fieldset>
          <div class="attach-note">
            <label class="check"><input type="checkbox" name="attach_footing" value="1" checked><span><b style="font-weight:500">Include my Footing Check results.</b> <span class="muted" data-footing-summary></span></span></label>
          </div>
          <div class="form-foot">
            <small>Your details stay between us and are only used to reply to you.</small>
            <button class="btn btn--clay" type="submit"><span>Send message</span><span class="ico">${icons.arrow}${icons.arrow}</span></button>
          </div>
        </form>
        <div class="form-success" role="status">
          <div class="icon-badge">${icons.check}</div>
          <h3 class="h3">Thank <em>you.</em></h3>
          <p class="muted" style="margin:12px auto 0;max-width:420px">${FORM_ENDPOINT ? "Your message is on its way. I’ll be in touch as soon as possible." : "Your email app should have opened with your message ready to send. If it didn’t, email me directly at"} ${FORM_ENDPOINT ? "" : `<a href="mailto:${SITE.email}" style="color:var(--clay-deep)">${SITE.email}</a>.`}</p>
          <div class="btn-row" style="justify-content:center;margin-top:26px">${btn("Book a free call", "work-with-me.html", "")}</div>
        </div>
      </div>
      <div class="contact-side">
        <div class="card" data-reveal style="--d:.08s">
          <span class="mono">Direct</span>
          <div style="margin-top:8px">
            <div class="contact-line"><span>Email</span><a href="mailto:${SITE.email}">${SITE.email}</a></div>
            <div class="contact-line"><span>Instagram</span><a href="${SITE.instagram}" target="_blank" rel="noopener">@takeroot.lifecoaching</a></div>
            <div class="contact-line"><span>Facebook</span><a href="${SITE.facebook}" target="_blank" rel="noopener">Take Root Life Coaching</a></div>
            <div class="contact-line"><span>Based in</span><b>Raleigh, NC · virtual</b></div>
          </div>
        </div>
        <a class="card card--forest contact-grow" href="work-with-me.html" style="--d:.14s" data-reveal>
          <div class="card-top"><span class="mono">Rather talk?</span><span class="arrow-dot">${icons.arrow}</span></div>
          <h3 class="h3" style="margin-top:48px">Book a free <em>First Step</em> call.</h3>
          <p style="margin-top:10px">Thirty minutes, on video, no pressure — the quickest way to see if coaching is a fit.</p>
        </a>
        <a class="card card--sand" href="footing-check.html" style="display:block;--d:.2s" data-reveal>
          <div class="card-top"><span class="mono">Free tool</span><span class="arrow-dot">${icons.arrow}</span></div>
          <h3 class="h4" style="margin-top:36px">Not sure what to say? Try the <em>Footing Check</em> — your results can be attached here.</h3>
        </a>
      </div>
    </div>
  </div>
</section>
`;

export default {
  path: "contact.html",
  html: page({
    slug: "contact", path: "contact.html", title: "Contact",
    description: "Contact Adrienne Phelps at Take Root Life Coaching. Send a message, email adrienne@takerootlifecoaching.com, or book a free 30-minute First Step call.",
    current: "contact", body,
    cta: { title: "Ready when <em>you are.</em>" },
  }),
};
