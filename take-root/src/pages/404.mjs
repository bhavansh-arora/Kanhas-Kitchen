import { page, btn } from "../lib.mjs";

const body = `
<section class="section notfound">
  <div class="wrap" style="padding-top:80px">
    <p class="eyebrow" style="justify-content:center"><span class="dot"></span> Error 404</p>
    <h1 class="h-display" style="margin-top:24px">Lost your <em>footing?</em></h1>
    <p class="lead" style="margin:24px auto 0;max-width:480px">This page doesn’t exist — but every path leads somewhere. Let’s get you back on solid ground.</p>
    <div class="btn-row" style="justify-content:center;margin-top:34px">${btn("Back to home", "index.html", "btn--clay")}${btn("Book a free call", "work-with-me.html", "btn--ghost")}</div>
  </div>
</section>`;

export default { path: "404.html", html: page({ slug: "404", path: "404.html", title: "Page not found", description: "This page could not be found.", body, noindex: true }) };
