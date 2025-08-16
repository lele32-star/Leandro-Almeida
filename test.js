const assert = require('assert');

// Funções de utilidade
const asKM = nm => nm * 1.852;
const parseNum = v => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const ICAO_COORDS = { SBBR:{lat:-15.871,lng:-47.918}, SBGL:{lat:-22.809,lng:-43.25} };
const haversineKm = (a,b) => { const R=6371, toRad=d=>d*Math.PI/180; const dlat=toRad(b.lat-a.lat), dlon=toRad(b.lng-a.lng); const s=Math.sin(dlat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dlon/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };
const getCoords = code => ICAO_COORDS[code] ? {lat:ICAO_COORDS[code].lat, lng:ICAO_COORDS[code].lng} : null;
const computeRouteKm = waypoints => { const coords=waypoints.map(getCoords); if(coords.some(c=>!c)) return null; let total=0; for(let i=0;i<coords.length-1;i++) total+=haversineKm(coords[i], coords[i+1]); return total; };

// Testes
assert.strictEqual(asKM(1), 1.852);
assert.strictEqual(parseNum('2,5'), 2.5);
const dist = computeRouteKm(['SBBR','SBGL']);
assert(dist && Math.abs(dist - 913.5767) < 1);

console.log('Testes básicos concluídos com sucesso.');
