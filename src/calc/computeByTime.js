 (function(){
  // legs: [{ distanceNm, cruiseKt, taxiMin?, bufferMin? , customTimeMin? }]
  function computeByTime({ legs = [], defaults = { taxiMin: 10, bufferMin: 5 }, commissionPct = 0, minBillableMin = 0, hourlyRate = 0 }) {
    let totalMin = 0;
    for (const leg of legs) {
      if (Number.isFinite(leg.customTimeMin)) {
        totalMin += Math.max(leg.customTimeMin, 0);
        continue;
      }
      const nm = Math.max(leg.distanceNm || 0, 0);
      const kt = Math.max(leg.cruiseKt || 0, 1);
      const enrouteMin = (nm / kt) * 60;
      const taxi = Number.isFinite(leg.taxiMin) ? leg.taxiMin : (defaults.taxiMin || 0);
      const buf  = Number.isFinite(leg.bufferMin) ? leg.bufferMin : (defaults.bufferMin || 0);
      totalMin += enrouteMin + taxi + buf;
    }
    const billMin = Math.max(totalMin, minBillableMin || 0);
    const hours = billMin / 60;
    const base = hours * Math.max(hourlyRate, 0);
    const total = base * (1 + Math.max(commissionPct, 0) / 100);
    return { totalMin, billMin, hours, base, total };
  }
  safeExport('calc', Object.assign(window.App.calc || {}, { computeByTime }));
 })();
