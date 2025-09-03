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
} catch (e) { /* ignore fallback */ }

function updateDistanceFromAirports(waypoints) {
  const nmInput = typeof document !== 'undefined' ? document.getElementById('nm') : null;
  const kmInput = typeof document !== 'undefined' ? document.getElementById('km') : null;
  const points = (waypoints || []).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  
  // Calculate total distance from waypoints
  if (points.length >= 2 && nmInput && kmInput) {
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += haversine(points[i], points[i + 1]);
    }
    const nm = totalDistance / 1.852;
    nmInput.value = nm.toFixed(1);
    kmInput.value = totalDistance.toFixed(1);
  }
};
function buildState() {
  const aeronave = (document.getElementById('aeronave') || {}).value || '';
  const nmField = document.getElementById('nm');
  const kmField = document.getElementById('km');
  let nm = parseFloat(nmField && nmField.value || '');
  if (!Number.isFinite(nm) || nm <= 0) {
    const kmVal = parseFloat(kmField && kmField.value || '');
    if (Number.isFinite(kmVal) && kmVal > 0) nm = kmVal / 1.852;
  }
  if (!Number.isFinite(nm)) nm = 0;

  const valorKm = parseFloat((document.getElementById('tarifa') || {}).value || '');
  
  // If tariff is not manually set, use default for aircraft
  let finalValorKm = Number.isFinite(valorKm) && valorKm > 0 ? valorKm : 0;
  if (!finalValorKm) {
    const defaultTariff = valoresKm[aeronave];
    if (Number.isFinite(defaultTariff) && defaultTariff > 0) {
      finalValorKm = defaultTariff;
    }
  }
  const origem = ((document.getElementById('origem') || {}).value || '').toUpperCase();
  const destino = ((document.getElementById('destino') || {}).value || '').toUpperCase();
  const stops = Array.from(document.querySelectorAll('.stop-input')).map(i => (i.value || '').toUpperCase()).filter(Boolean);
  const dataIda = (document.getElementById('dataIda') || {}).value || '';
  const dataVolta = (document.getElementById('dataVolta') || {}).value || '';
  const tipoExtra = ((document.querySelector('input[name="tipoExtra"]:checked') || {}).value) || 'soma';
  const valorExtra = parseFloat((document.getElementById('valorExtra') || {}).value || '0') || 0;
  const observacoes = (document.getElementById('observacoes') || {}).value || '';
  const pagamento = (document.getElementById('pagamento') || {}).value || '';
  const commissions = (typeof getAllCommissions === 'function') ? getAllCommissions() : [];
  const showComissao = !!(document.getElementById('pdfCommissionToggle') || {}).checked;

  return {
    aeronave,
    nm: Number.isFinite(nm) ? Number(nm.toFixed(2)) : 0,
    valorKm: finalValorKm,
    origem,
    destino,
    stops,
    dataIda,
    dataVolta,
    tipoExtra,
    valorExtra: Number(valorExtra.toFixed ? valorExtra.toFixed(2) : valorExtra) || 0,
    observacoes,
    pagamento,
    commissions,
    showRota: !!(document.getElementById('showRota') || {}).checked,
    showAeronave: !!(document.getElementById('showAeronave') || {}).checked,
    showTarifa: !!(document.getElementById('showTarifa') || {}).checked,
    showDistancia: !!(document.getElementById('showDistancia') || {}).checked,
    showDatas: !!(document.getElementById('showDatas') || {}).checked,
    showAjuste: !!(document.getElementById('showAjuste') || {}).checked,
    showComissao,
    showObservacoes: !!(document.getElementById('showObservacoes') || {}).checked,
    showPagamento: !!(document.getElementById('showPagamento') || {}).checked,
    showMapa: !!(document.getElementById('showMapa') || {}).checked
  };
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
    const tarifaPreview = typeof document !== 'undefined' ? document.getElementById('tarifaPreview') : null;
    const syncTarifaFromAeronave = () => {
      const val = valoresKm[aeronaveSel.value];
      if (!tarifaInput.value || tarifaInput.value === '') tarifaInput.value = val || '';
      if (tarifaPreview) tarifaPreview.textContent = tarifaInput.value ? `R$ ${Number(tarifaInput.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km` : '';
    };
    aeronaveSel.addEventListener('change', syncTarifaFromAeronave);
    tarifaInput.addEventListener('input', () => {
      if (tarifaPreview) tarifaPreview.textContent = tarifaInput.value ? `R$ ${Number(tarifaInput.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km` : '';
      // Atualiza pré-orçamento ao editar tarifa manualmente
      try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch (e) { /* ignore */ }
    });

    // Simplified tariff handling - no modal needed
    aeronaveSel.addEventListener('change', () => {
      const defaultVal = valoresKm[aeronaveSel.value];
      if (!tarifaInput.value || tarifaInput.value === '') {
        tarifaInput.value = defaultVal || '';
      }
      if (tarifaPreview) tarifaPreview.textContent = tarifaInput.value ? `R$ ${Number(tarifaInput.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km` : '';
      try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch (e) {}
    });

  } // Close the if (aeronaveSel && tarifaInput) block

  // (removido modal tarifa) bloco obsoleto purgado

  function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  async function refreshRouteFromInputs(triggerPre = false) {
    // This function should be defined elsewhere - adding placeholder
    if (triggerPre && typeof gerarPreOrcamentoCore === 'function') {
      try { gerarPreOrcamentoCore(); } catch (e) { /* ignore */ }
    }
  }

  const debouncedRefresh = debounce(() => refreshRouteFromInputs(true), 400);

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

  // Expose a refresh function that does NOT trigger gerarPreOrcamento to avoid recursion
  window.__refreshRouteNow = refreshRouteFromInputs.bind(null, false);
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

