function valorParcial(distanciaKm, valorKm) {
  return distanciaKm * valorKm;
}

function valorTotal(distanciaKm, valorKm, valorExtra = 0) {
  return valorParcial(distanciaKm, valorKm) + valorExtra;
}

const airports = {
  SBBR: { lat: -15.869167, lon: -47.920833 },
  SBMO: { lat: -9.510808, lon: -35.791667 },
  SBBH: { lat: -19.851944, lon: -43.950833 }
};

const R_KM = 6371;
const toRad = deg => deg * Math.PI / 180;

function haversineKm(a, b) {
  const dphi = toRad(b.lat - a.lat);
  const dlambda = toRad(b.lon - a.lon);
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const s = Math.sin(dphi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R_KM * c;
}

function computeRouteKm(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const fromCode = waypoints[i];
    const toCode = waypoints[i + 1];
    const from = airports[fromCode];
    const to = airports[toCode];
    if (!from || !to) {
      throw new Error(`Unknown ICAO code: ${!from ? fromCode : toCode}`);
    }
    total += haversineKm(from, to);
  }
  return total;
}

module.exports = { valorParcial, valorTotal, computeRouteKm };
