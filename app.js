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
    showRota: document.getElementById("showRota").checked,
    showAeronave: document.getElementById("showAeronave").checked,
    showTarifa: document.getElementById("showTarifa").checked,
    showDistancia: document.getElementById("showDistancia").checked,
    showDatas: document.getElementById("showDatas").checked,
    showAjuste: document.getElementById("showAjuste").checked,
    showObservacoes: document.getElementById("showObservacoes").checked,
    showMapa: document.getElementById("showMapa").checked
  };
}

function buildState() {
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
  return {
    aeronave,
    nm,
    origem,
    destino,
    dataIda,
    dataVolta,
    observacoes,
    incluirNoPDF,
    valorExtra,
    tipoExtra,
    ...buildFilters()
  };
}

function gerarPreOrcamento(cfg) {
  cfg = cfg || buildState();
  const {
    aeronave,
    nm,
    origem,
    destino,
    dataIda,
    dataVolta,
    observacoes,
    valorExtra,
    tipoExtra
  } = cfg;
  const km = nm * 1.852;
  const valorKm = valoresKm[aeronave];
  let total = km * valorKm;
  let labelExtra = "";
  if (valorExtra > 0) {
    if (tipoExtra === "soma") {
      total += valorExtra;
      labelExtra = `+ R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (outras despesas)`;
    } else {
      total -= valorExtra;
      labelExtra = `- R$ ${valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (desconto)`;
    }
  }
  let html = `<h3>Pré-Orçamento</h3>`;
  if (cfg.showRota) {
    html += `<p><strong>Origem:</strong> ${origem}</p>`;
    html += `<p><strong>Destino:</strong> ${destino}</p>`;
  }
  if (cfg.showAeronave) {
    html += `<p><strong>Aeronave:</strong> ${aeronave}</p>`;
  }
  if (cfg.showDistancia) {
    html += `<p><strong>Distância:</strong> ${nm} NM (${km.toFixed(1)} km)</p>`;
  }
  if (cfg.showDatas) {
    html += `<p><strong>Datas:</strong> ${dataIda} - ${dataVolta}</p>`;
  }
  if (cfg.showAjuste && labelExtra) {
    html += `<p><strong>Ajuste:</strong> ${labelExtra}</p>`;
  }
  if (cfg.showObservacoes && observacoes) {
    html += `<p><strong>Observações:</strong> ${observacoes}</p>`;
  }
  if (cfg.showTarifa) {
    html += `<p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`;
  }
  if (cfg.showMapa) {
    html += `<div id="mapa">[Mapa não implementado]</div>`;
  }
  if (typeof document !== 'undefined') {
    document.getElementById("resultado").innerHTML = html;
  }
  return html;
}

function buildDocDefinition(cfg) {
  const {
    aeronave,
    nm,
    origem,
    destino,
    dataIda,
    dataVolta,
    observacoes,
    incluirNoPDF,
    valorExtra,
    tipoExtra
  } = cfg;
  const km = nm * 1.852;
  const valorKm = valoresKm[aeronave];
  let total = km * valorKm;
  let ajustes = null;
  if (cfg.showAjuste && valorExtra > 0 && incluirNoPDF) {
    const val = valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (tipoExtra === "soma") {
      total += valorExtra;
      ajustes = { text: `Outras Despesas: R$ ${val}`, margin: [0, 10, 0, 0] };
    } else {
      total -= valorExtra;
      ajustes = { text: `Desconto: R$ ${val}`, margin: [0, 10, 0, 0] };
    }
  }
  const content = [
    { text: "Cotação de Voo Executivo", style: "header" },
    cfg.showRota ? { text: `Rota: ${origem} → ${destino}`, margin: [0, 10, 0, 0] } : null,
    cfg.showAeronave ? { text: `Aeronave: ${aeronave}` } : null,
    cfg.showDatas ? { text: `Datas: ${dataIda} - ${dataVolta}` } : null,
    cfg.showDistancia ? { text: `Distância: ${nm} NM (${km.toFixed(1)} km)` } : null,
    ajustes,
    cfg.showTarifa ? {
      text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      bold: true,
      margin: [0, 10, 0, 0]
    } : null,
    (cfg.showObservacoes && observacoes) ? { text: `Observações: ${observacoes}`, margin: [0, 10, 0, 0] } : null,
    cfg.showMapa ? { text: 'Mapa: [não implementado]' } : null
  ].filter(Boolean);
  return {
    content,
    styles: {
      header: {
        fontSize: 18,
        bold: true
      }
    }
  };
}

function gerarPDF(cfg) {
  cfg = cfg || buildState();
  const docDefinition = buildDocDefinition(cfg);
  if (typeof pdfMake !== 'undefined' && pdfMake.createPdf) {
    pdfMake.createPdf(docDefinition).open();
  }
  return docDefinition;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildFilters,
    buildState,
    gerarPreOrcamento,
    gerarPDF,
    buildDocDefinition,
    valoresKm
  };
}