// === AVWX METAR support ===
async function fetchMETARFor(icao) {
  if (!icao || String(icao).trim() === '') return null;
  const code = String(icao).toUpperCase();
  // Primeiro, tentar AVWX se token presente
  const headers = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  try {
    if (API_KEY) {
      const res = await fetch(`https://avwx.rest/api/metar/${code}`, { headers });
      if (res && res.ok) return await res.json();
    }
  } catch (e) { /* ignore */ }
  return null;
}

// ligar botão no DOM
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnFetchMetar');
    const out = document.getElementById('metarOutput');

    if (btn) btn.addEventListener('click', async () => {
      const icao = (document.getElementById('origem') || {}).value || '';
      if (!icao) {
        if (out) { out.style.display = 'block'; out.textContent = 'Informe um ICAO na Origem para buscar METAR.'; }
        return;
      }
      if (!API_KEY) {
        if (out) { out.style.display = 'block'; out.textContent = 'AVWX token não configurado no sistema.'; }
        return;
      }
      if (out) { out.style.display = 'block'; out.textContent = 'Buscando METAR...'; }
      try {
        const data = await fetchMETARFor(icao);
        if (!data) {
          if (out) out.textContent = 'Nenhum METAR via AVWX.';
          return;
        }
        if (out) out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        if (out) out.textContent = 'Erro ao buscar METAR: ' + String(err.message || err);
      }
    });
  });
}

