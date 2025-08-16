const assert = require('assert');

const airports = {
  SBBR: { lat: -15.869167, lon: -47.920833 },
  SBMO: { lat: -9.510808, lon: -35.791667 },
  SBBH: { lat: -19.851944, lon: -43.950833 }
};
const R_NM = 3440.065;
const toRad = deg => deg * Math.PI / 180;
function haversine(a, b) {
  const dphi = toRad(b.lat - a.lat);
  const dlambda = toRad(b.lon - a.lon);
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const s = Math.sin(dphi/2)**2 + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlambda/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R_NM * c;
}
function getWaypoints(origem, destino, stops = []) {
  return [origem, ...stops, destino];
}
function calculateLegs(waypoints) {
  const legs = [];
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const dist = haversine(airports[from], airports[to]);
    legs.push({ from, to, dist });
    total += dist;
  }
  return { legs, total };
}

(() => {
  const waypoints = getWaypoints('SBBR', 'SBBH', ['SBMO']);
  assert.deepStrictEqual(waypoints, ['SBBR', 'SBMO', 'SBBH']);
  const { legs, total } = calculateLegs(waypoints);
  assert.strictEqual(legs.length, 2);
  assert.ok(Math.abs(total - 1586.6786) < 0.1);
  assert.ok(Math.abs(legs[0].dist - 806.0973) < 0.1);
  assert.ok(Math.abs(legs[1].dist - 780.5813) < 0.1);
})();

console.log('All tests passed');
