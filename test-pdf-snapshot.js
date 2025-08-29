import assert from 'assert';
import { buildDocDefinition as buildPureDocDefinition } from './src/pdf/buildDocDefinition.js';

/**
 * Test suite for the pure PDF generation module
 * Tests that the buildDocDefinition module produces consistent, testable output
 */

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

// Base test snapshot
const testSnapshot = {
  aeronave: 'Hawker 400',
  nm: 100,
  origem: 'SBBR',
  destino: 'SBGR',
  dataIda: '2024-01-01',
  dataVolta: '2024-01-02',
  observacoes: 'Test observations',
  pagamento: 'Test payment info',
  valorExtra: 100,
  tipoExtra: 'soma',
  valorKm: 40,
  showRota: true,
  showAeronave: true,
  showTarifa: true,
  showDistancia: true,
  showDatas: true,
  showAjuste: true,
  showComissao: true,
  showObservacoes: true,
  showPagamento: true,
  showMapa: false,
  distanciaKm: 185.2,
  distanciaNm: 100,
  subtotal: 7408,
  total: 8508,
  commissions: [5],
  commissionAmountExtra: 370.4
};

// Test 1: Basic PDF generation
console.log('Test 1: Basic PDF generation...');
const basicDoc = buildPureDocDefinition(testSnapshot, 'method1', {}, []);
assert(basicDoc && basicDoc.content, 'Should return valid document');
assert(basicDoc.pageSize === 'A4', 'Should use A4 page size');
assert(Array.isArray(basicDoc.content), 'Content should be an array');
console.log('✓ Basic PDF generation test passed');

// Test 2: Content verification
console.log('Test 2: Content verification...');
const text = extractText(basicDoc);
assert(text.includes('Cotação de Voo Executivo'), 'Should include title');
assert(text.includes('Hawker 400'), 'Should include aircraft');
assert(text.includes('SBBR → SBGR'), 'Should include route');
assert(text.includes('2024-01-01 - 2024-01-02'), 'Should include dates');
assert(text.includes('Test observations'), 'Should include observations');
assert(text.includes('Test payment info'), 'Should include payment info');
console.log('✓ Content verification test passed');

// Test 3: PDF Options filtering
console.log('Test 3: PDF Options filtering...');
const filteredDoc = buildPureDocDefinition(testSnapshot, 'method1', {
  includeObservations: false,
  includePayment: false,
  includeAircraft: false
}, []);
const filteredText = extractText(filteredDoc);
assert(!filteredText.includes('Test observations'), 'Should exclude observations when disabled');
assert(!filteredText.includes('Test payment info'), 'Should exclude payment when disabled');
assert(!filteredText.includes('Aeronave: Hawker 400'), 'Should exclude aircraft when disabled');
console.log('✓ PDF Options filtering test passed');

// Test 4: Method selection
console.log('Test 4: Method selection...');
const snapshotWithMethod2 = {
  ...testSnapshot,
  metodo2: {
    subtotal: 5000,
    total: 5500,
    totalHours: 2.5,
    totalHhmm: '2:30',
    hourlyRate: 2000,
    detalhesComissao: [{ percent: 5, calculado: 250 }]
  }
};

const method2Doc = buildPureDocDefinition(snapshotWithMethod2, 'method2', {}, []);
const method2Text = extractText(method2Doc);
console.log('Method2 text preview:', method2Text.substring(0, 500));
assert(method2Text.includes('Tempo'), 'Should show time-based method');
assert(method2Text.includes('2:30'), 'Should include time duration');
console.log('✓ Method selection test passed');

// Test 5: Deterministic output (pure function test)
console.log('Test 5: Deterministic output...');
const doc1 = buildPureDocDefinition(testSnapshot, 'method1', {}, []);
const doc2 = buildPureDocDefinition(testSnapshot, 'method1', {}, []);
const doc1Json = JSON.stringify(doc1);
const doc2Json = JSON.stringify(doc2);
assert(doc1Json === doc2Json, 'Should produce identical output for identical input');
console.log('✓ Deterministic output test passed');

// Test 6: Aircraft catalog integration
console.log('Test 6: Aircraft catalog integration...');
const mockCatalog = [
  {
    id: 'hawker-400',
    nome: 'Hawker 400',
    hourly_rate_brl_default: 18000,
    cruise_speed_kt_default: 430
  }
];

const docWithCatalog = buildPureDocDefinition(snapshotWithMethod2, 'method2', {}, mockCatalog);
const catalogText = extractText(docWithCatalog);
assert(catalogText.includes('18.000'), 'Should use catalog hourly rate');
console.log('✓ Aircraft catalog integration test passed');

// Test 7: Commission handling
console.log('Test 7: Commission handling...');
const commissionText = extractText(basicDoc);
assert(commissionText.includes('Comissão'), 'Should include commission when present');
assert(commissionText.includes('5%'), 'Should show commission percentage');
console.log('✓ Commission handling test passed');

// Test 8: Map data URL
console.log('Test 8: Map data URL...');
const snapshotWithMap = {
  ...testSnapshot,
  mapDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
};

const mapDoc = buildPureDocDefinition(snapshotWithMap, 'method1', { includeMap: true }, []);
assert(mapDoc.content.some(item => item.image), 'Should include map image when mapDataUrl is present');
console.log('✓ Map data URL test passed');

// Test 9: Style consistency
console.log('Test 9: Style consistency...');
assert(basicDoc.styles, 'Should include styles');
assert(basicDoc.styles.h1, 'Should include h1 style');
assert(basicDoc.styles.brand, 'Should include brand style');
assert(basicDoc.defaultStyle, 'Should include default style');
console.log('✓ Style consistency test passed');

// Test 10: Footer function
console.log('Test 10: Footer function...');
assert(typeof basicDoc.footer === 'function', 'Footer should be a function');
const footerResult = basicDoc.footer(1, 2);
assert(footerResult && footerResult.columns, 'Footer should return valid structure');
console.log('✓ Footer function test passed');

console.log('\n🎉 All PDF snapshot tests passed!');
console.log('The buildDocDefinition module is pure, testable, and produces consistent output.');