/* Site settings. Edit these values; no build step needed. */
window.GDL = {
  email: "info@georgedupontleadership.com",

  // Form handling. Paste a Formspree / Basin / Netlify / Zapier webhook URL here
  // to receive enquiries directly. Left empty, forms open the visitor's email
  // app with the message already written.
  formEndpoint: "",
  newsletterEndpoint: "",

  // Engagement capacity shown on the seat meters ("Now booking Q1 2027").
  seatsPerQuarter: 3,
  seatsTaken: 0,
  bookingLabel: "", // optional override, e.g. "Now booking Q2 2027"

  // DynastyDNA™: three domains, four non-negotiables each.
  dna: [
    { key: "identity", name: "Champion Identity", sub: "Self-leadership", color: "#d6aa4f",
      items: ["Mindset", "Personal rhythm", "Identity alignment", "Consistency under pressure"] },
    { key: "influence", name: "Champion Influence", sub: "Relational leadership", color: "#e4532c",
      items: ["Team trust", "Conflict resolution", "Cultural clarity", "Communication frameworks"] },
    { key: "impact", name: "Champion Impact", sub: "Performance leadership", color: "#f3ece0",
      items: ["Execution systems", "Strategic leadership", "Performance tracking", "Scale"] },
  ],
};
