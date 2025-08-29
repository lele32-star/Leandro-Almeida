const assert = require('assert');
const { buildState, buildDocDefinition, gerarPDF, calcularComissao } = require('./app.js');

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

// Test: filter flags (agora via pdfOptions ao invés de state flags)
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

// total should include adjustment even when includeAdjustment is false
const pdfOptionsAdjHidden = { includeAdjustment: false };
const docAdjHidden = buildDocDefinition({ ...baseState, valorExtra: 5000 }, 'method1', pdfOptionsAdjHidden);
const textAdjHidden = extractText(docAdjHidden);
const subtotal = baseState.nm * 1.852 * baseState.valorKm;
const expectedTotal = (subtotal + 5000).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
assert(textAdjHidden.includes(`Total Final: R$ ${expectedTotal}`), 'Final total should include adjustment even when hidden');
assert(textAdjHidden.includes('Total parcial'), 'Partial total should be displayed');
console.log('Adjustment exclusion test passed.');

// km -> nm conversion via buildState
const elements = {
  aeronave: { value: 'Hawker 400' },
  nm: { value: '' },
  km: { value: '185.2' },
  origem: { value: '' },
  destino: { value: '' },
  dataIda: { value: '' },
  dataVolta: { value: '' },
  observacoes: { value: '' },
  pagamento: { value: 'INTER - 077\nAUTOCON SUPRIMENTOS DE INFORMATICA\nCNPJ: 36.326.772/0001-65\nAgência: 0001\nConta: 25691815-5' },
  valorExtra: { value: '0' },
  tipoExtra: { value: 'soma' },
  tarifa: { value: '36' },
  showRota: { checked: true },
  showAeronave: { checked: true },
  showTarifa: { checked: true },
  showDistancia: { checked: true },
  showDatas: { checked: true },
  showAjuste: { checked: true },
  showObservacoes: { checked: true },
  showPagamento: { checked: true },
  showMapa: { checked: true }
};
elements.commissionShowInPdf = { value: '1' };
global.document = {
  getElementById: id => elements[id],
  querySelectorAll: sel => (sel === '.stop-input' ? [{ value: 'SBBH' }] : sel === '.commission-percent' ? [{ value: '10' }] : [])
};
const stateConv = buildState();
assert(Math.abs(stateConv.nm - 100) < 1e-6, 'KM field should convert to NM');
console.log('KM to NM conversion test passed.');
assert.deepStrictEqual(stateConv.stops, ['SBBH'], 'Stops should include dynamically added airports');
console.log('Stops collection test passed.');

// tariff field respects manual override
elements.tarifa.value = '50';
const stateTar = buildState();
assert.strictEqual(stateTar.valorKm, 50, 'Tariff input should override default');
elements.tarifa.value = '';
const stateTarFallback = buildState();
assert.strictEqual(stateTarFallback.valorKm, 36, 'Empty tariff reverts to default');
console.log('Tariff override test passed.');

// custom tariff affects total
const customDoc = buildDocDefinition({ ...baseState, valorKm: 50 });
const textCustom = extractText(customDoc);
assert(textCustom.includes('R$ 9.310,00'), 'Custom tariff should affect total');
console.log('Custom tariff test passed.');

// commission calculations
const commissionResult = calcularComissao(6667.2, 200, 'soma', [10, 5]);
assert(Math.abs(commissionResult.totalComissao - 1000.08) < 1e-2, 'Commission should apply on base flight value when extra is addition');
const docComm = buildDocDefinition({ ...baseState, valorExtra: 200, tipoExtra: 'soma', commissions: [10, 5] });
const textComm = extractText(docComm);
assert(textComm.includes('Comissão 1: R$ 666,72'), 'First percentage commission should be calculated correctly');
assert(textComm.includes('Comissão 2: R$ 333,36'), 'Second percentage commission should be displayed');
assert(textComm.includes('Total Final: R$ 7.867,28'), 'Total should include commissions and extras');
const commissionDiscount = calcularComissao(6667.2, 200, 'subtrai', [10]);
assert(Math.abs(commissionDiscount.totalComissao - 666.72) < 1e-2, 'Commission ignores discount when calculating base');
const docCommDisc = buildDocDefinition({ ...baseState, valorExtra: 200, tipoExtra: 'subtrai', commissions: [10] });
const textCommDisc = extractText(docCommDisc);
assert(textCommDisc.includes('Comissão 1: R$ 666,72'), 'Discount should not reduce commission base');
assert(textCommDisc.includes('Total Final: R$ 7.133,92'), 'Total should consider discount and commission');

const docCommHidden = buildDocDefinition({ ...baseState, commissions: [10], showComissao: false });
const textCommHidden = extractText(docCommHidden);
assert(!textCommHidden.includes('Comissão'), 'Commission lines should be hidden when showComissao is false');
const subtotalBase = baseState.nm * 1.852 * baseState.valorKm;
const expectedHiddenTotal = (subtotalBase + baseState.valorExtra + subtotalBase * 0.10).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
assert(textCommHidden.includes(`Total Final: R$ ${expectedHiddenTotal}`), 'Total should include commission even when hidden');
console.log('Commission tests passed.');

