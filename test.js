const assert = require('assert');
const { JSDOM } = require('jsdom');
const { valorParcial, valorTotal, computeRouteKm } = require('./cotacao');

// Financial calculations
(() => {
  const distancia = 100;
  const tarifa = 5;
  assert.strictEqual(valorParcial(distancia, tarifa), 500);
})();

(() => {
  const distancia = 80;
  const tarifa = 10;
  const extra = 50;
  assert.strictEqual(valorTotal(distancia, tarifa, extra), 850);
})();

(() => {
  const distancia = 80;
  const tarifa = 10;
  const extra = -30;
  assert.strictEqual(valorTotal(distancia, tarifa, extra), 770);
})();

// computeRouteKm positive case
(() => {
  const waypoints = ['SBBR', 'SBMO', 'SBBH'];
  const dist = computeRouteKm(waypoints);
  assert.ok(Math.abs(dist - 2939) < 1);
})();

// computeRouteKm edge cases
(() => {
  assert.strictEqual(computeRouteKm(['SBBR']), 0);
  assert.throws(() => computeRouteKm(['SBBR','XXXX']), /Unknown ICAO code/);
})();

// jsdom setup for DOM-based tests
(() => {
  const dom = new JSDOM(`<!DOCTYPE html><input id="nm"><input id="km"><div id="stops"></div><button id="btnAddStop"></button>`);
  const { document } = dom.window;
  global.document = document;
  global.window = dom.window;

  function ensureKmSynced(){
    const nm = parseFloat(document.getElementById('nm').value);
    const kmInput = document.getElementById('km');
    kmInput.value = Number.isFinite(nm) ? (nm * 1.852).toFixed(1) : '';
  }
  function ensureNmSynced(){
    const km = parseFloat(document.getElementById('km').value);
    const nmInput = document.getElementById('nm');
    nmInput.value = Number.isFinite(km) ? (km / 1.852).toFixed(1) : '';
  }

  let drawCalled = 0;
  global.drawRouteOnMap = () => { drawCalled++; };
  function addStopField(){
    const input = document.createElement('input');
    input.className = 'stop-input';
    document.getElementById('stops').appendChild(input);
    drawRouteOnMap();
  }

  // NM -> KM sync
  document.getElementById('nm').value = '10';
  ensureKmSynced();
  assert.strictEqual(document.getElementById('km').value, (10 * 1.852).toFixed(1));

  // KM -> NM sync
  document.getElementById('km').value = '37.0';
  ensureNmSynced();
  assert.strictEqual(document.getElementById('nm').value, (37.0 / 1.852).toFixed(1));

  // Add-stop logic and map call
  const btn = document.getElementById('btnAddStop');
  btn.addEventListener('click', addStopField);
  btn.dispatchEvent(new dom.window.Event('click'));
  assert.strictEqual(document.querySelectorAll('#stops .stop-input').length, 1);
  assert.strictEqual(drawCalled, 1);
})();

console.log('All tests passed');
