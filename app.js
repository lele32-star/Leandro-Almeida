const valoresKm = {
  "Hawker 400": 36,
  "Phenom 100": 36,
  "Citation II": 36,
  "King Air C90": 30,
  "Sêneca IV": 22,
  "Cirrus SR22": 15
};

let valorParcialFn = (distanciaKm, valorKm) => distanciaKm * valorKm;
let valorTotalFn = (distanciaKm, valorKm, valorExtra = 0) =>
  valorParcialFn(distanciaKm, valorKm) + valorExtra;

try {
  if (typeof require === 'function') {
    const calc = require('./cotacao');
    valorParcialFn = calc.valorParcial;
    valorTotalFn = calc.valorTotal;
  }
} catch (err) {
  /* ignore missing module in browser */
}

if (typeof window !== 'undefined') {
  if (typeof window.valorParcial === 'function') valorParcialFn = window.valorParcial;
  if (typeof window.valorTotal === 'function') valorTotalFn = window.valorTotal;
}

const API_KEY = (typeof process !== 'undefined' && process.env && process.env.AERODATABOX_KEY)
  ? process.env.AERODATABOX_KEY
  : '84765bd38cmsh03b2568c9aa4a0fp1867f6jsnd28a64117f8b';

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

  function addCommissionEntry() {
    const div = document.createElement('div');
    div.className = 'commission-entry';
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'commission-percent';
    input.placeholder = 'Percentual (%)';
    div.appendChild(input);
    document.getElementById('comissoes').appendChild(div);
  }

  const comissaoBtn = document.getElementById('comissaoBtn');
  const comissaoConfig = document.getElementById('comissaoConfig');
  if (comissaoBtn && comissaoConfig) {
    comissaoBtn.addEventListener('click', () => {
      comissaoConfig.style.display = comissaoConfig.style.display === 'none' ? 'block' : 'none';
      if (comissaoConfig.style.display !== 'none' && document.querySelectorAll('.commission-entry').length === 0) {
        addCommissionEntry();
      }
    });
  }

  const addCommission = document.getElementById('addCommission');
  if (addCommission) {
    addCommission.addEventListener('click', addCommissionEntry);
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

function calcularComissao(subtotal, valorExtra, tipoExtra, commissions) {
  let base = subtotal;
  if (valorExtra > 0 && tipoExtra === 'subtrai') {
    base -= valorExtra;
  }
  let totalComissao = 0;
  const detalhesComissao = [];
  for (const perc of commissions || []) {
    const val = base * (perc / 100);
    totalComissao += val;
    detalhesComissao.push({ percent: perc, calculado: val });
  }
  return { totalComissao, detalhesComissao };
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
  const commissions = Array.from(document.querySelectorAll('.commission-percent')).map(input => parseFloat(input.value) || 0);
  const commissionAmountEl = document.getElementById('commissionAmount');
  const commissionShowEl = document.getElementById('commissionShowInPdf');
  const showComissao = commissionShowEl ? commissionShowEl.value !== '0' : true;
  const commissionAmount = commissionAmountEl ? parseFloat(commissionAmountEl.value) || 0 : 0;

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
    commissions,
    commissionAmount,
    showRota: document.getElementById('showRota').checked,
    showAeronave: document.getElementById('showAeronave').checked,
    showTarifa: document.getElementById('showTarifa').checked,
    showDistancia: document.getElementById('showDistancia').checked,
    showDatas: document.getElementById('showDatas').checked,
    showAjuste: document.getElementById('showAjuste').checked,
    showComissao,
    showObservacoes: document.getElementById('showObservacoes').checked,
    showPagamento: document.getElementById('showPagamento').checked,
    showMapa: document.getElementById('showMapa').checked
  };
}

