const assert = require('assert');
const { gerarPDF, buildState, buildDocDefinition } = require('./app.js');

function extractText(docDef) {
  return docDef.content
    .filter(item => item && item.text)
    .map(item => item.text)
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
  incluirNoPDF: true,
  valorExtra: 50,
  tipoExtra: 'soma',
  valorKm: 36,
  showRota: true,
  showAeronave: true,
  showTarifa: true,
  showDistancia: true,
  showDatas: true,
  showAjuste: true,
  showObservacoes: true,
  showMapa: true
};

const expectations = {
  showRota: 'Rota:',
  showAeronave: 'Aeronave:',
  showTarifa: 'Total Final:',
  showDistancia: 'Distância:',
  showDatas: 'Datas:',
  showAjuste: 'Outras Despesas',
  showObservacoes: 'Observações:',
  showMapa: 'Mapa:'
};

for (const [flag, keyword] of Object.entries(expectations)) {
  const state = { ...baseState, [flag]: false };
  const doc = gerarPDF(state);
  const text = extractText(doc);
  assert(!text.includes(keyword), `${keyword} should be omitted when ${flag} is false`);
}

console.log('All filter tests passed.');

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
  incluirNoPDF: { checked: false },
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
  showMapa: { checked: true }
};
global.document = {
  getElementById: id => elements[id]
};
const stateConv = buildState();
assert(Math.abs(stateConv.nm - 100) < 1e-6, 'KM field should convert to NM');
console.log('KM to NM conversion test passed.');

// custom tariff affects total
const customDoc = buildDocDefinition({ ...baseState, valorKm: 50 });
const textCustom = extractText(customDoc);
assert(textCustom.includes('R$ 9.310,00'), 'Custom tariff should affect total');
console.log('Custom tariff test passed.');
