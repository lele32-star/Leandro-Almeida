const assert = require('assert');

// Minimal DOM simulation
const elements = {};
const createElement = (id, props) => { elements[id] = props; };
const document = { getElementById: (id) => elements[id] };

global.document = document;
global.window = {};

// Minimal valid inputs
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

// pdfMake stub
global.pdfMake = {
  createPdf: () => ({ open: () => {} })
};

const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

function gerarPDF() {
  const aeronave = document.getElementById("aeronave").value;
  const nm = parseFloat(document.getElementById("nm").value);
  const origem = document.getElementById("origem").value;
  const destino = document.getElementById("destino").value;
  const dataIda = document.getElementById("dataIda").value;
  const dataVolta = document.getElementById("dataVolta").value;
  const observacoes = document.getElementById("observacoes").value;
  const incluirNoPDF = document.getElementById("incluirNoPDF").checked;
  const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
  const tipoExtra = document.getElementById("tipoExtra").value;

  const km = nm * 1.852;
  const valorKm = valoresKm[aeronave];
  let total = km * valorKm;

  let ajustes = "";
  if (valorExtra > 0 && incluirNoPDF) {
    if (tipoExtra === "soma") {
      total += valorExtra;
      ajustes = { text: `Outras Despesas: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] };
    } else {
      total -= valorExtra;
      ajustes = { text: `Desconto: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] };
    }
  }

  const docDefinition = {
    content: [
      { text: "Cotação de Voo Executivo", style: "header" },
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

  const nomeArquivo = `Cotacao_${aeronave}_${origem}_${destino}.pdf`.replace(/\s+/g, "_");
  pdfMake.createPdf(docDefinition).open();
}

async function fetchAirportInfo(icao) {
  const response = await fetch(`https://aerodatabox.p.rapidapi.com/airports/icao/${icao}`, {
    headers: {
      'X-RapidAPI-Key': process.env.AERODATABOX_KEY,
      'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
    }
  });
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    if (response.status === 403) {
      message = 'Acesso negado: verifique sua chave API e limites do plano.';
    }
    throw new Error(message);
  }
  return await response.json();
}

async function runTests() {
  assert.doesNotThrow(() => gerarPDF());

  process.env.AERODATABOX_KEY = 'key';
  let recordedOptions;
  global.fetch = (url, options) => {
    recordedOptions = options;
    return Promise.resolve({ ok: true, json: async () => ({ name: 'Test', location: { city: 'City' } }) });
  };
  const data = await fetchAirportInfo('SBBR');
  assert.strictEqual(data.name, 'Test');
  assert.strictEqual(recordedOptions.headers['X-RapidAPI-Key'], 'key');

  global.fetch = (url, options) => Promise.resolve({ ok: false, status: 403 });
  await assert.rejects(() => fetchAirportInfo('SBBR'), /Acesso negado/);

  console.log('All tests passed');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
