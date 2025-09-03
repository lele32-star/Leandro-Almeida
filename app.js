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
  // TODO: Complete distance calculation implementation
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
    valorKm: Number.isFinite(valorKm) ? Number(valorKm) : 0,
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

function initDateGuards() {
  // Date validation guards - implementation can be added later if needed
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

    // botão Mostrar/Editar Tarifa
    const btnShowTarifa = document.getElementById('btnShowTarifa');
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

    // Ao carregar a página, aplicar tarifa salva ou padrão
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const store = loadTarifasStore();
        const saved = store[aeronaveSel.value];
        if (saved !== undefined && saved !== null) tarifaInput.value = saved;
        else if (!tarifaInput.value || tarifaInput.value === '') tarifaInput.value = valoresKm[aeronaveSel.value] || '';
        applyTarifaPreview();
      } catch (e) {}
    });

    // substituir comportamento do botão para abrir modal
    if (btnShowTarifa && modal && modalInput && modalSave && modalCancel) {
      btnShowTarifa.addEventListener('click', () => {
        const cur = tarifaInput.value || valoresKm[aeronaveSel.value] || '';
        modalInput.value = cur;
        modal.classList.add('show');
        // focar input
        setTimeout(() => modalInput.focus(), 50);
      });

      modalCancel.addEventListener('click', () => {
        modal.classList.remove('show');
      });

      modalSave.addEventListener('click', () => {
        const val = parseFloat(modalInput.value);
        if (Number.isFinite(val) && val >= 0) {
          tarifaInput.value = val;
          applyTarifaPreview();
          
          // Salvar no store personalizado
          const store = loadTarifasStore();
          store[aeronaveSel.value] = val;
          saveTarifasStore(store);
          
          saveAndRefresh();
        }
        modal.classList.remove('show');
      });

      // Fechar modal com Escape
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          modal.classList.remove('show');
        }
      });

      // Salvar com Enter no input
      modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          modalSave.click();
        }
      });
    }
  }

  function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
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

  async function refreshRouteFromInputs(triggerPre = false) {
    // Placeholder for route refresh functionality
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
  if(state.showRota){ const rota=[state.origem, ...(state.stops||[]), state.destino].filter(Boolean).join(' → '); resumoLeft.push({text:`Rota: ${rota}`}); }
  if(state.showAeronave) resumoLeft.push({text:`Aeronave: ${state.aeronave}`});
  if(state.showDatas) resumoLeft.push({text:`Datas: ${state.dataIda} - ${state.dataVolta}`});
  if(state.showDistancia) resumoRight.push({text:`Distância: ${state.nm} NM (${km.toFixed(1)} km)`});
  if(state.showTarifa) resumoRight.push({text:`Tarifa: R$ ${state.valorKm.toLocaleString('pt-BR',{minimumFractionDigits:2})}`});

  const investBody=[];
  investBody.push([{text:`Subtotal: R$ ${subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}`, alignment:'right'}]);
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

async function gerarPDF(state){
  const s = state||buildState();
  // recalcula rota se necessário
  if(s.showMapa && typeof refreshRouteFromInputs==='function'){
    try { await refreshRouteFromInputs(false); } catch{}
  }
  const def = buildDocDefinition(s);
  if(!def || !Array.isArray(def.content) || !def.content.length){
    console.warn('[PDF] Def vazio, usando fallback', def);
    return pdfMake && pdfMake.createPdf({content:[{text:'Falha ao gerar PDF',color:'red'}]}).open();
  }
  if(typeof pdfMake==='undefined'){ console.error('pdfMake não carregado'); return def; }
  try { pdfMake.createPdf(def).open(); } catch(e){
    console.error('Erro pdfMake.open()', e); try { pdfMake.createPdf(def).download('cotacao.pdf'); } catch{}
  }
  return def;
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
  window.appGerarPDF = gerarPDF; // será sobrescrito por fallback visual abaixo

  /* === Fallback visual (html2canvas) para casos de PDF em branco === */
  (function installPdfImageFallback(){
    function ensureVfs(){
      try {
        if (window.pdfMake && !window.pdfMake.vfs && window.pdfFonts?.pdfMake?.vfs) {
          window.pdfMake.vfs = window.pdfFonts.pdfMake.vfs;
        }
      } catch(e){ console.warn('[PDF] Falha ao garantir vfs', e); }
    }

    async function gerarPDFDom(){
      ensureVfs();
      const target = document.getElementById('resultado');
      if (!target) { console.error('[PDF] Área #resultado não encontrada'); return; }
      if (!target.innerHTML.trim() && typeof window.appGerarPreOrcamento === 'function') {
        try { window.appGerarPreOrcamento(); } catch{}
        await new Promise(r=>setTimeout(r,80));
      }

      // Se ainda vazio, recorre ao builder nativo
      if (!target.innerHTML.trim()) {
        console.warn('[PDF] Resultado vazio, usando builder nativo');
        return gerarPDF();
      }

      const showMapa = !!document.getElementById('showMapa')?.checked;
      const clone = target.cloneNode(true);
      clone.style.background = '#fff';
      // Remover mapa se não for para exibir
      if (!showMapa) { const m = clone.querySelector('#map'); if (m) m.remove(); }
      clone.style.position='fixed';
      clone.style.left='-99999px';
      clone.style.top='0';
      document.body.appendChild(clone);
      try {
        if (typeof html2canvas !== 'function') {
          console.warn('[PDF] html2canvas indisponível, fallback nativo.');
          return gerarPDF();
        }
        const canvas = await html2canvas(clone, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: false,
          ignoreElements: el => el?.id === 'map' || el?.classList?.contains('leaflet-pane')
        });
        const img = canvas.toDataURL('image/png');
        const docDefinition = { pageSize:'A4', pageMargins:[24,24,24,24], content:[{ image: img, width: 545 }] };
        if (typeof pdfMake === 'undefined') { console.error('[PDF] pdfMake não carregado'); return; }
        pdfMake.createPdf(docDefinition).download(`cotacao-${new Date().toISOString().slice(0,10)}.pdf`);
      } catch(err){
        console.error('[PDF] Falha html2canvas, fallback texto', err);
        try {
          if (typeof pdfMake !== 'undefined') {
            const doc = { content:[{ text: (target.innerText||'Cotação'), fontSize:12 }] };
            pdfMake.createPdf(doc).download('cotacao.pdf');
          }
        } catch(e2){ console.error('[PDF] Falha também no fallback texto', e2); }
      } finally {
        try { document.body.removeChild(clone); } catch{}
      }
    }

    // expõe e sobrescreve botão principal
    window.gerarPDFDom = gerarPDFDom;
    window.appGerarPDF = gerarPDFDom;
  })();
}

if (typeof module !== 'undefined') {
  module.exports = { buildState, buildDocDefinition, gerarPDF, calcularComissao };
}
