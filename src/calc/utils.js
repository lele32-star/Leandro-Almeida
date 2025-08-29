// Utilidades puras de cálculo (sem DOM)

export function nmToKm(nm) {
  const v = Number(nm) || 0;
  return v * 1.852;
}

export function kmToNm(km) {
  const v = Number(km) || 0;
  return v / 1.852;
}

export function applyExtra(subtotal, valorExtra, tipoExtra) {
  const extra = Number(valorExtra) || 0;
  if (!extra) return { ajusteAplicado: 0, total: subtotal };
  if (tipoExtra === 'subtrai') {
    return { ajusteAplicado: -extra, total: subtotal - extra };
  }
  return { ajusteAplicado: extra, total: subtotal + extra };
}

export function adjustLegTime(baseHours, { windPercent=0, taxiMinutes=0, minBillableMinutes=0 } = {}) {
  const base = Math.max(0, Number(baseHours) || 0);
  const taxiH = (Number(taxiMinutes) || 0)/60;
  const windFactor = 1 + (Number(windPercent)||0)/100;
  let adjusted = (base + taxiH) * windFactor;
  const minH = (Number(minBillableMinutes)||0)/60;
  if (minH > 0) adjusted = Math.max(adjusted, minH);
  return Number(adjusted.toFixed(4));
}

// ES module named exports
