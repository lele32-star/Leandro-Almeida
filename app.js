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

/* ==== BEGIN PATCH: pre-orcamento resumo + validações + datas ==== */

function initDateGuards() {
  if (typeof document === 'undefined') return;
  const ida = document.getElementById('dataIda');
  const volta = document.getElementById('dataVolta');
  if (!ida || !volta) return;

  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);

  // valor e limite mínimo para hoje
  if (!ida.value) ida.value = isoToday;
  ida.min = isoToday;

  const syncVolta = () => {
    const min = ida.value || isoToday;
    volta.min = min;
    if (volta.value && volta.value < min) volta.value = min;
  };
  ida.addEventListener('change', syncVolta);
  syncVolta();
}

function fmtBRL(n) {
  try {
    return Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',');
  }
}

function renderResumo(state, { km, subtotal, total, labelExtra, detalhesComissao, commissionAmount }) {
  const rota = [state.origem, state.destino, ...(state.stops || [])]
    .filter(Boolean)
    .join(' → ');

  const linhas = [];
  linhas.push(`<p><strong>Rota:</strong> ${rota || '—'}</p>`);
  linhas.push(`<p><strong>Aeronave:</strong> ${state.aeronave || '—'} <span style="opacity:.8">(${fmtBRL(state.valorKm)}/km)</span></p>`);
  linhas.push(`<p><strong>Distância:</strong> ${Number(state.nm || 0)} NM (${km.toFixed(1)} km)</p>`);
  linhas.push(`<p><strong>Datas:</strong> ${state.dataIda || '—'}${state.dataVolta ? ' → ' + state.dataVolta : ''}</p>`);
  linhas.push(`<p><strong>Total Parcial (km×tarifa):</strong> ${fmtBRL(subtotal)}</p>`);
  if (state.valorExtra > 0) linhas.push(`<p><strong>Ajuste:</strong> ${labelExtra}</p>`);
  (detalhesComissao || []).forEach((c, i) => {
    linhas.push(`<p><strong>Comissão ${i + 1}:</strong> ${fmtBRL(c.calculado)}</p>`);
  });
  if (commissionAmount > 0) linhas.push(`<p><strong>Comissão:</strong> ${fmtBRL(commissionAmount)}</p>`);
  if (state.observacoes) linhas.push(`<p><strong>Observações:</strong> ${state.observacoes}</p>`);
  if (state.pagamento) linhas.push(`<p><strong>Pagamento:</strong><br><pre style="white-space:pre-wrap;margin:0">${state.pagamento}</pre></p>`);
  linhas.push(`<hr style="margin:12px 0;border:none;border-top:1px solid #eee" />`);
  linhas.push(`<p style="font-size:1.1rem"><strong>Total Estimado:</strong> ${fmtBRL(total)}</p>`);

  return `<h3>Pré-Orçamento</h3>${linhas.join('')}`;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDateGuards);
}

