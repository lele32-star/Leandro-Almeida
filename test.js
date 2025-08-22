const assert = require('assert');
const { valorParcial, valorTotal } = require('./cotacao');

// Test for valorParcial
(() => {
  const distancia = 100; // km
  const tarifa = 5; // R$ por km
  const esperado = 500;
  assert.strictEqual(valorParcial(distancia, tarifa), esperado);
})();

// Test for valorTotal with positive extra
(() => {
  const distancia = 80;
  const tarifa = 10;
  const extra = 50;
  const esperado = 80 * 10 + 50;
  assert.strictEqual(valorTotal(distancia, tarifa, extra), esperado);
})();

// Test for valorTotal with negative extra
(() => {
  const distancia = 80;
  const tarifa = 10;
  const extra = -30;
  const esperado = 80 * 10 - 30;
  assert.strictEqual(valorTotal(distancia, tarifa, extra), esperado);
})();

console.log('Todos os testes passaram!');
