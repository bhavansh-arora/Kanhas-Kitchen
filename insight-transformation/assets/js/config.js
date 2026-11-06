// Site settings — the one place to change where forms go and which links show.
window.SITE_CONFIG = {
  // Email shown on the site and used as the fallback for the booking form.
  email: "hello@insighttransform.com",

  // POST endpoint that accepts JSON (Formspree, Basin, Dubsado, a Zapier/Make webhook, etc.).
  // While empty, the booking form opens a pre-filled email to Alberta instead, so nothing is lost.
  formEndpoint: "",

  // Optional scheduling link (Calendly, Acuity, TidyCal...). When set, a "Pick a time" link
  // appears on the contact page and after a request is sent.
  bookingUrl: "",

  // Social profiles. Leave empty to hide the link everywhere.
  instagram: "",
  linkedin: ""
};
