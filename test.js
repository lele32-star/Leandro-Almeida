const assert = require('assert');

// Core data and helpers replicating index.html
const icaoTable = {
  SBGR: { lat: -23.435556, lng: -46.473056 },
  SBSP: { lat: -23.626111, lng: -46.656389 },
  SBRJ: { lat: -22.910556, lng: -43.163056 },
  SBGL: { lat: -22.809999, lng: -43.250556 },
  SBBR: { lat: -15.871111, lng: -47.918611 },
  SBPA: { lat: -30.000556, lng: -51.171389 }
};

function getCoords(icao) {
  const code = (icao || '').toUpperCase();
  return icaoTable[code];
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Basic validations
assert.deepStrictEqual(getCoords('sbbr'), icaoTable.SBBR);
const dist = haversineKm(icaoTable.SBBR, icaoTable.SBSP);
assert(Math.abs(dist - 872.3547) < 1, 'distance between SBBR and SBSP is ~872.35 km');

console.log('All tests passed');
