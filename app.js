const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

const AERODATABOX_KEY = "84765bd38cmsh03b2568c9aa4a0fp1867f6jsnd28a64117f8b";
const AERODATABOX_HOST = "aerodatabox.p.rapidapi.com";
const coordCache = {};
let map;
let routeLayer;

function initDistanceSync() {
  if (typeof document === "undefined") return;
  const nmInput = document.getElementById("nm");
  const kmInput = document.getElementById("km");
  if (!nmInput || !kmInput) return;
  nmInput.addEventListener("input", () => {
    const v = parseFloat(nmInput.value);
    kmInput.value = !isNaN(v) ? (v * 1.852).toFixed(1) : "";
  });
  kmInput.addEventListener("input", () => {
    const v = parseFloat(kmInput.value);
    nmInput.value = !isNaN(v) ? (v / 1.852).toFixed(1) : "";
  });
}

initDistanceSync();

function initMap() {
  if (typeof L === "undefined" || map) return;
  map = L.map("map").setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

async function getCoordinates(icao) {
  const code = icao.toUpperCase();
  if (coordCache[code]) return coordCache[code];
  const resp = await fetch(`https://${AERODATABOX_HOST}/airports/icao/${code}`, {
    headers: {
      "X-RapidAPI-Key": AERODATABOX_KEY,
      "X-RapidAPI-Host": AERODATABOX_HOST
    }
  });
  if (!resp.ok) {
    throw new Error(`Falha ao buscar ${code}: ${resp.status}`);
  }
  const data = await resp.json();
  coordCache[code] = { lat: data.location.lat, lon: data.location.lon };
  return coordCache[code];
}

function toRad(v) { return v * Math.PI / 180; }
function distanciaKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function drawRouteOnMap(orig, dest) {
  if (!map || !orig || !dest) return;
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  const points = [[orig.lat, orig.lon], [dest.lat, dest.lon]];
  routeLayer = L.polyline(points, { color: "blue" }).addTo(map);
  map.fitBounds(routeLayer.getBounds(), { padding: [20, 20] });
}

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
  let nm = parseFloat(document.getElementById("nm").value);
  let km = parseFloat(document.getElementById("km").value);
  if (!isNaN(km) && (isNaN(nm) || nm === 0)) {
    nm = km / 1.852;
  } else if (!isNaN(nm) && (isNaN(km) || km === 0)) {
    km = nm * 1.852;
  }
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
    km,
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

async function gerarPreOrcamento(cfg) {
  cfg = cfg || buildState();
  let {
    aeronave,
    nm,
    km,
    origem,
    destino,
    dataIda,
    dataVolta,
    observacoes,
    valorExtra,
    tipoExtra
  } = cfg;

  let coordOrigem, coordDestino;
  if ((isNaN(nm) || !nm) && !isNaN(km)) {
    nm = km / 1.852;
  } else {
    km = nm * 1.852;
  }
  if ((!nm || isNaN(nm)) && origem && destino) {
    try {
      coordOrigem = await getCoordinates(origem);
      coordDestino = await getCoordinates(destino);
      km = distanciaKm(coordOrigem, coordDestino);
      nm = km / 1.852;
    } catch (e) {
      console.error(e);
    }
  } else {
    coordOrigem = origem ? await getCoordinates(origem) : null;
    coordDestino = destino ? await getCoordinates(destino) : null;
  }

  if (typeof document !== 'undefined') {
    const nmEl = document.getElementById("nm");
    const kmEl = document.getElementById("km");
    if (nmEl) nmEl.value = nm ? nm.toFixed(1) : "";
    if (kmEl) kmEl.value = km ? km.toFixed(1) : "";
  }

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
    html += `<p><strong>Distância:</strong> ${nm.toFixed(1)} NM (${km.toFixed(1)} km)</p>`;
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
    html += `<div id="mapa"></div>`;
  }
  if (typeof document !== 'undefined') {
    document.getElementById("resultado").innerHTML = html;
    if (cfg.showMapa) {
      initMap();
      drawRouteOnMap(coordOrigem, coordDestino);
    }
  }
  return html;
}

function buildDocDefinition(cfg) {
  const {
    aeronave,
    nm,
    km: kmInput,
    origem,
    destino,
    dataIda,
    dataVolta,
    observacoes,
    incluirNoPDF,
    valorExtra,
    tipoExtra
  } = cfg;
  const km = !isNaN(kmInput) ? kmInput : nm * 1.852;
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
