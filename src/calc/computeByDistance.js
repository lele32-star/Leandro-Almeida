 (function(){
  // assinatura pura — sem DOM
  function computeByDistance({ distanceKm, pricePerKm, fixedAdditions = 0, commissionPct = 0, minBillable = 0 }) {
    const base = Math.max(distanceKm, 0) * Math.max(pricePerKm, 0);
    const withAdd = base + Math.max(fixedAdditions, 0);
    const withMin = Math.max(withAdd, minBillable || 0);
    const total = withMin * (1 + Math.max(commissionPct, 0) / 100);
    return { base, withAdd, withMin, total };
  }
  safeExport('calc', Object.assign(window.App.calc || {}, { computeByDistance }));
 })();
