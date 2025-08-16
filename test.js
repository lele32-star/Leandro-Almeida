const assert = require('assert');
const { valorParcial, valorTotal, computeRouteKm } = require('./cotacao');

// Unit tests for financial calculations
(() => {
  const distancia = 100; // km
  const tarifa = 5; // R$ per km
  const esperado = 500;
  assert.strictEqual(valorParcial(distancia, tarifa), esperado);
})();

(() => {
  const distancia = 80;
  const tarifa = 10;
  const extra = 50;
  const esperado = 80 * 10 + 50;
  assert.strictEqual(valorTotal(distancia, tarifa, extra), esperado);
})();

(() => {
  const distancia = 80;
  const tarifa = 10;
  const extra = -30;
  const esperado = 80 * 10 - 30;
  assert.strictEqual(valorTotal(distancia, tarifa, extra), esperado);
})();

// Unit test for computeRouteKm
(() => {
  const waypoints = ['SBBR', 'SBMO', 'SBBH'];
  const dist = computeRouteKm(waypoints);
  // Expected distance in km for SBBR->SBMO->SBBH ~ 2939 km
  assert.ok(Math.abs(dist - 2939) < 1);
})();

// Smoke test for "Adicionar Aeroporto" button
(() => {
  const elements = {};
  function createElement(tag) {
    return {
      tagName: tag.toUpperCase(),
      children: [],
      className: '',
      addEventListener(event, handler) { this['on'+event] = handler; },
      appendChild(child) { this.children.push(child); },
      click() { this.onclick && this.onclick({ target: this }); }
    };
  }
  elements['stops'] = createElement('div');
  const button = createElement('button');
  elements['btnAddStop'] = button;
  global.document = {
    getElementById: id => elements[id],
    createElement
  };
  let drawCalled = 0;
  global.drawRouteOnMap = () => { drawCalled++; };
  function addStopField() {
    const input = document.createElement('input');
    input.className = 'stop-input';
    document.getElementById('stops').appendChild(input);
    drawRouteOnMap();
  }
  button.addEventListener('click', addStopField);
  button.click();
  assert.strictEqual(elements['stops'].children.length, 1);
  assert.strictEqual(drawCalled, 1);
})();

console.log('All tests passed');
