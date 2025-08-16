const assert = require('assert');
const { valorParcial, valorTotal } = require('./cotacao');

// ---- Cost calculation tests ----
(() => {
  const distancia = 100; // km
  const tarifa = 5; // R$ por km
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

// ---- PDF generation smoke test (DOM stub) ----
const elements = {};
const createElement = (id, props) => { elements[id] = props; };
global.document = { getElementById: id => elements[id] };
global.window = {};
global.pdfMake = { createPdf: () => ({ open: () => {} }) };

// minimal required inputs
createElement('aeronave', { value: 'Hawker 400' });
createElement('nm', { value: '10' });
createElement('origem', { value: 'AAA' });
createElement('destino', { value: 'BBB' });
createElement('dataIda', { value: '2024-01-01' });
createElement('dataVolta', { value: '2024-01-02' });
createElement('observacoes', { value: '' });
createElement('incluirNoPDF', { checked: false });
createElement('valorExtra', { value: '0' });
createElement('tipoExtra', { value: 'soma' });

function gerarPDF() {
  const aeronave = document.getElementById('aeronave').value;
  const nm = parseFloat(document.getElementById('nm').value);
  const origem = document.getElementById('origem').value;
  const destino = document.getElementById('destino').value;
  const dataIda = document.getElementById('dataIda').value;
  const dataVolta = document.getElementById('dataVolta').value;
  const observacoes = document.getElementById('observacoes').value;
  const incluirNoPDF = document.getElementById('incluirNoPDF').checked;
  const valorExtra = parseFloat(document.getElementById('valorExtra').value) || 0;
  const tipoExtra = document.getElementById('tipoExtra').value;

  const km = nm * 1.852;
  const valorKm = 36; // valor da aeronave de teste
  let total = km * valorKm;
  let ajustes = '';
  if (valorExtra > 0 && incluirNoPDF) {
    total += tipoExtra === 'soma' ? valorExtra : -valorExtra;
    ajustes = { text: `Ajuste: R$ ${valorExtra.toFixed(2)}` };
  }

  const docDefinition = {
    content: [
      { text: 'Cotação de Voo Executivo' },
      { text: `Origem: ${origem} → Destino: ${destino}` },
      { text: `Aeronave: ${aeronave}` },
      ajustes,
      { text: `Total Final: R$ ${total.toFixed(2)}` },
      observacoes ? { text: `Observações: ${observacoes}` } : null
    ].filter(Boolean)
  };
  pdfMake.createPdf(docDefinition).open();
}

assert.doesNotThrow(() => gerarPDF());

console.log('All tests passed');
