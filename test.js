const assert = require('assert');
const { calcularTotais } = require('./app');

// Comissão com extra soma: comissão apenas sobre km*valorKm
(() => {
  const km = 10;
  const valorKm = 100;
  const valorExtra = 50;
  const tipoExtra = 'soma';
  const comissaoPercent = 10;
  const { parcial, comissaoValor, total } = calcularTotais({ km, valorKm, valorExtra, tipoExtra, comissaoPercent });
  assert.strictEqual(parcial, km * valorKm);
  assert.strictEqual(comissaoValor, parcial * (comissaoPercent/100));
  assert.strictEqual(total, parcial + valorExtra + comissaoValor);
})();

// Comissão com extra subtrai: comissão sobre (km*valorKm - valorExtra)
(() => {
  const km = 10;
  const valorKm = 100;
  const valorExtra = 50;
  const tipoExtra = 'subtrai';
  const comissaoPercent = 10;
  const { parcial, comissaoValor, total } = calcularTotais({ km, valorKm, valorExtra, tipoExtra, comissaoPercent });
  const base = parcial - valorExtra;
  assert.strictEqual(comissaoValor, base * (comissaoPercent/100));
  assert.strictEqual(total, base + comissaoValor);
})();

console.log('Todos os testes passaram!');