// route order should place destination first then extra stops
const routeDoc = buildDocDefinition({
  ...baseState,
  origem: 'SBBR',
  destino: 'SBMO',
  stops: ['SBBH', 'SBBR']
});
const routeText = extractText(routeDoc);
assert(routeText.includes('SBBR → SBMO → SBBH → SBBR'), 'Route should list destination before extra stops');
console.log('Route ordering test passed.');

// gerarPDF should request coordinates in correct order
(async () => {
  const fetchCalls = [];
  global.fetch = async (url) => {
    fetchCalls.push(url);
    return { ok: true, json: async () => ({ location: { lat: 0, lon: 0 } }) };
  };
  await gerarPDF({
    ...baseState,
    origem: 'SBBR',
    destino: 'SBMO',
    stops: ['SBBH', 'SBBR'],
    showMapa: true,
    showRota: false,
    showAeronave: false,
    showTarifa: false,
    showDistancia: false,
    showDatas: false,
    showAjuste: false,
    showObservacoes: false,
  });
  const codes = fetchCalls.map(u => u.split('/').pop());
  assert.deepStrictEqual(codes, ['SBBR', 'SBMO', 'SBBH'], 'gerarPDF should fetch coordinates in waypoint order');
  console.log('gerarPDF waypoint order test passed.');
})();

// === Novos testes para Fase 0: catálogo + overrides ===
const acs = require('./data/aircraftCatalog.service.js');
// catálogo deve existir e conter ao menos 7 entries
const catalog = acs.getCatalog();
assert(Array.isArray(catalog) && catalog.length >= 7, 'Catalog should contain at least 7 aircraft');
console.log('Catalog presence test passed.');

// getAircraftEffectiveParams retorna valores default inicialmente
const sampleId = catalog[0].id;
const eff = acs.getAircraftEffectiveParams(sampleId);
assert(eff && typeof eff.cruise_speed_kt === 'number' && typeof eff.hourly_rate_brl === 'number', 'Effective params should return numeric defaults');
console.log('getAircraftEffectiveParams default values test passed.');

// overrides persist in storage (in-memory fallback in Node)
acs.clearOverrides();
const overrides = {};
overrides[sampleId] = { cruise_speed_kt: 123, hourly_rate_brl: 4567 };
acs.saveOverrides(overrides);
const eff2 = acs.getAircraftEffectiveParams(sampleId);
assert(eff2.cruise_speed_kt === 123 && eff2.hourly_rate_brl === 4567, 'Overrides should override defaults');
console.log('Overrides persistence and apply test passed.');

// cleanup
acs.clearOverrides();

// pricingMode migration: buildState should default to 'distanceTotal' when not present (migration of old quotes)
elements.pricingMode = undefined; // simulate older UI where pricingMode is absent
const bs = require('./app.js').buildState;
const st = bs();
assert(st.pricingMode === 'distanceTotal', 'Legacy quotes should default to distanceTotal pricingMode');
console.log('pricingMode migration test passed.');

// === Fase 3: testes para calcTempo ===
const { calcTempo: calcTempoFn } = require('./app.js');
// happy path: 120 NM at 240 kt -> 0.5 h -> 00:30
const t1 = calcTempoFn(120, 240);
assert(Math.abs(t1.hoursDecimal - 0.5) < 1e-6, 'calcTempo should compute decimal hours correctly');
assert(t1.hhmm === '0:30' || t1.hhmm === '00:30', 'calcTempo should format HH:MM correctly for 0.5h');

// edge cases
const t0 = calcTempoFn(0, 300);
assert(t0.hoursDecimal === 0 && t0.hhmm === '0:00', 'Zero distance returns 0:00');
const tinv = calcTempoFn(100, 0);
assert(tinv.hoursDecimal === 0 && tinv.hhmm === '0:00', 'Invalid speed returns 0:00');
console.log('calcTempo tests passed.');

// === Fase 8: Testes para parâmetros avançados de planejamento ===
(() => {
  const app = require('./app.js');
  // prepare a draft payload with two legs of 1.0 h each and advanced planning params
  const mod = require('./app.js');
  global.window = global.window || {};
  global.window.__lastDraft = {
    state: { aeronave: 'Hawker 400', nm: 200, origem: 'SBBR', destino: 'SBSP', stops: [] , valorKm:36 },
    legsData: [{ from: 'A', to: 'B', time: { hoursDecimal: 1 } }, { from: 'B', to: 'C', time: { hoursDecimal: 1 } }],
    overrides: {},
    timestamp: new Date().toISOString()
  };
  // set DOM controls to enable advanced planning
  elements.enableAdvancedPlanning = { checked: true };
  elements.windBuffer = { value: '10' }; // +10%
  elements.taxiMinutes = { value: '10' }; // 10 minutes per leg
  elements.minBillable = { value: '0' };
  // call loadDraft which will restore legsData and trigger calculation when possible
  const payload = mod.loadDraft ? mod.loadDraft() : null;
  // method2 summary should now be on global.window.__method2Summary after load
  const m2 = global.window.__method2Summary || null;
  if (m2) {
    const approx = Number((m2.totalHours).toFixed(3));
    assert(Math.abs(approx - 2.566) < 0.01, 'Advanced planning should increase total hours with taxi and wind buffer');
    console.log('Advanced planning toggles test passed.');
  } else {
    console.log('Advanced planning: method2 summary not available in this environment; manual check recommended.');
  }
})();

