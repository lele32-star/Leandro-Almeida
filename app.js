const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

const DEFAULT_PAGAMENTO = `INTER - 077\nAUTOCON SUPRIMENTOS DE INFORMATICA\nCNPJ: 36.326.772/0001-65\nAgência: 0001\nConta: 25691815-5`;

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

function initTarifaSync() {
  if (typeof document === "undefined") return;
  const sel = document.getElementById("aeronave");
  const tarifaInput = document.getElementById("tarifa");
  if (!sel || !tarifaInput) return;
  sel.addEventListener("change", () => {
    const v = valoresKm[sel.value];
    tarifaInput.value = v ? v.toFixed(2) : "";
  });
}

initTarifaSync();

function addStopField() {
  const container = document.getElementById("stops");
  if (!container) return;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "stop-input";
  container.appendChild(input);
}

function initStops() {
  if (typeof document === "undefined") return;
  const btn = document.getElementById("addStop");
  if (btn) btn.addEventListener("click", addStopField);
}

initStops();

function initMap() {
  if (typeof L === "undefined" || map) return;
  map = L.map("map", { preferCanvas: true }).setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    crossOrigin: true
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

function drawRouteOnMap(coords) {
  if (!map || !Array.isArray(coords) || coords.length < 2) return;
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  const points = coords.map(c => [c.lat, c.lon]);
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
    showPagamento: document.getElementById("showPagamento").checked,
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
  const stops = Array.from(document.querySelectorAll(".stop-input"))
    .map(i => i.value)
    .filter(Boolean);
  const dataIda = document.getElementById("dataIda").value;
  const dataVolta = document.getElementById("dataVolta").value;
  const observacoes = document.getElementById("observacoes").value;
  const pagamentoEl = document.getElementById("pagamento");
  const pagamento = pagamentoEl ? pagamentoEl.value : DEFAULT_PAGAMENTO;
  const valorExtra = parseFloat(document.getElementById("valorExtra").value) || 0;
  const tipoExtra = document.getElementById("tipoExtra").value;
  const tarifaEl = document.getElementById("tarifa");
  const rawTarifa = tarifaEl ? tarifaEl.value.replace(',', '.') : '';
  const tarifaNum = parseFloat(rawTarifa);
  const valorKm = !isNaN(tarifaNum) ? tarifaNum : valoresKm[aeronave];
  if (tarifaEl) tarifaEl.value = valorKm ? valorKm.toFixed(2) : "";
  return {
    aeronave,
    nm,
    km,
    origem,
    destino,
    dataIda,
    dataVolta,
    observacoes,
    pagamento,
    valorExtra,
    tipoExtra,
    valorKm,
    stops,
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
    stops,
    dataIda,
    dataVolta,
    observacoes,
    pagamento,
    valorExtra,
    tipoExtra,
    valorKm
  } = cfg;

  const waypoints = [origem, destino, ...(stops || [])].filter(Boolean);
  let coords = [];
  if ((isNaN(nm) && isNaN(km)) && waypoints.length >= 2) {
    km = 0;
    for (const code of waypoints) {
      const c = await getCoordinates(code);
      coords.push(c);
      if (coords.length > 1) {
        km += distanciaKm(coords[coords.length - 2], c);
      }
    }
    nm = km / 1.852;
  } else {
    for (const code of waypoints) {
      try {
        const c = await getCoordinates(code);
        coords.push(c);
      } catch (e) {
        console.error(e);
      }
    }
    if ((isNaN(nm) || !nm) && !isNaN(km)) {
      nm = km / 1.852;
    } else {
      km = nm * 1.852;
    }
  }

  if (typeof document !== 'undefined') {
    const nmEl = document.getElementById("nm");
    const kmEl = document.getElementById("km");
    if (nmEl) nmEl.value = nm ? nm.toFixed(1) : "";
    if (kmEl) kmEl.value = km ? km.toFixed(1) : "";
  }

  const tarifa = !isNaN(valorKm) ? valorKm : valoresKm[aeronave];
  let total = km * tarifa;
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
    html += `<p><strong>Rota:</strong> ${waypoints.join(' → ')}</p>`;
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
  if (cfg.showPagamento && pagamento) {
    html += `<p><strong>Dados de pagamento:</strong><br>${pagamento.replace(/\n/g, '<br>')}</p>`;
  }
  if (cfg.showTarifa) {
    html += `<p><strong>Tarifa por km:</strong> R$ ${tarifa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`;
  }
  html += `<p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`;
  if (cfg.showMapa) {
    html += `<div id="mapa"></div>`;
  }
  if (typeof document !== 'undefined') {
    document.getElementById("resultado").innerHTML = html;
    if (cfg.showMapa && coords.length >= 2) {
      initMap();
      drawRouteOnMap(coords);
    }
  }
  return html;
}

function buildDocDefinition(cfg, mapDataUrl) {
  const {
    aeronave,
    nm,
    km: kmInput,
    origem,
    destino,
    stops = [],
    dataIda,
    dataVolta,
    observacoes,
    pagamento,
    valorExtra,
    tipoExtra,
    valorKm
  } = cfg;
  const km = !isNaN(kmInput) ? kmInput : nm * 1.852;
  const tarifa = !isNaN(valorKm) ? valorKm : valoresKm[aeronave];
  let total = km * tarifa;
  let ajustes = null;
  if (cfg.showAjuste && valorExtra > 0) {
    const val = valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    if (tipoExtra === "soma") {
      total += valorExtra;
      ajustes = { text: `Outras Despesas: R$ ${val}`, margin: [0, 10, 0, 0] };
    } else {
      total -= valorExtra;
      ajustes = { text: `Desconto: R$ ${val}`, margin: [0, 10, 0, 0] };
    }
  }
  const rotaStr = [origem, destino, ...stops].filter(Boolean).join(' → ');
  const content = [
    { text: "Cotação de Voo Executivo", style: "header" },
    cfg.showRota ? { text: `Rota: ${rotaStr}`, margin: [0, 10, 0, 0] } : null,
    cfg.showAeronave ? { text: `Aeronave: ${aeronave}` } : null,
    cfg.showDatas ? { text: `Datas: ${dataIda} - ${dataVolta}` } : null,
    cfg.showDistancia ? { text: `Distância: ${nm} NM (${km.toFixed(1)} km)` } : null,
    ajustes,
    cfg.showTarifa ? { text: `Tarifa por km: R$ ${tarifa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` } : null,
    (cfg.showObservacoes && observacoes) ? { text: `Observações: ${observacoes}`, margin: [0, 10, 0, 0] } : null,
    (cfg.showPagamento && pagamento) ? { text: `Dados de pagamento:\n${pagamento}`, margin: [0, 10, 0, 0] } : null,
    { text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, bold: true, margin: [0, 10, 0, 0] },
    cfg.showMapa ? { text: 'Mapa:', margin: [0, 10, 0, 0] } : null,
    (cfg.showMapa && mapDataUrl) ? { image: mapDataUrl, width: 500, margin: [0, 5, 0, 0] } : null,
    (cfg.showMapa && !mapDataUrl) ? { text: '[mapa indisponível]' } : null
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

async function captureMapImage() {
  if (typeof html2canvas === 'undefined' || !map) return null;
  const el = document.getElementById('map');
  if (!el) return null;
  try {
    // give Leaflet a moment to render tiles and fit bounds
    await new Promise(r => setTimeout(r, 300));
    // reset map pane transform so overlays align during capture
    const pane = map.getPanes().mapPane;
    const prev = pane.style.transform;
    L.DomUtil.setTransform(pane, L.point(0, 0));
    const canvas = await html2canvas(el, {
      useCORS: true,
      backgroundColor: null
    });
    pane.style.transform = prev;
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

async function gerarPDF(cfg) {
  cfg = cfg || buildState();
  let mapDataUrl = null;
  if (cfg.showMapa) {
    const wp = [cfg.origem, cfg.destino, ...(cfg.stops || [])].filter(Boolean);
    if (wp.length >= 2) {
      const coords = await Promise.all(wp.map(getCoordinates));
      initMap();
      drawRouteOnMap(coords);
      try { map.invalidateSize(); } catch (e) {}
      mapDataUrl = await captureMapImage();
    }
  }
  const docDefinition = buildDocDefinition(cfg, mapDataUrl);
  if (typeof pdfMake !== 'undefined' && pdfMake.createPdf) {
    pdfMake.createPdf(docDefinition).open();
  }
  return docDefinition;
}

function limparCampos() {
  const ids = [
    "aeronave",
    "tarifa",
    "nm",
    "km",
    "origem",
    "destino",
    "dataIda",
    "dataVolta",
    "valorExtra",
    "observacoes",
    "pagamento"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const pagEl = document.getElementById("pagamento");
  if (pagEl) pagEl.value = DEFAULT_PAGAMENTO;
  const tipoExtra = document.getElementById("tipoExtra");
  if (tipoExtra) tipoExtra.value = "soma";
  [
    "showRota",
    "showAeronave",
    "showTarifa",
    "showDistancia",
    "showDatas",
    "showAjuste",
    "showObservacoes",
    "showPagamento",
    "showMapa"
  ].forEach(id => {
    const cb = document.getElementById(id);
    if (cb) cb.checked = true;
  });
  const stops = document.getElementById("stops");
  if (stops) stops.innerHTML = "";
  const res = document.getElementById("resultado");
  if (res) res.innerHTML = "";
  if (routeLayer) {
    try { routeLayer.remove(); } catch (e) {}
    routeLayer = null;
  }
  if (map) {
    try { map.setView([0, 0], 2); } catch (e) {}
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildFilters,
    buildState,
    gerarPreOrcamento,
    gerarPDF,
    limparCampos,
    buildDocDefinition,
    valoresKm
  };
}
