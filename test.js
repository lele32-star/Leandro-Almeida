const assert = require('assert');
const { gerarPDF } = require('./app.js');

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
