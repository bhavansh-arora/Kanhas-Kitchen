/* RBP co-funding calculator + general enquiry form. */
(function () {
  "use strict";
  var CONFIG = window.POLISH_CONFIG || {};
  var EMAIL = CONFIG.email || "hello@polish.nz";
  function money(v) {
    var r = Math.round(v * 100) / 100, whole = r % 1 === 0;
    return "NZ $" + r.toLocaleString("en-NZ", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  }

  /* ---------- calculator ---------- */
  var calc = document.querySelector("[data-calc]");
  if (calc) {
    var range = calc.querySelector("#calc-people"), out = calc.querySelector("#calc-people-out");
    var rbp = calc.querySelector("#calc-rbp"), gst = calc.querySelector("#calc-gst");
    var prog = calc.querySelector("#calc-programme");
    var tTotal = calc.querySelector("[data-total]"), tLines = calc.querySelector("[data-lines]"), tNote = calc.querySelector("[data-total-note]");
    var update = function () {
      var n = +range.value, opt = prog.options[prog.selectedIndex];
      var price = +opt.getAttribute("data-price"), eligible = opt.hasAttribute("data-rbp");
      rbp.disabled = !eligible;
      rbp.closest(".toggle").style.opacity = eligible ? "" : "0.45";
      var useRbp = eligible && rbp.checked;
      var base = n * price, fund = useRbp ? base * 0.5 : 0, net = base - fund, gstAmt = gst.checked ? net * 0.15 : 0;
      out.textContent = n + (n === 1 ? " person" : " people");
      range.style.setProperty("--p", ((n - range.min) / (range.max - range.min) * 100) + "%");
      tTotal.textContent = money(net + gstAmt);
      tNote.textContent = (gst.checked ? "incl. GST" : "+ GST") + " · " + money((net + gstAmt) / n) + " per person";
      tLines.innerHTML =
        "<div><span>" + n + " × " + money(price) + "</span><strong>" + money(base) + "</strong></div>" +
        (useRbp ? '<div class="save"><span>RBP co-funding (50%)</span><strong>− ' + money(fund) + "</strong></div>" : "") +
        (gst.checked ? "<div><span>GST (15%)</span><strong>" + money(gstAmt) + "</strong></div>" : "") +
        "<div><span>Your investment</span><strong>" + money(net + gstAmt) + "</strong></div>";
      var cta = calc.querySelector("[data-calc-cta]");
      if (cta) cta.href = "contact.html?type=programme&programme=" + encodeURIComponent(opt.value) + "&people=" + n;
    };
    [range, rbp, gst, prog].forEach(function (el) { el.addEventListener("input", update); el.addEventListener("change", update); });
    update();
  }

  /* ---------- enquiry form ---------- */
  var form = document.querySelector("[data-enquiry]");
  if (!form) return;
  var params = new URLSearchParams(location.search);
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-type-tab]"));
  var typeInput = form.querySelector('input[name="type"]');
  var groups = Array.prototype.slice.call(form.querySelectorAll("[data-for]"));
  function setType(t) {
    typeInput.value = t;
    tabs.forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-type-tab") === t ? "true" : "false"); });
    groups.forEach(function (g) { g.hidden = g.getAttribute("data-for").split(" ").indexOf(t) === -1; });
    var coach = document.querySelector("[data-coach-note]");
    if (coach) coach.hidden = t !== "coaching";
  }
  tabs.forEach(function (b) { b.addEventListener("click", function () { setType(b.getAttribute("data-type-tab")); }); });
  setType(params.get("type") || "programme");
  if (params.get("programme") && form.programme) form.programme.value = params.get("programme");
  if (params.get("people") && form.people) form.people.value = params.get("people");
  if (params.get("topic") && form.topic) form.topic.value = params.get("topic");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    Array.prototype.forEach.call(form.querySelectorAll("[required]"), function (f) {
      if (f.closest("[hidden]")) return;
      var valid = f.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()) : !!f.value.trim();
      f.closest(".field").classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) { var first = form.querySelector(".is-invalid input, .is-invalid textarea, .is-invalid select"); if (first) first.focus(); return; }
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name && !el.closest("[hidden]") && el.value) data[el.name] = el.value; });
    var labels = { programme: "Team programme", speaking: "Keynote speaking", coaching: "Executive coaching", other: "General enquiry" };
    var body = Object.keys(data).filter(function (k) { return k !== "type"; }).map(function (k) { return k.charAt(0).toUpperCase() + k.slice(1) + ": " + data[k]; }).join("\n");
    var done = function () {
      var ok = document.querySelector("[data-enquiry-done]");
      form.hidden = true; ok.hidden = false;
      ok.querySelector("[data-done-name]").textContent = (data.name || "").split(" ")[0];
      var mail = ok.querySelector("[data-done-mail]");
      mail.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(labels[data.type] + " — " + (data.name || "")) + "&body=" + encodeURIComponent(body);
      if (CONFIG.enquiryEndpoint) mail.style.display = "none";
      ok.querySelector("h2").focus();
    };
    if (CONFIG.enquiryEndpoint) {
      fetch(CONFIG.enquiryEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) }).then(done, done);
    } else done();
  });
})();
