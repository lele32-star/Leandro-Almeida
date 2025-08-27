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

const expectations = {
  showRota: 'Rota:',
  showAeronave: 'Aeronave:',
  showTarifa: 'Tarifa por km:',
  showDistancia: 'Distância:',
  showDatas: 'Datas:',
  showAjuste: 'Outras Despesas',
  showComissao: 'Comissão 1:',
  showObservacoes: 'Observações:',
  showPagamento: 'Dados de pagamento:',
  showMapa: 'Mapa:'
};

for (const [flag, keyword] of Object.entries(expectations)) {
  const state = { ...baseState, [flag]: false };
  if (flag === 'showComissao') state.commissions = [10];
  const doc = buildDocDefinition(state);
  const text = extractText(doc);
  assert(!text.includes(keyword), `${keyword} should be omitted when ${flag} is false`);
}

console.log('All filter tests passed.');

// total should include adjustment even when showAjuste is false
const stateAdjHidden = { ...baseState, valorExtra: 5000, showAjuste: false };
const docAdjHidden = buildDocDefinition(stateAdjHidden);
const textAdjHidden = extractText(docAdjHidden);
const subtotal = stateAdjHidden.nm * 1.852 * stateAdjHidden.valorKm;
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
