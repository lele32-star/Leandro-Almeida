const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

function buildFilters() {
  return {
    showComissao: document.getElementById('showComissao')?.checked ?? true
  };
}

function buildState() {
  const area = document.getElementById('comissaoArea');
  const comissaoAtiva = area && area.style.display !== 'none';
  let comissaoPercent = parseFloat(document.getElementById('comissao')?.value) || 0;
  comissaoPercent = Math.min(Math.max(comissaoPercent, 0), 100);
  return { comissaoPercent, comissaoAtiva };
}

function calcularTotais({ km, valorKm, valorExtra = 0, tipoExtra = 'soma', comissaoPercent = 0 }) {
  const parcial = km * valorKm;
  let comissaoValor = 0;
  if (comissaoPercent > 0) {
    if (tipoExtra === 'subtrai') {
      comissaoValor = (parcial - valorExtra) * (comissaoPercent / 100);
    } else {
      comissaoValor = parcial * (comissaoPercent / 100);
    }
  }
  let total = tipoExtra === 'subtrai' ? parcial - valorExtra : parcial + valorExtra;
  total += comissaoValor;
  return { parcial, comissaoValor, total };
}

function gerarPreOrcamento() {
  const aeronave = document.getElementById("aeronave").value;
  const nm = parseFloat(document.getElementById("nm").value);
  const origem = document.getElementById("origem").value;
  const destino = document.getElementById("destino").value;
  const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
  const tipoExtra = document.getElementById("tipoExtra").value;

  const km = nm * 1.852;
  const valorKm = valoresKm[aeronave];

  const cfg = buildFilters();
  const state = buildState();
  const { parcial, comissaoValor, total } = calcularTotais({
    km,
    valorKm,
    valorExtra,
    tipoExtra,
    comissaoPercent: state.comissaoAtiva ? state.comissaoPercent : 0
  });

  let labelExtra = "";
  if (valorExtra > 0) {
    if (tipoExtra === "soma") {
      labelExtra = `+ R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (outras despesas)`;
    } else {
      labelExtra = `- R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (desconto)`;
    }
  }

  const linhas = [
    `<h3>Pré-Orçamento</h3>`,
    `<p><strong>Origem:</strong> ${origem}</p>`,
    `<p><strong>Destino:</strong> ${destino}</p>`,
    `<p><strong>Aeronave:</strong> ${aeronave}</p>`,
    `<p><strong>Distância:</strong> ${nm} NM (${km.toFixed(1)} km)</p>`
  ];

  if (valorExtra > 0) {
    linhas.push(`<p><strong>Ajuste:</strong> ${labelExtra}</p>`);
  }
  if (cfg.showComissao && state.comissaoAtiva && state.comissaoPercent > 0) {
    linhas.push(`<p><strong>Comissão (${state.comissaoPercent}%):</strong> R$ ${comissaoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`);
  }
  linhas.push(`<p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`);

  document.getElementById("resultado").innerHTML = linhas.join("\n");
}

function buildDocDefinition(cfg, state) {
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

  const { parcial, comissaoValor, total } = calcularTotais({
    km,
    valorKm,
    valorExtra: incluirNoPDF ? valorExtra : 0,
    tipoExtra,
    comissaoPercent: state.comissaoAtiva ? state.comissaoPercent : 0
  });

  const conteudo = [
    { text: "Cotação de Voo Executivo", style: "header" },
    { text: `Origem: ${origem} → Destino: ${destino}`, margin: [0, 10, 0, 0] },
    { text: `Aeronave: ${aeronave}` },
    { text: `Data Ida: ${dataIda} | Data Volta: ${dataVolta}` }
  ];

  if (valorExtra > 0 && incluirNoPDF) {
    if (tipoExtra === 'soma') {
      conteudo.push({ text: `Outras Despesas: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] });
    } else {
      conteudo.push({ text: `Desconto: R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] });
    }
  }

  if (cfg.showComissao && state.comissaoAtiva && state.comissaoPercent > 0) {
    conteudo.push({ text: `Comissão (${state.comissaoPercent}%): R$ ${comissaoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin: [0, 10, 0, 0] });
  }

  conteudo.push({ text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, bold: true, margin: [0, 10, 0, 0] });

  if (observacoes) {
    conteudo.push({ text: `Observações: ${observacoes}`, margin: [0, 10, 0, 0] });
  }

  return {
    content: conteudo,
    styles: {
      header: {
        fontSize: 18,
        bold: true
      }
    }
  };
}

function gerarPDF() {
  const cfg = buildFilters();
  const state = buildState();
  const docDefinition = buildDocDefinition(cfg, state);
  const aeronave = document.getElementById("aeronave").value;
  const origem = document.getElementById("origem").value;
  const destino = document.getElementById("destino").value;
  const nomeArquivo = `Cotacao_${aeronave}_${origem}_${destino}.pdf`.replace(/\s+/g, "_");
  pdfMake.createPdf(docDefinition).open();
}

if (typeof document !== 'undefined') {
  document.getElementById('btnAddComissao').addEventListener('click', () => {
    document.getElementById('comissaoArea').style.display = 'block';
  });
}

if (typeof module !== 'undefined') {
  module.exports = { calcularTotais };
}