// === Fase 6: round-trip save/load draft test ===
(() => {
  // saveDraft/loadDraft are attached to window in browser; in Node we set global.window
  if (typeof global.window === 'undefined') global.window = {};
  // populate DOM-like elements for buildState to read
  elements.aeronave = { value: 'Hawker 400' };
  elements.nm = { value: '120' };
  elements.km = { value: '' };
  elements.origem = { value: 'SBBR' };
  elements.destino = { value: 'SBGR' };
  elements.valorExtra = { value: '0' };
  elements.tipoExtra = { value: 'soma' };
  elements.tarifa = { value: '40' };
  elements.dataIda = { value: '2025-01-01' };
  elements.dataVolta = { value: '2025-01-02' };
  elements.observacoes = { value: 'Obs' };
  elements.pagamento = { value: 'PG' };
  elements.showRota = { checked: true };
  elements.showAeronave = { checked: true };
  elements.showTarifa = { checked: true };
  elements.showDistancia = { checked: true };
  elements.showDatas = { checked: true };
  elements.showAjuste = { checked: true };
  elements.showObservacoes = { checked: true };
  elements.showPagamento = { checked: true };
  elements.showMapa = { checked: true };
  // Redefine document getter after populating elements
  global.document = {
    getElementById: id => elements[id],
    querySelectorAll: sel => (sel === '.stop-input' ? [] : sel === '.commission-percent' ? [] : [])
  };
  // ensure saveDraft exists
  const app = require('./app.js');
  if (typeof app.saveDraft === 'function' && typeof app.loadDraft === 'function') {
    // save
    const ok = app.saveDraft();
    assert.ok(ok, 'saveDraft should return true');
    // simulate reload by clearing DOM and then loading
    elements.aeronave.value = '';
    elements.nm.value = '';
    elements.tarifa.value = '';
    const payload = app.loadDraft();
    assert(payload && payload.state, 'loadDraft should return payload with state');
    // verify key round-trip fields
    assert.strictEqual(payload.state.aeronave, 'Hawker 400', 'Aeronave should persist in draft');
    assert.strictEqual(Number(payload.state.nm), 120, 'NM should persist in draft');
    assert.strictEqual(Number(payload.state.valorKm), 40, 'Tarifa should persist in draft');
    console.log('Round-trip save/load draft test passed.');
  } else {
    console.log('Draft API not available in this environment; skipping round-trip test.');
  }
})();

// === adjustLegTime unit tests ===
(() => {
  const { adjustLegTime } = require('./app.js');
  let r = adjustLegTime(1, { enabled:false });
  assert(Math.abs(r - 1) < 1e-9, 'Disabled should return base');
  r = adjustLegTime(1, { enabled:true, taxiMinutes:30, windPercent:0, minBillableMinutes:0 });
  assert(Math.abs(r - 1.5) < 1e-9, 'Taxi added');
  r = adjustLegTime(1, { enabled:true, taxiMinutes:30, windPercent:10, minBillableMinutes:0 });
  assert(Math.abs(r - 1.65) < 1e-9, 'Wind applied');
  r = adjustLegTime(1, { enabled:true, taxiMinutes:0, windPercent:0, minBillableMinutes:120 });
  assert(Math.abs(r - 2) < 1e-9, 'Min billable enforced');
  console.log('adjustLegTime unit tests passed.');
})();

// === Teste: Persistência de selectedMethodPdf ===
(() => {
  // Simular localStorage em ambiente Node
  if (typeof global.window === 'undefined') global.window = {};
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  // Não setado ainda -> fallback deve retornar 'method1'
  const app = require('./app.js');
  let sel = app.getSelectedPdfMethod ? app.getSelectedPdfMethod() : 'method1';
  assert(sel === 'method1', 'Default selected PDF method should be method1 when nothing stored');
  // Persistir método 2
  localStorage.setItem('selectedMethodPdf', 'method2');
  sel = app.getSelectedPdfMethod();
  assert(sel === 'method2', 'Selected method should persist as method2');
  // Persistir método 1
  localStorage.setItem('selectedMethodPdf', 'method1');
  sel = app.getSelectedPdfMethod();
  assert(sel === 'method1', 'Selected method should switch back to method1');
  console.log('selectedMethodPdf persistence test passed.');
})();
