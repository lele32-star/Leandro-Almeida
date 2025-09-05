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

  // Calculate distance logic would go here...
}

// Date synchronization logic (wrapped in DOM check)
if (typeof document !== 'undefined') {
  const ida = document.getElementById('dataIda');
  const volta = document.getElementById('dataVolta');
  
  const syncVolta = () => {
    if (!ida || !volta) return;
    const min = ida.value;
    if (volta.value && volta.value < min) volta.value = min;
  };
  
  if (ida) ida.addEventListener('change', syncVolta);
  syncVolta();
}
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
  // If no tariff is set, fall back to the default for the selected aircraft
  const finalValorKm = Number.isFinite(valorKm) && valorKm > 0 ? valorKm : (valoresKm[aeronave] || 0);
  const origem = ((document.getElementById('origem') || {}).value || '').toUpperCase();
  const destino = ((document.getElementById('destino') || {}).value || '').toUpperCase();
  const stops = typeof document !== 'undefined' && document.querySelectorAll ? Array.from(document.querySelectorAll('.stop-input')).map(i => (i.value || '').toUpperCase()).filter(Boolean) : [];
  const dataIda = (document.getElementById('dataIda') || {}).value || '';
  const dataVolta = (document.getElementById('dataVolta') || {}).value || '';
  const tipoExtra = typeof document !== 'undefined' && document.querySelector ? ((document.querySelector('input[name="tipoExtra"]:checked') || {}).value) || 'soma' : 'soma';
  const valorExtra = parseFloat((document.getElementById('valorExtra') || {}).value || '0') || 0;
  const observacoes = (document.getElementById('observacoes') || {}).value || '';
  const pagamento = (document.getElementById('pagamento') || {}).value || '';
  const commissions = (typeof getAllCommissions === 'function') ? getAllCommissions() : [];
  const showComissao = !!(document.getElementById('pdfCommissionToggle') || {}).checked;

  return {
    aeronave,
    nm: Number.isFinite(nm) ? Number(nm.toFixed(2)) : 0,
    valorKm: Number.isFinite(finalValorKm) ? Number(finalValorKm) : 0,
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
  const tarifaPreview = document.getElementById('tarifaPreview');
  function renderTarifaPreview(){
    if (!tarifaPreview) return;
    const v = tarifaInput && tarifaInput.value ? Number(tarifaInput.value) : NaN;
    tarifaPreview.textContent = Number.isFinite(v) && v>0 ? `Tarifa selecionada: R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2})}/km` : '';
  }
  function syncTarifaFromAeronave(){
    if (!aeronaveSel || !tarifaInput) return;
    const base = valoresKm[aeronaveSel.value];
    if (base && (!tarifaInput.value || Number(tarifaInput.value)<=0)) tarifaInput.value = base;
    renderTarifaPreview();
    try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch{}
  }
  if (aeronaveSel && tarifaInput){
    aeronaveSel.addEventListener('change', syncTarifaFromAeronave);
    tarifaInput.addEventListener('input', ()=>{ renderTarifaPreview(); try { if (typeof gerarPreOrcamento==='function') gerarPreOrcamento(); } catch{} });
    // inicial
    setTimeout(syncTarifaFromAeronave,0);
  }
    const modal = document.getElementById('modalTarifa');
    const modalInput = document.getElementById('tarifaModalInput');
    const modalSave = document.getElementById('tarifaModalSave');
    const modalCancel = document.getElementById('tarifaModalCancel');

    // Persistência simples em localStorage
    const LKEY = 'cotacao:tarifas';
    function loadTarifasStore() {
      try { return JSON.parse(localStorage.getItem(LKEY) || '{}'); } catch { return {}; }
    }
    function saveTarifasStore(store) { try { localStorage.setItem(LKEY, JSON.stringify(store)); } catch {} }

    // Atualiza preview e persiste se necessário (debounced)
    const saveAndRefresh = debounce(() => {
      try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch (e) {}
    }, 200);

    const applyTarifaPreview = () => {
      if (tarifaPreview) tarifaPreview.textContent = tarifaInput.value ? `R$ ${Number(tarifaInput.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km` : '';
    };

    // Ao trocar de aeronave, aplicar tarifa padrão ou a salva
    aeronaveSel.addEventListener('change', () => {
      const store = loadTarifasStore();
      const saved = store[aeronaveSel.value];
      const defaultVal = valoresKm[aeronaveSel.value];
      if (saved !== undefined && saved !== null) {
        tarifaInput.value = saved;
      } else if (!tarifaInput.value || tarifaInput.value === '') {
        tarifaInput.value = defaultVal || '';
      }
      applyTarifaPreview();
      saveAndRefresh();
    });

  // (removido modal tarifa) bloco obsoleto purgado

  function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // Stub for refreshRouteFromInputs (simplified - no coordinate fetching)
  function refreshRouteFromInputs(triggerPre = false) {
    // Simplified version - just update distance if available
    const nmInput = document.getElementById('nm');
    const kmInput = document.getElementById('km');
    if (nmInput && kmInput) {
      if (nmInput.value && !kmInput.value) {
        kmInput.value = (parseFloat(nmInput.value) * 1.852).toFixed(1);
      } else if (kmInput.value && !nmInput.value) {
        nmInput.value = (parseFloat(kmInput.value) / 1.852).toFixed(1);
      }
    }
    
    if (triggerPre && typeof gerarPreOrcamento === 'function') {
      try { gerarPreOrcamento(); } catch (e) { /* ignore */ }
    }
  }

  // Simple ICAO code enforcement
  function enforceICAO(input) {
    if (input && input.value) {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    }
  }

  // Simple currency formatter
  function fmtBRL(n) {
    return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  // Simple summary renderer
  function renderResumo(state, { km, subtotal, total, labelExtra, detalhesComissao, commissionAmount }) {
    const parts = [
      `<h3>Resumo da Cotação</h3>`,
      `<p><strong>Aeronave:</strong> ${state.aeronave}</p>`,
      `<p><strong>Rota:</strong> ${state.origem} → ${state.destino}</p>`,
      `<p><strong>Distância:</strong> ${state.nm} NM (${km.toFixed(1)} km)</p>`,
      `<p><strong>Tarifa:</strong> R$ ${fmtBRL(state.valorKm)}/km</p>`,
      `<p><strong>Subtotal:</strong> R$ ${fmtBRL(subtotal)}</p>`
    ];

    if (labelExtra) {
      parts.push(`<p><strong>Ajuste:</strong> ${labelExtra}</p>`);
    }

    if (commissionAmount > 0) {
      parts.push(`<p><strong>Comissão:</strong> R$ ${fmtBRL(commissionAmount)}</p>`);
    }

    if (detalhesComissao && detalhesComissao.length > 0) {
      detalhesComissao.forEach(({ label, valor }) => {
        parts.push(`<p><strong>${label}:</strong> R$ ${fmtBRL(valor)}</p>`);
      });
    }

    parts.push(`<p style="font-size: 1.2em; font-weight: bold;"><strong>Total Final:</strong> R$ ${fmtBRL(total)}</p>`);

    return parts.join('\n');
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

function buildDocDefinition(state){
  const km = state.nm * 1.852;
  const subtotal = valorParcialFn(km, state.valorKm);
  const totalBase = valorTotalFn(km, state.valorKm, state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra);
  const { totalComissao, detalhesComissao } = calcularComissao(subtotal, state.valorExtra, state.tipoExtra, state.commissions||[]);
  const commissionAmount = obterComissao(km, state.valorKm);
  const total = totalBase + totalComissao + commissionAmount;

  const resumoLeft=[]; const resumoRight=[];
  if(state.showRota){ const rota=[state.origem, state.destino, ...(state.stops||[])].filter(Boolean).join(' → '); resumoLeft.push({text:`Rota: ${rota}`}); }
  if(state.showAeronave) resumoLeft.push({text:`Aeronave: ${state.aeronave}`});
  if(state.showDatas) resumoLeft.push({text:`Datas: ${state.dataIda} - ${state.dataVolta}`});
  if(state.showDistancia) resumoRight.push({text:`Distância: ${state.nm} NM (${km.toFixed(1)} km)`});
  if(state.showTarifa) resumoRight.push({text:`Tarifa: R$ ${state.valorKm.toLocaleString('pt-BR',{minimumFractionDigits:2})}`});

  const investBody=[];
  investBody.push([{text:`Total parcial: R$ ${subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right'}]);
  if(state.showAjuste && state.valorExtra>0){ investBody.push([{text:`${state.tipoExtra==='soma'?'Outras Despesas':'Desconto'}: R$ ${state.valorExtra.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right'}]); }
  if(state.showComissao){ (detalhesComissao||[]).forEach((c,i)=>investBody.push([{text:`Comissão ${i+1}: R$ ${c.calculado.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,alignment:'right'}])); if(commissionAmount>0) investBody.push([{text:`Comissão: R$ ${commissionAmount.toLocaleString('pt-BR',{minimumFractionDigits:2})}`,alignment:'right'}]); }
  investBody.push([{text:`Total Final: R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, style:'total', alignment:'right'}]);

  const extras=[];
  if(state.showObservacoes && state.observacoes) extras.push({text:`Observações: ${state.observacoes}`});
  if(state.showPagamento && state.pagamento) extras.push({text:`Pagamento: ${state.pagamento}`});

  return {
    pageSize:'A4', pageMargins:[40,60,40,60],
    content:[
      {text:'Cotação de Voo Executivo', style:'h1'},
      {columns:[{stack:resumoLeft},{stack:resumoRight}] , margin:[0,8,0,12]},
      {text:'Investimento', style:'h2'},
      {table:{widths:['*'], body:investBody}, layout:'noBorders', margin:[0,4,0,10]},
      ...(extras.length?[{text:'Informações Adicionais', style:'h2', margin:[0,4,0,4]}, ...extras]:[])
    ],
    styles:{ h1:{fontSize:18,bold:true}, h2:{fontSize:12,bold:true}, total:{bold:true,fontSize:12,color:'#1B2635'} },
    defaultStyle:{fontSize:10}
  };
}

async function gerarPDF(state) {
  console.log('[PDF] Generating PDF...');
  const s = state || buildState();
  
  try {
    const docDefinition = buildDocDefinition(s);
    console.log('[PDF] Document definition created successfully');
    
    if (typeof pdfMake === 'undefined') {
      console.error('[PDF] pdfMake não carregado');
      return docDefinition;
    }
    
    // Simple PDF generation without complex fallbacks
    pdfMake.createPdf(docDefinition).open();
    console.log('[PDF] PDF generated and opened successfully');
    return docDefinition;
    
  } catch (error) {
    console.error('[PDF] Erro ao gerar PDF:', error);
    
    // Simple fallback - just try to create a basic PDF
    if (typeof pdfMake !== 'undefined') {
      try {
        const fallbackDoc = {
          content: [
            { text: 'Cotação de Voo Executivo', fontSize: 16, bold: true },
            { text: 'Erro ao gerar PDF completo. Dados básicos:', margin: [0, 10, 0, 5] },
            { text: `Aeronave: ${s.aeronave || 'N/A'}` },
            { text: `Origem: ${s.origem || 'N/A'}` },
            { text: `Destino: ${s.destino || 'N/A'}` },
            { text: `Distância: ${s.nm || 0} NM` },
            { text: `Tarifa: R$ ${(s.valorKm || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
          ]
        };
        pdfMake.createPdf(fallbackDoc).open();
      } catch (fallbackError) {
        console.error('[PDF] Erro no fallback também:', fallbackError);
      }
    }
    
    return null;
  }
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
