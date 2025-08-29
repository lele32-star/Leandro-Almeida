import assert from 'assert';
import { buildState, buildDocDefinition, gerarPDF, calcularComissao, buildDocDefinitionFromSnapshot } from './app.js';
import { freezeQuote, unfreezeQuote, getFrozenQuote, isFrozen, assertMutableOrThrow } from './src/state/snapshotStore.js';
import { buildDocDefinition as buildPureDocDefinition } from './src/pdf/buildDocDefinition.js';

function extractText(docDef) {
  return docDef.content
    .map(item => {
      if (item && item.text) return item.text;
      if (item && item.table) {
        return item.table.body.flat().map(c => c.text).join(' ');
      }
      return '';
    })
    .join('\n');
}

const baseState = {
  aeronave: 'Hawker 400',
  nm: 100,
  origem: 'Origem',
  destino: 'Destino',
  dataIda: '2024-01-01',
  dataVolta: '2024-01-02',
  observacoes: 'Teste',
  pagamento: 'INTER - 077\nAUTOCON SUPRIMENTOS DE INFORMATICA\nCNPJ: 36.326.772/0001-65\nAgência: 0001\nConta: 25691815-5',
  valorExtra: 50,
  tipoExtra: 'soma',
  valorKm: 36,
  showRota: true,
  showAeronave: true,
  showTarifa: true,
  showDistancia: true,
  showDatas: true,
  showAjuste: true,
  showComissao: true,
  showObservacoes: true,
  showPagamento: true,
  showMapa: true
};

// Test: filter flags (via pdfOptions)
const expectations = {
  includeRoute: 'Rota:',
  includeAircraft: 'Aeronave:',
  includeTariff: 'Tarifa por km:',
  includeDistance: 'Distância:',
  includeDates: 'Datas:',
  includeObservations: 'Observações:',
  includePayment: 'Dados de pagamento:',
  includeMap: 'Mapa:'
};

for (const [flag, keyword] of Object.entries(expectations)) {
  const pdfOptions = { [flag]: false };
  const doc = buildDocDefinition(baseState, 'method1', pdfOptions);
  const text = extractText(doc);
  assert(!text.includes(keyword), `${keyword} should be omitted when ${flag} is false`);
}

console.log('All filter tests passed.');

// Test commission calculation
const commData = calcularComissao(3600, 50, 'soma', [10]);
assert(commData.totalComissao === 360, 'Commission calculation should be correct');
console.log('Commission calculation test passed.');

// Test route ordering
const routeDoc = buildDocDefinition({
  ...baseState,
  origem: 'SBBR',
  destino: 'SBMO',
  stops: ['SBBH', 'SBBR']
});
const routeText = extractText(routeDoc);
assert(routeText.includes('SBBR → SBMO → SBBH → SBBR'), 'Route should list destination before extra stops');
console.log('Route ordering test passed.');

// ===== PHASE 4 TESTS: Snapshot Store =====
console.log('Testing snapshot store...');

// Test initial state
assert(!isFrozen(), 'Should not be frozen initially');
assert(getFrozenQuote() === null, 'Should not have frozen quote initially');

// Test freezing
const testSnapshot = { ...baseState, selectedMethod: 'distance' };
freezeQuote(testSnapshot);
assert(isFrozen(), 'Should be frozen after freezeQuote');
assert(getFrozenQuote() !== null, 'Should have frozen quote after freeze');

// Test assertMutableOrThrow when frozen
try {
  assertMutableOrThrow();
  assert(false, 'Should throw when frozen');
} catch (e) {
  assert(e.message.includes('frozen'), 'Should throw appropriate error message');
}

// Test unfreezing  
unfreezeQuote();
assert(!isFrozen(), 'Should not be frozen after unfreeze');
assert(getFrozenQuote() === null, 'Should not have frozen quote after unfreeze');

// Test assertMutableOrThrow when not frozen
try {
  assertMutableOrThrow();
  // Should not throw
} catch (e) {
  assert(false, 'Should not throw when not frozen');
}

console.log('Snapshot store tests passed.');

// ===== PHASE 4 TESTS: Pure PDF Generation =====
console.log('Testing pure PDF generation...');

// Test pure PDF function
const pureDoc = buildPureDocDefinition(baseState, 'method1', {}, []);
assert(pureDoc && pureDoc.content, 'Pure PDF function should return valid document');
assert(extractText(pureDoc).includes('Cotação de Voo Executivo'), 'Pure PDF should contain expected content');

// Test that pure PDF function is deterministic (same input = same output)
const pureDoc2 = buildPureDocDefinition(baseState, 'method1', {}, []);
assert(JSON.stringify(pureDoc) === JSON.stringify(pureDoc2), 'Pure PDF function should be deterministic');

// Test pure PDF with different method selection
const pureDocMethod2 = buildPureDocDefinition({
  ...baseState,
  metodo2: {
    subtotal: 5000,
    total: 5500,
    totalHours: 2.5,
    totalHhmm: '2:30',
    hourlyRate: 2000
  }
}, 'method2', {}, []);
assert(pureDocMethod2 && pureDocMethod2.content, 'Pure PDF function should work with method2');

console.log('Pure PDF generation tests passed.');

// ===== PHASE 4 TESTS: Snapshot PDF Integration =====
console.log('Testing snapshot PDF integration...');

// Freeze a quote
freezeQuote({
  ...baseState,
  selectedMethod: 'distance',
  distanciaKm: 185.2,
  distanciaNm: 100,
  subtotal: 6667.2,
  total: 7333.92,
  valorKm: 36
});

// Test buildDocDefinitionFromSnapshot
try {
  const snapshotDoc = buildDocDefinitionFromSnapshot('method1', {});
  assert(snapshotDoc && snapshotDoc.content, 'buildDocDefinitionFromSnapshot should return valid document');
  console.log('buildDocDefinitionFromSnapshot test passed.');
} catch (error) {
  console.error('buildDocDefinitionFromSnapshot test failed:', error);
  assert(false, 'buildDocDefinitionFromSnapshot should work with frozen quote');
}

// Clean up
unfreezeQuote();

console.log('All Phase 4 tests passed!');