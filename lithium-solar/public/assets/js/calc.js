/* Lithium savings model. Shared by the home estimator, savings page and quote funnel.
   Every number here is an estimate; the free site assessment confirms the real figures. */
(function () {
  'use strict';

  var DEFAULTS = {
    rate: 0.34,          // $/kWh, typical Southern California residential rate
    sunHours: 5.6,       // peak sun hours per day, Inland Empire
    derate: 0.8,         // system losses (inverter, wiring, soiling, heat)
    costPerWatt: 3.1,    // installed $/W before any incentives
    escalation: 0.03,    // yearly utility price increase
    degradation: 0.005,  // yearly panel output loss
    fixedShare: 0.1,     // part of the bill solar cannot remove (fixed and grid charges)
    offset: 1,           // share of usage the system is sized to cover
    panelWatts: 410,
    years: 25,
    co2KgPerKwh: 0.194   // California grid average
  };

  function estimate(bill, opts) {
    var o = {};
    for (var k in DEFAULTS) o[k] = DEFAULTS[k];
    if (opts) for (var j in opts) if (opts[j] != null && !isNaN(opts[j])) o[j] = +opts[j];

    var monthlyKwh = bill / o.rate;
    var annualKwh = monthlyKwh * 12;
    var targetKwh = annualKwh * o.offset;
    var systemKw = targetKwh / (o.sunHours * 365 * o.derate);
    var panels = Math.max(1, Math.ceil((systemKw * 1000) / o.panelWatts));
    var cost = systemKw * 1000 * o.costPerWatt;
    var year1 = bill * 12 * o.offset * (1 - o.fixedShare);

    var series = [{ year: 0, utility: 0, solar: cost }];
    var cumUtility = 0, cumSolar = cost, cumSave = 0, payback = null, totalSave = 0;
    for (var y = 1; y <= o.years; y++) {
      var utilityYear = bill * 12 * Math.pow(1 + o.escalation, y - 1);
      var saveYear = year1 * Math.pow(1 + o.escalation, y - 1) * Math.pow(1 - o.degradation, y - 1);
      cumUtility += utilityYear;
      cumSolar += utilityYear - saveYear;
      var before = cumSave;
      cumSave += saveYear;
      totalSave += saveYear;
      if (payback === null && cumSave >= cost) payback = y - 1 + (cost - before) / saveYear;
      series.push({ year: y, utility: cumUtility, solar: cumSolar });
    }

    return {
      opts: o,
      monthlyKwh: monthlyKwh,
      annualKwh: annualKwh,
      productionKwh: targetKwh,
      systemKw: systemKw,
      panels: panels,
      cost: cost,
      year1: year1,
      monthly1: year1 / 12,
      net: totalSave - cost,
      payback: payback,
      co2Tons: (targetKwh * o.years * (1 - o.degradation * o.years / 2) * o.co2KgPerKwh) / 1000,
      series: series
    };
  }

  function money(n, compact) {
    if (n == null || isNaN(n)) return '—';
    if (compact && Math.abs(n) >= 1000) {
      var k = n / 1000;
      return '$' + (k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')) + 'k';
    }
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  window.LithiumCalc = { defaults: DEFAULTS, estimate: estimate, money: money };
})();