/* ==== END PATCH ==== */

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

  // ====== [ADD] ICAO uppercase + cálculo instantâneo de rota/distância ======
  const ICAO_RE = /^[A-Z]{4}$/;

  const enforceICAO = (el) => {
    if (!el) return;
    el.value = String(el.value || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
  };

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  async function fetchAirportByCode(code) {
    const icao = String(code || '').toUpperCase();
    if (!ICAO_RE.test(icao)) return null;
    try {
      const res = await fetch(`https://aerodatabox.p.rapidapi.com/airports/icao/${icao}`, {
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const loc = data && data.location;
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
        return { lat: Number(loc.lat), lng: Number(loc.lon) };
      }
      return null;
    } catch {
      return null;
    }
  }

  async function refreshRouteFromInputs() {
    const origemEl = document.getElementById('origem');
    const destinoEl = document.getElementById('destino');
    const stopEls = Array.from(document.querySelectorAll('.stop-input'));

    [origemEl, destinoEl, ...stopEls].forEach(enforceICAO);

    const origem = origemEl ? origemEl.value : '';
    const destino = destinoEl ? destinoEl.value : '';
    const stops  = stopEls.map(i => i.value).filter(Boolean);

    const codes = [origem, destino, ...stops].filter(Boolean);
    const valid = codes.filter(c => ICAO_RE.test(c));
    if (valid.length < 2) {
      // Não recalcular/limpar distância quando não houver 2 aeroportos válidos.
      // Apenas remover a rota do mapa (se existir) e sair.
      if (typeof L !== 'undefined' && routeLayer && typeof routeLayer.remove === 'function') {
        routeLayer.remove();
        routeLayer = null;
      }
      return;
    }

    const coords = await Promise.all(valid.map(fetchAirportByCode));
    const waypoints = coords.filter(Boolean);
    updateDistanceFromAirports(waypoints);
  }

  const debouncedRefresh = debounce(refreshRouteFromInputs, 400);

  const origemEl = document.getElementById('origem');
  const destinoEl = document.getElementById('destino');
  if (origemEl) {
    origemEl.addEventListener('input', (e) => { enforceICAO(e.target); debouncedRefresh(); });
    origemEl.addEventListener('blur', (e) => enforceICAO(e.target));
  }
  if (destinoEl) {
    destinoEl.addEventListener('input', (e) => { enforceICAO(e.target); debouncedRefresh(); });
    destinoEl.addEventListener('blur', (e) => enforceICAO(e.target));
  }

  const stopsContainer = document.getElementById('stops');
  if (stopsContainer) {
    stopsContainer.addEventListener('input', (e) => {
      if (e.target && e.target.classList.contains('stop-input')) {
        enforceICAO(e.target);
        debouncedRefresh();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => debouncedRefresh());

  window.__refreshRouteNow = refreshRouteFromInputs;
  // ====== [FIM ADD] ==========================================================

  const addStop = document.getElementById('addStop');
  if (addStop) {
    addStop.addEventListener('click', () => {
      const div = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'stop-input icao';
      input.placeholder = 'Aeroporto (ICAO)';
      input.maxLength = 4;
      div.appendChild(input);
      document.getElementById('stops').appendChild(div);

      if (typeof enforceICAO === 'function') enforceICAO(input);
      if (typeof __refreshRouteNow === 'function') setTimeout(__refreshRouteNow, 0);

      input.addEventListener('input', (e) => {
        if (typeof enforceICAO === 'function') enforceICAO(e.target);
        if (typeof __refreshRouteNow === 'function') __refreshRouteNow();
      });
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
    // Apenas remova a rota do mapa; mantenha os valores que o usuário digitou.
    if (routeLayer && typeof routeLayer.remove === 'function') routeLayer.remove();
    routeLayer = null;
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

function calcularComissao(subtotal, _valorExtra, _tipoExtra, commissions) {
  const base = subtotal; // km × tarifa
  let totalComissao = 0;
  const detalhesComissao = [];
  for (const perc of commissions || []) {
    const val = base * (perc / 100);
    totalComissao += val;
    detalhesComissao.push({ percent: perc, calculado: val });
  }
  return { totalComissao, detalhesComissao };
}

/* === BEGIN PATCH: helper de comissão === */
function obterComissao(km, tarifa) {
  const base = Math.max(0, Number(km) * Number(tarifa));

  // Se o componente moderno existir, use-o como fonte da verdade
  if (typeof window !== 'undefined' && window.CommissionModule) {
    const res = window.CommissionModule.calculate({ km, tarifa });
    const amount = Number(res && res.amount) || 0;
    return amount;
  }

  // Fallback DOM (se o componente não estiver disponível)
  if (typeof document !== 'undefined') {
    const btn = document.getElementById('btnAddCommission');
    const enabled = btn && btn.getAttribute('aria-pressed') === 'true';
    const percentEl = document.getElementById('commissionPercent');
    const percentRaw = percentEl ? String(percentEl.value).replace(',', '.') : '0';
    const percent = Number(percentRaw);

    if (!enabled || !Number.isFinite(percent) || percent <= 0) return 0;

    const amount = base * (percent / 100);

    // Mantém sincronizado com o hidden/preview (compat)
    const hidden = document.getElementById('commissionAmount');
    if (hidden) hidden.value = String(Number(amount.toFixed(2)));
    const preview = document.getElementById('commissionPreview');
    if (preview && typeof Intl !== 'undefined') {
      preview.textContent = 'Comissão: ' + Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    return amount;
  }

  return 0;
}
/* === END PATCH: helper de comissão === */

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
/* === BEGIN PATCH: COMISSAO (buildDocDefinition) === */
  const commissionAmount = obterComissao(km, state.valorKm);
/* === END PATCH: COMISSAO (buildDocDefinition) === */
  const total = totalSemComissao + totalComissao + commissionAmount;
  // === BEGIN PDF DESIGN ===
  // Cabeçalho com logo e informações de contato
  const header = {
    columns: [
      { width: 60, text: '' }, // LOGO_PLACEHOLDER
      [
        { text: '[NOME_EMPRESA]', style: 'h1' },
        { text: '[SLOGAN_CURTO]', style: 'muted' },
        { text: '[WHATSAPP_LINK] | [EMAIL_CONTATO] | [CNPJ_OPCIONAL]', style: 'muted' }
      ]
    ],
    columnGap: 10,
    margin: [40, 20, 40, 20]
  };

  const content = [];
  content.push({ text: 'Cotação de Voo Executivo', style: 'h1', margin: [0, 0, 0, 20] });

  // Resumo do voo em duas colunas (tabela sem bordas)
  const resumoCol1 = [];
  const resumoCol2 = [];
  if (state.showRota) {
    const codes = [state.origem, state.destino, ...(state.stops || [])];
    resumoCol1.push(`Rota: ${codes.filter(Boolean).join(' → ')}`);
  }
  if (state.showAeronave) resumoCol1.push(`Aeronave: ${state.aeronave}`);
  if (state.showDatas) resumoCol1.push(`Datas: ${state.dataIda} - ${state.dataVolta}`);
  if (state.showDistancia) resumoCol2.push(`Distância: ${state.nm} NM (${km.toFixed(1)} km)`);
  if (state.showTarifa) resumoCol2.push(`Tarifa por km: R$ ${state.valorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  const leftSummary = resumoCol1.join('\n');
  const rightSummary = resumoCol2.join('\n');
  if (leftSummary || rightSummary) {
    content.push({
      table: {
        widths: ['*', '*'],
        body: [[{ text: leftSummary }, { text: rightSummary, alignment: 'right' }]]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 20]
    });
  }

  // Investimento (tabela com listras)
  const investBody = [
    [
      { text: 'Item', style: 'tableHeader' },
      { text: 'Valor', style: 'tableHeader', alignment: 'right' }
    ],
    [
      { text: 'Total parcial:' },
      { text: `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }
    ]
  ];

  if (state.showAjuste && state.valorExtra > 0) {
    const label = state.tipoExtra === 'soma' ? 'Outras Despesas' : 'Desconto';
    investBody.push([
      { text: `${label}:` },
      { text: `R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }
    ]);
  }

  if (state.showComissao) {
    detalhesComissao.forEach((c, idx) => {
      investBody.push([
        { text: `Comissão ${idx + 1}:` },
        { text: `R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }
      ]);
    });
    if (commissionAmount > 0) {
      investBody.push([
        { text: 'Comissão:' },
        { text: `R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }
      ]);
    }
  }

  investBody.push([
    { text: 'Total Final:', style: 'tableHeader' },
    { text: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'priceBig', alignment: 'right' }
  ]);

  content.push({
    table: { widths: ['*', 'auto'], body: investBody },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 20]
  });

  // Observações e Pagamento
  if (state.showObservacoes && state.observacoes) {
    content.push({ text: 'Observações:', style: 'h2' });
    content.push({ text: state.observacoes, margin: [0, 0, 0, 10] });
  }
  if (state.showPagamento && state.pagamento) {
    content.push({ text: 'Dados de pagamento:', style: 'h2' });
    content.push({ text: state.pagamento, margin: [0, 0, 0, 10] });
  }

  // Storytelling, Prazos & Garantias, FAQs
  content.push({ text: 'Por que voar conosco?', style: 'h2' });
  content.push({ text: 'Oferecemos uma experiência única em aviação executiva, alinhando conforto, segurança e agilidade.', margin: [0, 0, 0, 10] });
  content.push({ text: 'Prazos & Garantias', style: 'h2' });
  content.push({ ul: ['Confirmação imediata', 'Flexibilidade de horários', 'Suporte 24h'], margin: [0, 0, 0, 10] });
  content.push({ text: 'FAQs', style: 'h2' });
  content.push({
    ol: [
      'Como é calculado o valor? Baseado na distância em km multiplicada pela tarifa da aeronave.',
      'Posso alterar a rota após confirmar? Sim, sujeito à disponibilidade.',
      'Qual o prazo de validade desta cotação? 5 dias corridos.'
    ]
  });

  if (state.showMapa) {
    content.push({ text: 'Mapa:', style: 'h2', pageBreak: 'before' });
  }

  return {
    header,
    content,
    styles: {
      h1: { fontSize: 20, bold: true },
      h2: { fontSize: 14, bold: true, margin: [0, 10, 0, 4] },
      muted: { color: '#666', fontSize: 9 },
      tableHeader: { fillColor: '#f0f0f0', bold: true },
      priceBig: { fontSize: 16, bold: true }
    },
    defaultStyle: { fontSize: 10, lineHeight: 1.25 },
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'center',
      margin: [0, 0, 0, 20],
      style: 'muted'
    }),
    info: { title: 'Cotação de Voo Executivo', author: '[NOME_EMPRESA]' }
  };
  // === END PDF DESIGN ===
}

/* ==== BEGIN PATCH: função gerarPreOrcamento (resumo completo + validações) ==== */
async function gerarPreOrcamento() {
  // Atualiza rota/distância se o usuário preencheu ICAOs
  if (typeof __refreshRouteNow === 'function') { await __refreshRouteNow(); }

  const state = buildState();

  // Validações mínimas (evita NaN e "nada acontece")
  const distanciaValida = Number.isFinite(state.nm) && state.nm > 0;
  const valorKmValido = Number.isFinite(state.valorKm) && state.valorKm > 0;
  const saida = document.getElementById('resultado');

  if (!valorKmValido) {
    saida.innerHTML = `<div style="padding:12px;border:1px solid #f1c40f;background:#fffbe6;border-radius:6px">
      Selecione uma aeronave ou informe a <strong>tarifa por km</strong>.
    </div>`;
    return;
  }
  if (!distanciaValida) {
    saida.innerHTML = `<div style="padding:12px;border:1px solid #f1c40f;background:#fffbe6;border-radius:6px">
      Informe a <strong>distância</strong> (NM ou KM) ou preencha os aeroportos para calcular automaticamente.
    </div>`;
    return;
  }

  const km = state.nm * 1.852;
  const subtotal = valorParcialFn(km, state.valorKm);

  // Ajuste (soma/subtrai)
  let total = valorTotalFn(
    km,
    state.valorKm,
    state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra
  );
  let labelExtra = '';
  if (state.valorExtra > 0) {
    labelExtra = `${state.tipoExtra === 'soma' ? '+' : '-'} ${fmtBRL(state.valorExtra)}`;
  }

  // Comissão: percentuais (se houver) + componente (#commissionAmount)
  const { totalComissao, detalhesComissao } = calcularComissao(
    subtotal,
    state.valorExtra,
    state.tipoExtra,
    state.commissions || []
  );

/* === BEGIN PATCH: COMISSAO (gerarPreOrcamento) === */
  const commissionAmount = obterComissao(km, state.valorKm);
/* === END PATCH: COMISSAO (gerarPreOrcamento) === */

  total += totalComissao + commissionAmount;

  // Render do resumo completo
  const html = renderResumo(state, { km, subtotal, total, labelExtra, detalhesComissao, commissionAmount });
  saida.innerHTML = html;
  saida.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/* ==== END PATCH ==== */

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
    const panel = commissionComp.querySelector('#commissionPanel');
    const percent = commissionComp.querySelector('#commissionPercent');
    const preview = commissionComp.querySelector('#commissionPreview');
    const amountHidden = commissionComp.querySelector('#commissionAmount');
    panel.hidden = true;
    if (btnAdd) {
      btnAdd.setAttribute('aria-pressed', 'false');
      btnAdd.textContent = 'Adicionar comissão';
    }
    if (percent) percent.value = '5';
    if (preview) preview.textContent = 'Comissão: R$ 0,00';
    if (amountHidden) amountHidden.value = '0';
  }
  const pdfCommission = document.getElementById('pdfCommissionToggle');
  if (pdfCommission) {
    pdfCommission.checked = true;
    pdfCommission.dispatchEvent(new Event('change'));
  }
}

if (typeof window !== 'undefined') {
  window.buildState = buildState;
  window.buildDocDefinition = buildDocDefinition;
  window.gerarPreOrcamento = gerarPreOrcamento;
  window.gerarPDF = gerarPDF;
  window.limparCampos = limparCampos;
  // Aliases para garantir que os botões chamem SEMPRE a versão do app.js
  window.appGerarPreOrcamento = gerarPreOrcamento;
  window.appGerarPDF = gerarPDF;
}

if (typeof module !== 'undefined') {
  module.exports = { buildState, buildDocDefinition, gerarPDF, calcularComissao };
}