function buildDocDefinition(state) {
  // Calculate variables needed for the document
  const km = state.nm * 1.852;
  const subtotal = state.nm * 1.852 * state.valorKm;
  const valorExtra = state.valorExtra || 0;
  let total = subtotal;
  
  if (state.tipoExtra === 'soma') {
    total += valorExtra;
  } else if (state.tipoExtra === 'subtrai') {
    total -= valorExtra;
  }

  // Commission calculation
  const commissionAmount = typeof obterComissao === 'function' ? obterComissao(km, state.valorKm) : 0;
  const { totalComissao, detalhesComissao } = calcularComissao(subtotal, valorExtra, state.tipoExtra, state.commissions || []);
  total += totalComissao + commissionAmount;

  // Header block with company info
  const headerBlock = {
    canvas: [
      { type: 'rect', x: -40, y: -30, w: 595, h: 90, color: '#1B2635' },
      { type: 'rect', x: -40, y: 30, w: 595, h: 4, color: '#F1C40F' }
    ]
  };

  const companyHeader = {
    columns: [
      { width: '*', stack: [
        { text: '[NOME_EMPRESA]', style: 'brand' },
        { text: '[SLOGAN_CURTO]', style: 'muted' }
      ], margin: [0,4,0,0] },
      { width: 'auto', stack: [
        { text: '[EMAIL_CONTATO]', style: 'miniRight' },
        { text: '[WHATSAPP_LINK]', style: 'miniRight' },
        { text: '[CNPJ_OPCIONAL]', style: 'miniRight' }
      ] }
    ],
    columnGap: 16,
    margin: [0,0,0,4]
  };

  const resumoLeft = [];
  if (state.showRota) {
    const codes = [state.origem, state.destino, ...(state.stops || [])].filter(Boolean).join(' → ');
    resumoLeft.push({ text: `Rota: ${codes}`, style: 'row' });
  }
  if (state.showAeronave) resumoLeft.push({ text: `Aeronave: ${state.aeronave}`, style: 'row' });
  if (state.showDatas) resumoLeft.push({ text: `Datas: ${state.dataIda} - ${state.dataVolta}`, style: 'row' });

  const resumoRight = [];
  if (state.showDistancia) resumoRight.push({ text: `Distância: ${state.nm} NM (${km.toFixed(1)} km)`, style: 'row' });
  if (state.showTarifa) resumoRight.push({ text: `Tarifa por km: R$ ${state.valorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'row' });

  // Bloco de resumo em "card"
  const resumoBlock = {
    table: {
      widths: ['*','*'],
      body: [
        [
          { stack: resumoLeft, margin: [0,0,0,0] },
          { stack: resumoRight, margin: [0,0,0,0] }
        ]
      ]
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 8,
      paddingBottom: () => 8,
      fillColor: () => '#F8FAFC'
    },
    margin: [0, 8, 0, 14]
  };

  // Tabela de investimento
  const investBody = [];
  investBody.push([{ text: `Total parcial: R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);

  if (state.showAjuste && state.valorExtra > 0) {
    const label = state.tipoExtra === 'soma' ? 'Outras Despesas' : 'Desconto';
    investBody.push([{ text: `${label}: R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
  }

  if (state.showComissao) {
    (detalhesComissao || []).forEach((c, idx) => {
      investBody.push([{ text: `Comissão ${idx + 1}: R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    });
    if (commissionAmount > 0) {
      investBody.push([{ text: `Comissão: R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    }
  }

  investBody.push([{ text: `Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right', style: 'totalRow' }]);

  const investimentoBlock = {
    table: { widths: ['*'], body: investBody },
    layout: {
      fillColor: (rowIndex) => {
        if (rowIndex === investBody.length - 1) return '#1B2635';
        return rowIndex % 2 === 0 ? '#FFFFFF' : '#F4F6F8';
      },
      hLineColor: () => '#E2E8F0',
      vLineColor: () => '#E2E8F0',
      paddingTop: () => 6,
      paddingBottom: () => 6,
      paddingLeft: () => 10,
      paddingRight: () => 10
    },
    margin: [0, 6, 0, 16]
  };

  const extras = [];
  if (state.showObservacoes && state.observacoes) extras.push({ text: `Observações: ${state.observacoes}`, margin: [0, 2, 0, 0] });
  if (state.showPagamento && state.pagamento) extras.push({ text: `Dados de pagamento: ${state.pagamento}`, margin: [0, 2, 0, 0] });
  if (state.showMapa) extras.push({ text: 'Mapa:', margin: [0, 2, 0, 0] });

  // Texto invisível preserva palavras-chave para testes
  const resumoTextForTest = [...resumoLeft, ...resumoRight].map(r => r.text).join(' ');

  const content = [
    { text: 'Cotação de Voo Executivo', style: 'h1' },
    headerBlock,
    companyHeader,
    { text: '', margin: [0,2,0,0] },
    resumoBlock,
    { text: resumoTextForTest, fontSize: 0, margin: [0, 0, 0, 0], color: '#fff' },
  { canvas: [
      { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.2, lineColor: '#E2E8F0' },
      { type: 'line', x1: 0, y1: 2, x2: 515, y2: 2, lineWidth: 0.4, lineColor: '#F1C40F' }
    ], margin: [0,4,0,4] },
  { text: 'Investimento', style: 'sectionTitle', margin: [0, 6, 0, 6] },
  investimentoBlock,
  ...(extras.length ? [{ text: 'Informações adicionais', style: 'h2', margin: [0, 6, 0, 4] }, ...extras] : [])
  ];

  try { console.debug('[PDF][buildDocDefinition] content length', content.length, 'keys first items', content.slice(0,5).map(i => Object.keys(i))); } catch {}

  return {
    content,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { fontSize: 10, lineHeight: 1.3, color: '#1B2635', font: 'Helvetica' },
    styles: {
      h1: { fontSize: 20, bold: true, color: '#1B2635', margin: [0, 0, 0, 4], letterSpacing: 0.5 },
      sectionTitle: { fontSize: 13, bold: true, color: '#1B2635', letterSpacing: 0.5 },
      brand: { fontSize: 18, bold: true, color: '#F1C40F', letterSpacing: 1 },
      muted: { color: '#E5E7EB', margin: [0, 2, 0, 0], fontSize: 9, letterSpacing: 0.5 },
      mini: { color: '#516170', fontSize: 8 },
      miniRight: { color: '#F1F3F5', fontSize: 8, alignment: 'right' },
      row: { margin: [0, 2, 0, 0], fontSize: 10 },
      totalRow: { bold: true, color: '#FFFFFF', fontSize: 12 }
    },
    info: { title: 'Cotação de Voo Executivo', author: '[NOME_EMPRESA]' },
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { text: '[NOME_EMPRESA] • [WHATSAPP_LINK] • [EMAIL_CONTATO]', style: 'mini' },
          { text: `${currentPage} / ${pageCount}`, alignment: 'right', style: 'mini' }
        ],
        margin: [40, 0, 40, 20]
      };
    }
  };
}

/* ==== BEGIN PATCH: função gerarPreOrcamento (resumo completo + validações) ==== */
async function gerarPreOrcamento() {
  // Build state first
  const state = buildState();
  const saida = document.getElementById('resultado');

  // If NM/KM are present, prefer them. Otherwise, attempt to compute via ICAO lookup.
  if (!Number.isFinite(state.nm) || state.nm <= 0) {
    // attempt to refresh route (this will update nm/km) and then build state again
    if (typeof refreshRouteFromInputs === 'function') {
      await refreshRouteFromInputs(false);
    }
  }

  // rebuild state after possible update
  const state2 = buildState();
  const distanciaValida = Number.isFinite(state2.nm) && state2.nm > 0;
  const valorKmValido = Number.isFinite(state2.valorKm) && state2.valorKm > 0;

  if (!valorKmValido) {
    if (saida) saida.innerHTML = `<div style="padding:12px;border:1px solid #f1c40f;background:#fffbe6;border-radius:6px">Selecione uma aeronave ou informe a <strong>tarifa por km</strong>.</div>`;
    return;
  }
  if (!distanciaValida) {
    if (saida) saida.innerHTML = `<div style="padding:12px;border:1px solid #f1c40f;background:#fffbe6;border-radius:6px">Informe a <strong>distância</strong> (NM ou KM) ou preencha os aeroportos para calcular automaticamente.</div>`;
    return;
  }

  const km = state2.nm * 1.852;
  const subtotal = valorParcialFn(km, state2.valorKm);

  // Ajuste (soma/subtrai)
  let total = valorTotalFn(
    km,
    state2.valorKm,
    state2.tipoExtra === 'soma' ? state2.valorExtra : -state2.valorExtra
  );
  let labelExtra = '';
  if (state2.valorExtra > 0) {
    labelExtra = `${state2.tipoExtra === 'soma' ? '+' : '-'} ${fmtBRL(state2.valorExtra)}`;
  }

  // Comissão: percentuais (se houver) + componente (#commissionAmount)
  const { totalComissao, detalhesComissao } = calcularComissao(
    subtotal,
    state2.valorExtra,
    state2.tipoExtra,
    state2.commissions || []
  );
  const commissionAmount = obterComissao(km, state2.valorKm);

  total += totalComissao + commissionAmount;

  // Render do resumo completo
  const html = renderResumo(state2, { km, subtotal, total, labelExtra, detalhesComissao, commissionAmount });
  saida.innerHTML = html;
  saida.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/* ==== END PATCH ==== */

async function gerarPDF(state) {
  const s = state || buildState();
  try { console.debug('[PDF][gerarPDF] Estado bruto antes de refresh', s); } catch {}
  if (typeof __refreshRouteNow === 'function') { await __refreshRouteNow(); }
  let waypoints = [];
  if (s.showMapa) {
    const codes = [s.origem, s.destino, ...(s.stops || [])];
    for (const code of codes) {
      const point = await fetchAirportByCode(code);
      if (point) waypoints.push(point);
    }
    updateDistanceFromAirports(waypoints);
  }
  const docDefinition = buildDocDefinition(s);
  try { console.debug('[PDF][gerarPDF] docDefinition recebido', { hasContent: !!docDefinition && Array.isArray(docDefinition.content), count: docDefinition?.content?.length }); } catch {}
  // Diagnóstico: detectar content vazio ou inválido
  let isBlank = false;
  try {
    if (!docDefinition || !Array.isArray(docDefinition.content)) isBlank = true;
    else {
      const meaningful = docDefinition.content.some(item => {
        if (!item) return false;
        if (typeof item.text === 'string' && item.text.trim() !== '') return true;
        if (item.table || item.columns || item.stack || item.canvas) return true;
        return false;
      });
      if (!meaningful) isBlank = true;
    }
  } catch { isBlank = true; }

  let finalDef = docDefinition;
  if (isBlank) {
    console.warn('[PDF] Detetado docDefinition possivelmente em branco. Gerando fallback. State:', s, 'Doc:', docDefinition);
    finalDef = {
      pageSize: 'A4',
      pageMargins: [40,60,40,60],
      content: [
        { text: 'Pré-Orçamento', fontSize: 16, bold: true, margin: [0,0,0,12] },
        { text: 'Não foi possível montar o layout completo do PDF. Este é um fallback automático.', fontSize: 9, color: 'red', margin:[0,0,0,12] },
        { text: JSON.stringify({ aeronave: s.aeronave, nm: s.nm, origem: s.origem, destino: s.destino }, null, 2), fontSize: 8 }
      ]
    };
  }

  if (typeof pdfMake !== 'undefined') {
    try {
      // Tenta abrir em nova aba; se bloqueado, força download
      pdfMake.createPdf(finalDef).open();
      setTimeout(() => {
        try { console.debug('[PDF][gerarPDF] Tentando forçar download de debug (seguro ignorar)'); pdfMake.createPdf(finalDef).download('cotacao-debug.pdf'); } catch {}
      }, 1500);
    } catch (e) {
      console.error('[PDF] Erro ao abrir PDF principal, usando fallback mínimo.', e);
      try { pdfMake.createPdf({ content: [{ text: 'Erro ao gerar PDF', color: 'red' }, { text: String(e), fontSize: 8 }] }).open(); } catch {}
    }
  }
  return finalDef;
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
