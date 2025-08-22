const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

let map;
let routeLayer = null;

if (typeof document !== 'undefined') {
  const nmInput = document.getElementById('nm');
  const kmInput = document.getElementById('km');
  if (nmInput && kmInput) {
    nmInput.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      kmInput.value = Number.isFinite(val) ? (val * 1.852).toFixed(1) : '';
    });
    kmInput.addEventListener('input', e => {
      const val = parseFloat(e.target.value);
      nmInput.value = Number.isFinite(val) ? (val / 1.852).toFixed(1) : '';
    });
  }

  const aeronaveSel = document.getElementById('aeronave');
  const tarifaInput = document.getElementById('tarifa');
  if (aeronaveSel && tarifaInput) {
    aeronaveSel.addEventListener('change', () => {
      tarifaInput.value = valoresKm[aeronaveSel.value] || '';
    });
  }

  const addStop = document.getElementById('addStop');
  if (addStop) {
    addStop.addEventListener('click', () => {
      const div = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'stop-input';
      input.placeholder = 'Aeroporto';
      div.appendChild(input);
      document.getElementById('stops').appendChild(div);
    });
  }

  if (typeof L !== 'undefined' && document.getElementById('map')) {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
  }
}

function haversine(a, b) {
  const R = 6371; // km
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function updateDistanceFromAirports(waypoints) {
  const nmInput = typeof document !== 'undefined' ? document.getElementById('nm') : null;
  const kmInput = typeof document !== 'undefined' ? document.getElementById('km') : null;
  const points = (waypoints || []).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

  if (points.length < 2) {
    if (routeLayer && typeof routeLayer.remove === 'function') routeLayer.remove();
    routeLayer = null;
    if (nmInput) nmInput.value = '';
    if (kmInput) kmInput.value = '';
    return;
  }

  let kmTotal = 0;
  for (let i = 1; i < points.length; i++) {
    kmTotal += haversine(points[i - 1], points[i]);
  }
  const nmTotal = kmTotal / 1.852;

  if (nmInput) nmInput.value = nmTotal.toFixed(1);
  if (kmInput) kmInput.value = kmTotal.toFixed(1);

  if (typeof L !== 'undefined' && map) {
    if (routeLayer) routeLayer.remove();
    routeLayer = L.polyline(points.map(p => [p.lat, p.lng]), { color: 'blue' }).addTo(map);
    map.fitBounds(routeLayer.getBounds());
  }
}

function buildState() {
  const aeronave = document.getElementById('aeronave').value;
  const nmField = document.getElementById('nm');
  const kmField = document.getElementById('km');
  let nm = parseFloat(nmField.value);
  const kmVal = parseFloat(kmField.value);
  if (!Number.isFinite(nm) && Number.isFinite(kmVal)) {
    nm = kmVal / 1.852;
  }
  const origem = document.getElementById('origem').value;
  const destino = document.getElementById('destino').value;
  const dataIda = document.getElementById('dataIda').value;
  const dataVolta = document.getElementById('dataVolta').value;
  const observacoes = document.getElementById('observacoes').value;
  const pagamentoEl = document.getElementById('pagamento');
  const pagamento = pagamentoEl ? pagamentoEl.value : '';
  const valorExtra = parseFloat(document.getElementById('valorExtra').value) || 0;
  const tipoExtra = document.getElementById('tipoExtra').value;
  const tarifaVal = parseFloat(document.getElementById('tarifa').value);
  const valorKm = Number.isFinite(tarifaVal) ? tarifaVal : valoresKm[aeronave];
  const stops = Array.from(document.querySelectorAll('.stop-input')).map(i => i.value).filter(Boolean);

  return {
    aeronave,
    nm,
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
    showRota: document.getElementById('showRota').checked,
    showAeronave: document.getElementById('showAeronave').checked,
    showTarifa: document.getElementById('showTarifa').checked,
    showDistancia: document.getElementById('showDistancia').checked,
    showDatas: document.getElementById('showDatas').checked,
    showAjuste: document.getElementById('showAjuste').checked,
    showObservacoes: document.getElementById('showObservacoes').checked,
    showPagamento: document.getElementById('showPagamento').checked,
    showMapa: document.getElementById('showMapa').checked
  };
}

function buildDocDefinition(state) {
  const km = state.nm * 1.852;
  const subtotal = km * state.valorKm;
  let total = subtotal;
  if (state.valorExtra > 0) {
    if (state.tipoExtra === 'soma') total += state.valorExtra; else total -= state.valorExtra;
  }

  const content = [{ text: 'Cotação de Voo Executivo', style: 'header' }];

  if (state.showRota) {
    const codes = [state.origem, state.destino, ...(state.stops || [])];
    content.push({ text: `Rota: ${codes.filter(Boolean).join(' → ')}` });
  }
  if (state.showAeronave) {
    content.push({ text: `Aeronave: ${state.aeronave}` });
  }
  if (state.showTarifa) {
    content.push({ text: `Tarifa por km: R$ ${state.valorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
  }
  if (state.showDistancia) {
    content.push({ text: `Distância: ${state.nm} NM (${km.toFixed(1)} km)` });
  }
  if (state.showDatas) {
    content.push({ text: `Datas: ${state.dataIda} - ${state.dataVolta}` });
  }

  content.push({ text: `Total parcial: R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });

  if (state.showAjuste && state.valorExtra > 0) {
    const label = state.tipoExtra === 'soma' ? 'Outras Despesas' : 'Desconto';
    content.push({ text: `${label}: R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
  }

  content.push({ text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });

  if (state.showObservacoes && state.observacoes) {
    content.push({ text: `Observações: ${state.observacoes}` });
  }
  if (state.showPagamento && state.pagamento) {
    content.push({ text: `Dados de pagamento: ${state.pagamento}` });
  }
  if (state.showMapa) {
    content.push({ text: 'Mapa:' });
  }

  return { content };
}

async function gerarPreOrcamento() {
  const state = buildState();
  const km = state.nm * 1.852;
  const subtotal = km * state.valorKm;
  let total = subtotal;
  let labelExtra = '';
  if (state.valorExtra > 0) {
    if (state.tipoExtra === 'soma') {
      total += state.valorExtra;
      labelExtra = `+ R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    } else {
      total -= state.valorExtra;
      labelExtra = `- R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
  }
  const resultado = document.getElementById('resultado');
  resultado.innerHTML = `
    <h3>Pré-Orçamento</h3>
    <p><strong>Origem:</strong> ${state.origem}</p>
    <p><strong>Destino:</strong> ${state.destino}</p>
    <p><strong>Aeronave:</strong> ${state.aeronave}</p>
    <p><strong>Distância:</strong> ${state.nm} NM (${km.toFixed(1)} km)</p>
    ${state.valorExtra > 0 ? `<p><strong>Ajuste:</strong> ${labelExtra}</p>` : ''}
    <p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
  `;
}

async function gerarPDF(state) {
  const s = state || buildState();
  let waypoints = [];
  if (s.showMapa) {
    const codes = [s.origem, s.destino, ...(s.stops || [])];
    for (const code of codes) {
      const res = await fetch(`https://aerodatabox.p.rapidapi.com/airports/icao/${code}`);
      const data = await res.json();
      if (data && data.location) waypoints.push({ lat: data.location.lat, lng: data.location.lon });
    }
    updateDistanceFromAirports(waypoints);
  }
  const docDefinition = buildDocDefinition(s);
  if (typeof pdfMake !== 'undefined') {
    pdfMake.createPdf(docDefinition).open();
  }
  return docDefinition;
}

function limparCampos() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('input, textarea').forEach(el => {
    if (el.type === 'checkbox') el.checked = false;
    else el.value = '';
  });
  document.getElementById('tarifa').value = '';
  document.getElementById('showRota').checked = true;
  document.getElementById('showAeronave').checked = true;
  document.getElementById('showTarifa').checked = true;
  document.getElementById('showDistancia').checked = true;
  document.getElementById('showDatas').checked = true;
  document.getElementById('showAjuste').checked = true;
  document.getElementById('showObservacoes').checked = true;
  document.getElementById('showPagamento').checked = true;
  document.getElementById('showMapa').checked = true;
  document.getElementById('resultado').innerHTML = '';
  if (routeLayer && routeLayer.remove) routeLayer.remove();
}

if (typeof window !== 'undefined') {
  window.buildState = buildState;
  window.buildDocDefinition = buildDocDefinition;
  window.gerarPreOrcamento = gerarPreOrcamento;
  window.gerarPDF = gerarPDF;
  window.limparCampos = limparCampos;
}

if (typeof module !== 'undefined') {
  module.exports = { buildState, buildDocDefinition, gerarPDF };
}
