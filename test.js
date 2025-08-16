const assert = require('assert');

const elements = {};
const createElement = (id, props = {}) => { elements[id] = props; };
const document = { getElementById: (id) => elements[id] };

global.document = document;
global.window = {};

global.pdfMake = {
  createPdf: () => ({ open: () => {} })
};

// setup fields
createElement('nm', { value: '' });
createElement('km', { value: '' });
createElement('aeronave', { value: 'Hawker 400' });
createElement('origem', { value: 'AAA' });
createElement('destino', { value: 'BBB' });
createElement('dataIda', { value: '', min: '' });
createElement('dataVolta', { value: '', min: '' });
createElement('valorExtra', { value: '0' });
createElement('tipoExtra', { value: 'soma' });
createElement('observacoes', { value: '' });
createElement('incluirNoPDF', { checked: false });
createElement('resultado', { innerHTML: '' });

const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

function lockDatesToToday() {
  const dataIda = document.getElementById('dataIda');
  const today = new Date().toISOString().split('T')[0];
  dataIda.value = today;
  dataIda.min = today;
}

function enforceDateOrder() {
  const dataIda = document.getElementById('dataIda');
  const dataVolta = document.getElementById('dataVolta');
  const idaValue = dataIda.value;
  if (idaValue) {
    dataVolta.min = idaValue;
    if (dataVolta.value && dataVolta.value < idaValue) {
      dataVolta.value = idaValue;
    }
  }
}

function ensureKmSynced() {
  const nm = parseFloat(document.getElementById('nm').value);
  const kmField = document.getElementById('km');
  if (!isNaN(nm)) {
    kmField.value = (nm * 1.852).toFixed(1);
  } else {
    kmField.value = '';
  }
}

function ensureNmSynced() {
  const km = parseFloat(document.getElementById('km').value);
  const nmField = document.getElementById('nm');
  if (!isNaN(km)) {
    nmField.value = (km / 1.852).toFixed(1);
  } else {
    nmField.value = '';
  }
}

function gerarPDF() {
  const aeronave = document.getElementById('aeronave').value;
  let nm = parseFloat(document.getElementById('nm').value);
  let km = parseFloat(document.getElementById('km').value);
  if (!isNaN(nm)) {
    km = nm * 1.852;
  } else if (!isNaN(km)) {
    nm = km / 1.852;
  }
  const origem = document.getElementById('origem').value;
  const destino = document.getElementById('destino').value;
  const dataIda = document.getElementById('dataIda').value;
  const dataVolta = document.getElementById('dataVolta').value;
  const observacoes = document.getElementById('observacoes').value;
  const incluirNoPDF = document.getElementById('incluirNoPDF').checked;
  const valorExtra = parseFloat(document.getElementById('valorExtra').value) || 0;
  const tipoExtra = document.getElementById('tipoExtra').value;
  const valorKm = valoresKm[aeronave];
  let total = km * valorKm;

  let ajustes = '';
  if (valorExtra > 0 && incluirNoPDF) {
    if (tipoExtra === 'soma') {
      total += valorExtra;
      ajustes = {
        text: `Outras Despesas: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        margin: [0, 10, 0, 0]
      };
    } else {
      total -= valorExtra;
      ajustes = {
        text: `Desconto: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        margin: [0, 10, 0, 0]
      };
    }
  }

  const docDefinition = {
    content: [
      { text: 'Cotação de Voo Executivo', style: 'header' },
      { text: `Origem: ${origem} → Destino: ${destino}`, margin: [0, 10, 0, 0] },
      { text: `Aeronave: ${aeronave}` },
      { text: `Data Ida: ${dataIda} | Data Volta: ${dataVolta}` },
      ajustes,
      { text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, bold: true, margin: [0, 10, 0, 0] },
      observacoes ? { text: `Observações: ${observacoes}`, margin: [0, 10, 0, 0] } : null
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true
      }
    }
  };

  const nomeArquivo = `Cotacao_${aeronave}_${origem}_${destino}.pdf`.replace(/\s+/g, '_');
  pdfMake.createPdf(docDefinition).open();
}

// Tests
ensureKmSynced();
assert.strictEqual(elements.km.value, '');

elements.nm.value = '10';
ensureKmSynced();
assert.strictEqual(elements.km.value, '18.5');

elements.km.value = '37.0';
ensureNmSynced();
assert.ok(Math.abs(parseFloat(elements.nm.value) - 20.0) < 0.1);

lockDatesToToday();
const today = new Date().toISOString().split('T')[0];
assert.strictEqual(elements.dataIda.value, today);
assert.strictEqual(elements.dataIda.min, today);

elements.dataIda.value = '2024-01-05';
elements.dataVolta.value = '2024-01-01';
enforceDateOrder();
assert.strictEqual(elements.dataVolta.value, '2024-01-05');
assert.strictEqual(elements.dataVolta.min, '2024-01-05');

assert.doesNotThrow(() => gerarPDF());

console.log('All tests passed');