function buildDocDefinition(state) {
  const km = state.nm * 1.852;
  const subtotal = valorParcialFn(km, state.valorKm);
  const totalSemComissao = valorTotalFn(
    km,
    state.valorKm,
    state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra
  );
  const { totalComissao, detalhesComissao } = calcularComissao(
    subtotal,
    state.valorExtra,
    state.tipoExtra,
    state.commissions || []
  );
  let commissionAmount = state.commissionAmount || 0;
  if (typeof document !== 'undefined') {
    const comp = document.getElementById('commission-component');
    if (comp && typeof comp.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      const base = subtotal - (state.valorExtra > 0 && state.tipoExtra === 'subtrai' ? state.valorExtra : 0);
      comp.dispatchEvent(new CustomEvent('commission:base', { detail: base }));
      const amtEl = document.getElementById('commissionAmount');
      if (amtEl) commissionAmount = parseFloat(amtEl.value) || 0;
    }
  }
  const total = totalSemComissao + totalComissao + commissionAmount;

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

  if (state.showComissao) {
    detalhesComissao.forEach((c, idx) => {
      content.push({ text: `Comissão ${idx + 1}: R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
    });
    if (commissionAmount > 0) {
      content.push({ text: `Comissão: R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
    }
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
  const subtotal = valorParcialFn(km, state.valorKm);
  let total = valorTotalFn(
    km,
    state.valorKm,
    state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra
  );
  let labelExtra = '';
  if (state.valorExtra > 0) {
    labelExtra = `${state.tipoExtra === 'soma' ? '+' : '-'} R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  const { totalComissao, detalhesComissao } = calcularComissao(
    subtotal,
    state.valorExtra,
    state.tipoExtra,
    state.commissions || []
  );
  let commissionAmount = state.commissionAmount || 0;
  if (typeof document !== 'undefined') {
    const comp = document.getElementById('commission-component');
    if (comp && typeof comp.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      const base = subtotal - (state.valorExtra > 0 && state.tipoExtra === 'subtrai' ? state.valorExtra : 0);
      comp.dispatchEvent(new CustomEvent('commission:base', { detail: base }));
      const amtEl = document.getElementById('commissionAmount');
      if (amtEl) commissionAmount = parseFloat(amtEl.value) || 0;
    }
  }
  total += totalComissao + commissionAmount;
  let comissoesHtml = detalhesComissao.map((c, i) => `<p><strong>Comissão ${i + 1}:</strong> R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`).join('');
  if (commissionAmount > 0) {
    comissoesHtml += `<p><strong>Comissão:</strong> R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>`;
  }
  const resultado = document.getElementById('resultado');
  resultado.innerHTML = `
    <h3>Pré-Orçamento</h3>
    <p><strong>Origem:</strong> ${state.origem}</p>
    <p><strong>Destino:</strong> ${state.destino}</p>
    <p><strong>Aeronave:</strong> ${state.aeronave}</p>
    <p><strong>Distância:</strong> ${state.nm} NM (${km.toFixed(1)} km)</p>
    ${state.valorExtra > 0 ? `<p><strong>Ajuste:</strong> ${labelExtra}</p>` : ''}
    ${comissoesHtml}
    <p><strong>Total Estimado:</strong> R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
  `;
}

async function gerarPDF(state) {
  const s = state || buildState();
  let waypoints = [];
  if (s.showMapa) {
    const codes = [s.origem, s.destino, ...(s.stops || [])];
    for (const code of codes) {
      const res = await fetch(`https://aerodatabox.p.rapidapi.com/airports/icao/${code}`, {
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        }
      });
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
  const comissoesDiv = document.getElementById('comissoes');
  if (comissoesDiv) comissoesDiv.innerHTML = '';
  const comissaoConfig = document.getElementById('comissaoConfig');
  if (comissaoConfig) comissaoConfig.style.display = 'none';
  const commissionComp = document.getElementById('commission-component');
  if (commissionComp) {
    const btnAdd = commissionComp.querySelector('#btnAddCommission');
    const btnPdf = commissionComp.querySelector('#btnCommissionPdf');
    const panel = commissionComp.querySelector('#commissionPanel');
    const percent = commissionComp.querySelector('#commissionPercent');
    const preview = commissionComp.querySelector('#commissionPreview');
    const amountHidden = commissionComp.querySelector('#commissionAmount');
    const showHidden = commissionComp.querySelector('#commissionShowInPdf');
    panel.hidden = true;
    if (btnAdd) {
      btnAdd.setAttribute('aria-pressed', 'false');
      btnAdd.textContent = 'Adicionar comissão';
    }
    if (btnPdf) {
      btnPdf.setAttribute('aria-pressed', 'true');
      btnPdf.textContent = 'Comissão no PDF: Ativar';
    }
    if (percent) percent.value = '5';
    if (preview) preview.textContent = 'Comissão: R$ 0,00';
    if (amountHidden) amountHidden.value = '0';
    if (showHidden) showHidden.value = '1';
  }
}

if (typeof window !== 'undefined') {
  window.buildState = buildState;
  window.buildDocDefinition = buildDocDefinition;
  window.gerarPreOrcamento = gerarPreOrcamento;
  window.gerarPDF = gerarPDF;
  window.limparCampos = limparCampos;
}

if (typeof module !== 'undefined') {
  module.exports = { buildState, buildDocDefinition, gerarPDF, calcularComissao };
}
