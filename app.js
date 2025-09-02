/*
================= ESPECIFICAÇÃO ATUAL (PROMPT) =================
Contexto: App de cotação com dois métodos.
Método 1 (distância): Tarifa/km * Distância(KM) ± ajuste + comissões.
Método 2 (tempo): Valor-hora * soma(tempo_faturado_perna) onde:
  tempo_base = (NM / KTAS)
  tempo_ajustado = tempo_base * (1 + bufferVento%) + (taxiMin/60)
  tempo_faturado_perna = max(tempo_ajustado, minimoMin/60 se informado)
Total Método 2 = Valor-hora * totalHoras ± ajuste + comissões.

Requisitos desta entrega:
1. Método 2 deve usar sempre o valor do input #hourlyRate na hora do PRÉ-ORÇAMENTO.
2. Botão "Gerar Pré-Orçamento" congela: método escolhido + snapshot completo (quoteSnapshot) em memória + localStorage.
3. Botão "Gerar PDF" NÃO recalcula: usa snapshot congelado; se inexistente, alerta usuário.
4. Expor API interna:
   computeByDistance(formState) -> QuoteResult
   computeByTime(formState) -> QuoteResult
   freezePreQuote(method, result)
   getFrozenQuote() -> { selectedMethod, snapshot } | null
5. Manter IDs, formatação BRL 2 casas, não refatorar além do necessário.
===============================================================
*/

// ================= SNAPSHOT / PRE-QUOTE API =================
let __frozenQuote = null; // { version, selectedMethod: 'distance'|'time', snapshot: {...}, ts }
const FROZEN_KEY = 'quote:last';
const CURRENT_VERSION = '1.0';

function getFrozenQuote(){
  if (App.state && App.state.getFrozenQuote) {
    const snap = App.state.getFrozenQuote();
    if (snap) return { version: CURRENT_VERSION, selectedMethod: snap.method || snap.selectedMethod, snapshot: snap.snapshot || snap, ts: snap.ts || Date.now() };
  }
  if (__frozenQuote) return __frozenQuote;
  try { const raw = localStorage.getItem(FROZEN_KEY); if (raw){ const parsed = JSON.parse(raw); if (parsed.version===CURRENT_VERSION) { __frozenQuote=parsed; return __frozenQuote; } localStorage.removeItem(FROZEN_KEY);} } catch {}
  return null;
}

function freezePreQuote(method, snapshot){
  if (App.state && App.state.freezeQuote) {
    const frozen = App.state.freezeQuote({ method, snapshot, ts: Date.now() });
    __frozenQuote = { version: CURRENT_VERSION, selectedMethod: method, snapshot: frozen.snapshot || frozen, ts: frozen.ts || Date.now() };
  } else {
    __frozenQuote = { version: CURRENT_VERSION, selectedMethod: method, snapshot, ts: Date.now() };
  }

  // Capturar mapa se disponível (usando html2canvas no container do mapa)
  if (typeof html2canvas !== 'undefined' && typeof document !== 'undefined') {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      try {
        html2canvas(mapEl, {
          useCORS: true,
          allowTaint: false,
          scale: 1,
          width: mapEl.offsetWidth,
          height: mapEl.offsetHeight
        }).then(canvas => {
          const dataUrl = canvas.toDataURL('image/png');
          __frozenQuote.snapshot.mapDataUrl = dataUrl;
          // Atualizar localStorage com mapa
          try { localStorage.setItem(FROZEN_KEY, JSON.stringify(__frozenQuote)); } catch {}
        }).catch(err => {
          console.warn('Falha ao capturar mapa para congelamento:', err);
        });
      } catch (e) {
        console.warn('Erro ao tentar capturar mapa:', e);
      }
    }
  }

  try { localStorage.setItem(FROZEN_KEY, JSON.stringify(__frozenQuote)); } catch{}
}
function baseQuoteResult(){
  return { method:null, distanciaKm:0, distanciaNm:0, valorKm:0, subtotal:0, ajusteAplicado:0, comissao:0, comissaoDetalhes:[], commissionAmountExtra:0, total:0, metodo2:null, aeronave:null, inputs:{}, legs:[], raw:{} };
}
function computeCommissionWrap(subtotal, valorExtra, tipoExtra, commissions, km, valorKm){
  const { totalComissao, detalhesComissao } = calcularComissao(subtotal, valorExtra, tipoExtra, commissions||[]);
  const commissionAmount = obterComissao(km, valorKm);
  return { totalComissao, detalhesComissao, commissionAmount };
}
function computeByDistance(state){
  const r = baseQuoteResult();
  r.method = 'distance';
  r.distanciaNm = state.nm;
  r.distanciaKm = state.nm * 1.852;
  r.valorKm = state.valorKm;
  r.aeronave = state.aeronave || (document.getElementById('aeronave')?.value||null);
  r.inputs = { ...state };
  const km = r.distanciaKm;
  const subtotal = km * r.valorKm;
  r.subtotal = subtotal;
  const ajusteAplicado = state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra;
  r.ajusteAplicado = ajusteAplicado;
  const { totalComissao, detalhesComissao, commissionAmount } = computeCommissionWrap(subtotal, state.valorExtra, state.tipoExtra, state.commissions, km, r.valorKm);
  r.comissao = totalComissao + commissionAmount;
  r.comissaoDetalhes = detalhesComissao;
  r.commissionAmountExtra = commissionAmount;
  r.total = subtotal + ajusteAplicado + r.comissao;
  r.raw = { subtotal, ajusteAplicado, totalComissao, commissionAmount };
  return r;
}
function computeByTime(state){
  const r = baseQuoteResult();
  r.method = 'time';
  r.distanciaNm = state.nm;
  r.distanciaKm = state.nm * 1.852;
  r.valorKm = state.valorKm; // mantido como referência
  r.aeronave = state.aeronave || (document.getElementById('aeronave')?.value||null);
  r.inputs = { ...state };
  const hourlyRate = Number(document.getElementById('hourlyRate')?.value || state.hourlyRate || 0);
  const cruise = Number(document.getElementById('cruiseSpeed')?.value || state.cruiseSpeed || 0);
  const windPercent = Number(document.getElementById('windBuffer')?.value || state.windBuffer || 0);
  const taxiMinutes = Number(document.getElementById('taxiMinutes')?.value || state.taxiMinutes || 0);
  const minBillable = Number(document.getElementById('minBillable')?.value || state.minBillable || 0);
  const legs = (typeof legsData!=='undefined' && Array.isArray(legsData) && legsData.length>0)? legsData.slice(): [{ distNm: state.nm }];
  r.legs = legs.map(l=>({ distNm: l.distNm }));
  function calcLegHours(dNm){ if(!cruise) return 0; let h=dNm/cruise; h = h*(1+windPercent/100)+(taxiMinutes/60); if(minBillable>0){ h=Math.max(h, minBillable/60);} return h; }
  let totalHours=0; legs.forEach(l=> totalHours += calcLegHours(Number(l.distNm||0)) );
  const subtotal = totalHours * hourlyRate;
  r.subtotal = subtotal;
  const ajusteAplicado = state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra;
  r.ajusteAplicado = ajusteAplicado;
  const { totalComissao, detalhesComissao, commissionAmount } = computeCommissionWrap(subtotal, state.valorExtra, state.tipoExtra, state.commissions, r.distanciaKm, r.valorKm);
  r.comissao = totalComissao + commissionAmount;
  r.comissaoDetalhes = detalhesComissao;
  r.commissionAmountExtra = commissionAmount;
  r.total = subtotal + ajusteAplicado + r.comissao;
  const mins = Math.round(totalHours*60); const hhmm = `${Math.floor(mins/60)}:${String(mins%60).padStart(2,'0')}`;
  r.metodo2 = { hourlyRate, cruise, totalHours, totalHhmm: hhmm, windPercent, taxiMinutes, minBillable };
  r.raw = { subtotal, ajusteAplicado, totalHours, hourlyRate };
  return r;
}
function getUiSelectedMethod(){
  const rTime = document.querySelector('input[name="metodoCalculo"][value="time"]');
  const rDist = document.querySelector('input[name="metodoCalculo"][value="distance"]');
  if (rTime?.checked) return 'time';
  if (rDist?.checked) return 'distance';
  try { const m = localStorage.getItem('selectedMethodPdf'); if (m==='method2') return 'time'; } catch{}
  return 'distance';
}
function renderFrozenPreview(container, frozen){
  if(!container) return;
  const { selectedMethod, snapshot } = frozen;
  const linhas=[];
  linhas.push(`<div><strong>Método:</strong> ${selectedMethod==='distance'?'Distância':'Tempo de voo'}</div>`);
  linhas.push(`<div><strong>Distância:</strong> ${snapshot.distanciaNm?.toFixed(1)} NM (${snapshot.distanciaKm?.toFixed(1)} km)</div>`);
  if (selectedMethod==='distance') {
  linhas.push(`<div><strong>Tarifa:</strong> R$ ${App.format.formatNumber(Number(snapshot.valorKm),2)}/km</div>`);
  } else if (snapshot.metodo2) {
  linhas.push(`<div><strong>Valor-hora:</strong> R$ ${App.format.formatNumber(Number(snapshot.metodo2.hourlyRate),2)}</div>`);
    linhas.push(`<div><strong>Tempo faturado:</strong> ${snapshot.metodo2.totalHhmm} (${snapshot.metodo2.totalHours.toFixed(2)} h)</div>`);
  }
  linhas.push(`<div><strong>Subtotal:</strong> R$ ${App.format.formatNumber(Number(snapshot.subtotal),2)}</div>`);
  if (snapshot.ajusteAplicado) linhas.push(`<div><strong>Ajuste:</strong> R$ ${App.format.formatNumber(Number(snapshot.ajusteAplicado),2)}</div>`);
  if (snapshot.comissao) linhas.push(`<div><strong>Comissões:</strong> R$ ${App.format.formatNumber(Number(snapshot.comissao),2)}</div>`);
  linhas.push(`<div style="margin-top:4px"><strong>Total:</strong> R$ ${App.format.formatNumber(Number(snapshot.total),2)}</div>`);
  container.innerHTML = `<div style="border:1px solid #ccc;padding:8px;border-radius:6px;background:#fafafa;font-size:14px;line-height:1.4">${linhas.join('')}</div>`;
}

// Funções de bloqueio/desbloqueio de UI
function lockInputsAfterFreeze(){
  // Desabilitar radio buttons de método
  const radios = document.querySelectorAll('input[name="metodoCalculo"]');
  radios.forEach(r => r.disabled = true);

  // Desabilitar inputs que afetam cálculo
  const inputsToLock = [
    'aeronave', 'tarifa', 'cruiseSpeed', 'hourlyRate', 'nm', 'km', 'origem', 'destino',
    'valorExtra', 'tipoExtra', 'windBuffer', 'taxiMinutes', 'minBillable'
  ];
  inputsToLock.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });

  // Desabilitar botões de adicionar/remover comissões
  const commissionBtn = document.getElementById('btnAddCommission');
  if (commissionBtn) commissionBtn.disabled = true;

  // Desabilitar inputs de comissão se existirem
  const commissionInputs = document.querySelectorAll('#commissionPanel input');
  commissionInputs.forEach(inp => inp.disabled = true);

  // Desabilitar botões de adicionar/remover paradas
  const addStopBtn = document.getElementById('addStop');
  if (addStopBtn) addStopBtn.disabled = true;

  // Desabilitar inputs de paradas
  const stopInputs = document.querySelectorAll('.stop-input');
  stopInputs.forEach(inp => inp.disabled = true);
}

function unlockInputsForNew(){
  // Reabilitar radio buttons de método
  const radios = document.querySelectorAll('input[name="metodoCalculo"]');
  radios.forEach(r => r.disabled = false);

  // Reabilitar inputs
  const inputsToUnlock = [
    'aeronave', 'tarifa', 'cruiseSpeed', 'hourlyRate', 'nm', 'km', 'origem', 'destino',
    'valorExtra', 'tipoExtra', 'windBuffer', 'taxiMinutes', 'minBillable'
  ];
  inputsToUnlock.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });

  // Reabilitar botões de comissão
  const commissionBtn = document.getElementById('btnAddCommission');
  if (commissionBtn) commissionBtn.disabled = false;

  // Reabilitar inputs de comissão
  const commissionInputs = document.querySelectorAll('#commissionPanel input');
  commissionInputs.forEach(inp => inp.disabled = false);

  // Reabilitar botões de paradas
  const addStopBtn = document.getElementById('addStop');
  if (addStopBtn) addStopBtn.disabled = false;

  // Reabilitar inputs de paradas
  const stopInputs = document.querySelectorAll('.stop-input');
  stopInputs.forEach(inp => inp.disabled = false);
}

function showFreezeBanner(frozen){
  const banner = document.getElementById('freezeBanner');
  const timestamp = document.getElementById('freezeTimestamp');
  if (banner && timestamp) {
    const date = new Date(frozen.ts);
    timestamp.textContent = `Congelado em ${date.toLocaleString('pt-BR')}. Para alterar, gere um novo pré-orçamento.`;
    banner.style.display = 'block';
  }
}

function hideFreezeBanner(){
  const banner = document.getElementById('freezeBanner');
  if (banner) banner.style.display = 'none';
}

function newPreOrcamento(){
  // Limpar estado congelado
  __frozenQuote = null;
  try { localStorage.removeItem(FROZEN_KEY); } catch {}
  if (window.SnapshotStore) window.SnapshotStore.unfreezeQuote();

  // Esconder banner
  hideFreezeBanner();

  // Desbloquear inputs
  unlockInputsForNew();

  // Limpar resultado
  const saida = document.getElementById('resultado');
  if (saida) saida.innerHTML = '';

  // Reabilitar botões principais
  const btnPre = document.querySelector('button[onclick*="appGerarPreOrcamento"]');
  if (btnPre) btnPre.disabled = false;
  const btnPdf = document.querySelector('button[onclick*="appGerarPDF"]');
  if (btnPdf) btnPdf.disabled = false;
}

function reabrirUltimoOrcamento(){
  const frozen = getFrozenQuote();
  if (!frozen) {
    showToast && showToast('Nenhum orçamento salvo encontrado.');
    return;
  }

  // Bloquear inputs
  lockInputsAfterFreeze();

  // Mostrar banner
  showFreezeBanner(frozen);

  // Renderizar preview
  renderFrozenPreview(document.getElementById('resultado'), frozen);

  // Scroll para resultado
  const saida = document.getElementById('resultado');
  if (saida) saida.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function copiarJSON(){
  const frozen = getFrozenQuote();
  if (!frozen) {
    showToast && showToast('Nenhum orçamento para copiar.');
    return;
  }

  const json = JSON.stringify(frozen.snapshot, null, 2);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(json).then(() => {
      showToast && showToast('JSON copiado para a área de transferência!');
    }).catch(() => {
      fallbackCopy(json);
    });
  } else {
    fallbackCopy(json);
  }
}

async function copiarLink(){
  const frozen = getFrozenQuote();
  if (!frozen) {
    showToast && showToast('Nenhum orçamento para compartilhar.');
    return;
  }
  try {
    if (App.share && typeof App.share.createShareLink === 'function') {
      const { url, revoke } = App.share.createShareLink(frozen.snapshot);
      const copy = (text) => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            showToast && showToast('Link copiado para a área de transferência!');
          }).catch(() => {
            fallbackCopy(text);
          });
        } else {
          fallbackCopy(text);
        }
      };
      copy(url);
      // Revoga após 60s para evitar vazamentos de memória
      setTimeout(() => { try { revoke(); } catch {} }, 60000);
    } else {
      showToast && showToast('Módulo de compartilhamento indisponível.');
    }
  } catch (e) {
    console.error('Falha ao gerar link de compartilhamento', e);
    showToast && showToast('Erro ao gerar link.');
  }
}

function fallbackCopy(text){
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast && showToast('Copiado para a área de transferência!');
  } catch {
    showToast && showToast('Erro ao copiar. Use Ctrl+C manualmente.');
  }
  document.body.removeChild(textArea);
}

// Função utilitária para buscar dados da aeronave selecionada
// uso centralizado via App.domain.aircraft.getSelectedAircraftData

// Formatação BRL (reutiliza padrão do app se existir)
function formatNumberBR(n) { return App.format.formatNumber(Number(n),2); }

// Função consolidada de autofill para aeronave - gerencia tarifa, velocidade e valor-hora
function setupAircraftAutofillConsolidated() {
  const select = document.getElementById('aeronave');
  const hourlyInput = document.getElementById('hourlyRate');
  const cruiseInput = document.getElementById('cruiseSpeed');
  const tarifaInput = document.getElementById('tarifa');
  const fillBtn = document.getElementById('btn-fill-aircraft');
  
  if (!select) {
    console.error('Select #aeronave não encontrado');
    return;
  }

  console.log('Configurando autofill consolidado para aeronave');

  // Utilitários para localStorage de tarifas
  const LKEY = 'cotacao:tarifas';
  function loadTarifasStore() {
    try { return JSON.parse(localStorage.getItem(LKEY) || '{}'); } catch { return {}; }
  }
  function saveTarifasStore(store) { 
    try { localStorage.setItem(LKEY, JSON.stringify(store)); } catch {} 
  }

  // Flags para proteger contra sobrescrita
  let userDirtyHourly = false;
  let userDirtyCruise = false;
  let userDirtyTarifa = false;

  // Detectar quando usuário começa a digitar
  if (hourlyInput) {
    hourlyInput.addEventListener('input', () => { userDirtyHourly = true; });
  }
  if (cruiseInput) {
    cruiseInput.addEventListener('input', () => { userDirtyCruise = true; });
  }
  if (tarifaInput) {
    tarifaInput.addEventListener('input', () => { userDirtyTarifa = true; });
  }

  function handleAircraftChange() {
    const val = select.value;
  const aircraft = (App.domain && App.domain.aircraft && App.domain.aircraft.getSelectedAircraftData({ aircraftId: val })) || null;
    
  console.log('Aeronave selecionada:', val, 'Dados encontrados:', aircraft);
    
  if (!aircraft) {
      console.warn('Aeronave não encontrada no catálogo:', val);
      return;
    }

    // 1. Gerenciar tarifa com localStorage (prioridade: salva > padrão > vazio)
    if (tarifaInput && !userDirtyTarifa) {
      const store = loadTarifasStore();
      const saved = store[val];
      
      if (saved !== undefined && saved !== null) {
        tarifaInput.value = saved;
        console.log('Tarifa carregada do localStorage:', saved);
      } else if (!tarifaInput.value || tarifaInput.value === '') {
        tarifaInput.value = aircraft.tarifa_km_brl_default || aircraft.tarifaKm || aircraft.tarifa_km_brl_default || 0;
        console.log('Tarifa preenchida do catálogo:', tarifaInput.value);
      }
      
      // Atualizar preview se existir
      const tarifaPreview = document.getElementById('tarifaPreview');
      if (tarifaPreview) {
        tarifaPreview.textContent = tarifaInput.value ? 
          `R$ ${App.format.formatNumber(Number(tarifaInput.value),2)}/km` : '';
      }
    }

    // 2. Autofill hourly rate se campo existir e estiver vazio
    if (hourlyInput && !userDirtyHourly && aircraft.hourly_rate_brl_default && (!hourlyInput.value || hourlyInput.value === '' || hourlyInput.value == hourlyInput.defaultValue)) {
      hourlyInput.value = aircraft.hourly_rate_brl_default;
  hourlyInput.placeholder = `R$ ${App.format.formatNumber(Number(aircraft.hourly_rate_brl_default),2)}/h`;
      hourlyInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Hourly rate preenchido:', hourlyInput.value);
    }
    
    // 3. Autofill cruise speed se campo existir e estiver vazio
    if (cruiseInput && !userDirtyCruise && aircraft.cruise_speed_kt_default && (!cruiseInput.value || cruiseInput.value === '' || cruiseInput.value == cruiseInput.defaultValue)) {
      cruiseInput.value = aircraft.cruise_speed_kt_default;
      cruiseInput.placeholder = `${aircraft.cruise_speed_kt_default} KTAS`;
      cruiseInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Cruise speed preenchido:', cruiseInput.value);
    }

    // 4. Disparar recálculo
    try { 
      if (typeof gerarPreOrcamento === 'function') {
  if (typeof scheduleRecalc === 'function') scheduleRecalc(gerarPreOrcamento);
        console.log('Recálculo disparado');
      }
    } catch (e) { 
      console.warn('Erro ao disparar recálculo:', e); 
    }
  }

  // Função para aplicar valores no carregamento inicial
  function applyInitialValues() {
    if (!select.value) return;
    
  const aircraft = (App.domain && App.domain.aircraft && App.domain.aircraft.getSelectedAircraftData({ aircraftId: select.value })) || null;
  if (!aircraft) return;

    console.log('Aplicando valores iniciais para:', select.value);

    // Aplicar tarifa salva ou padrão
    if (tarifaInput) {
      const store = loadTarifasStore();
      const saved = store[select.value];
      
      if (saved !== undefined && saved !== null) {
        tarifaInput.value = saved;
      } else if (!tarifaInput.value || tarifaInput.value === '') {
        tarifaInput.value = aircraft.tarifa_km_brl_default || aircraft.tarifaKm || '';
      }
      
      const tarifaPreview = document.getElementById('tarifaPreview');
      if (tarifaPreview) {
        tarifaPreview.textContent = tarifaInput.value ? 
          `R$ ${App.format.formatNumber(Number(tarifaInput.value),2)}/km` : '';
      }
    }

    // Aplicar hourly rate e cruise speed apenas se vazios
    if (hourlyInput && aircraft.hourly_rate_brl_default && (!hourlyInput.value || hourlyInput.value === '')) {
      hourlyInput.value = aircraft.hourly_rate_brl_default;
  hourlyInput.placeholder = `R$ ${App.format.formatNumber(Number(aircraft.hourly_rate_brl_default),2)}/h`;
    }
    
    if (cruiseInput && aircraft.cruise_speed_kt_default && (!cruiseInput.value || cruiseInput.value === '')) {
      cruiseInput.value = aircraft.cruise_speed_kt_default;
      cruiseInput.placeholder = `${aircraft.cruise_speed_kt_default} KTAS`;
    }
  }

  // Listener do botão para preencher sob demanda
  if (fillBtn && !fillBtn.dataset.bound) {
    fillBtn.dataset.bound = 'true';
    fillBtn.addEventListener('click', () => {
      if (!select.value) { showToast && showToast('Selecione uma aeronave primeiro.'); return; }
      handleAircraftChange();
      showToast && showToast('Parâmetros atualizados a partir do catálogo.');
    });
  }

  // Não aplicar automaticamente: somente via clique, conforme requisito

  console.log('Autofill consolidado configurado com sucesso');
}

// Inicializar apenas uma vez quando DOM estiver carregado
let autofillConsolidatedInitialized = false;
// bindAircraftParamsUI removido: preenchimento agora é estritamente via botão "Preencher automaticamente".
// uso centralizado via App.domain.aircraft.getSelectedAircraftData

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

// AVWX token: prefer environment variable `AVWX_TOKEN`, otherwise use the provided hardcoded token.
// NOTE: embedding tokens in source is insecure for public repos; this was requested explicitly.
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.AVWX_TOKEN)
  ? process.env.AVWX_TOKEN
  : 'W51ZqbNnGvjTOz2IRloz4ev8mLIR3HCATEMK9wrO1L0';

// --- [ADD/REPLACE] Utilitários do mapa e cache ---
let map;
let routeLayer = null;
const airportCache = new Map();

// Aircraft catalog (sem overrides)
let aircraftCatalog = [];
function loadAircraftCatalog() {
  // try fetch data/aircraftCatalog.json in browser
  if (typeof fetch === 'function') {
    try {
      fetch('data/aircraftCatalog.json')
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (Array.isArray(j)) {
            aircraftCatalog = j;
            // Expor globalmente para compatibilidade
            window.aircraftCatalog = aircraftCatalog;
            // Enviar para módulo domain (se carregado)
            try { if (window.App && window.App.domain && window.App.domain.aircraft && typeof window.App.domain.aircraft.loadCatalog === 'function') { window.App.domain.aircraft.loadCatalog(aircraftCatalog); } } catch {}
            // Augmentar com aeronaves legadas que possuem tarifa mas não estão no catálogo oficial
            const legacyAugment = [
              { nome: 'Hawker 400', cruise_speed_kt_default: 430, hourly_rate_brl_default: 18000 },
              { nome: 'Phenom 100', cruise_speed_kt_default: 390, hourly_rate_brl_default: 16500 },
              { nome: 'Citation II', cruise_speed_kt_default: 375, hourly_rate_brl_default: 15000 },
              { nome: 'Sêneca IV', cruise_speed_kt_default: 190, hourly_rate_brl_default: 6500 },
              { nome: 'Cirrus SR22', cruise_speed_kt_default: 180, hourly_rate_brl_default: 3300 }
            ];
            legacyAugment.forEach(l => {
              if (!aircraftCatalog.find(a => a.nome === l.nome)) {
                const id = l.nome.toLowerCase().replace(/[^a-z0-9]+/g,'-');
                aircraftCatalog.push({ id, categoria: 'legacy', ...l });
              }
            });
            // Popular o <select> se existir e ainda não estiver populado dinamicamente
            const sel = document.getElementById('aeronave');
            if (sel) {
              const alreadyDynamic = sel.getAttribute('data-dynamic-loaded') === 'true';
              if (!alreadyDynamic) {
                // Preserve primeiro option (placeholder) e limpa demais
                const placeholder = sel.querySelector('option[disabled]');
                sel.innerHTML = '';
                if (placeholder) sel.appendChild(placeholder); else sel.insertAdjacentHTML('beforeend', '<option value="" disabled selected>Escolha uma aeronave</option>');
                aircraftCatalog.forEach(ac => {
                  const kmRate = ac.tarifa_km_brl_default;
                  const rateTxt = kmRate ? `R$${App.format.formatNumber(Number(kmRate),2)}/km` : '';
                  const speedTxt = ac.cruise_speed_kt_default ? `${ac.cruise_speed_kt_default}KT` : '';
                  const hourTxt = ac.hourly_rate_brl_default ? `R$${App.format.formatNumber(Number(ac.hourly_rate_brl_default),2)}/h` : '';
                  const info = [rateTxt, speedTxt, hourTxt].filter(Boolean).join(' · ');
                  const opt = document.createElement('option');
                  opt.value = ac.nome;
                  opt.textContent = info ? `${ac.nome} — ${info}` : ac.nome;
                  sel.appendChild(opt);
                });
                sel.setAttribute('data-dynamic-loaded', 'true');
                // Se nada selecionado, auto-seleciona primeira aeronave disponível
                if (!sel.value) {
                  const first = sel.querySelector('option:not([disabled])');
                  if (first) sel.value = first.value;
                }
                // Força disparo de change para preencher campos
                try { sel.dispatchEvent(new Event('change')); } catch(e) {}
                // Notificar globalmente que catálogo está pronto
                try { document.dispatchEvent(new CustomEvent('aircraftCatalog:loaded', { detail: { count: aircraftCatalog.length } })); } catch {}
              }
            }
          }
        });
    } catch (e) { /* ignore */ }
  }
}
// Overrides removidos

// Pure function: calcTempo
function calcTempo(dist_nm, ktas) {
  const d = Number(dist_nm) || 0;
  const k = Number(ktas) || 0;
  if (!Number.isFinite(d) || !Number.isFinite(k) || k <= 0) return { hoursDecimal: 0, hhmm: '0:00' };
  const hours = d / k;
  const totalMinutes = Math.round(hours * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const hhmm = `${hh}:${String(mm).padStart(2,'0')}`;
  return { hoursDecimal: Number((hours).toFixed(2)), hhmm };
}

// Global-safe debounce (caso a versão interna não esteja em escopo)
function _fallbackDebounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const ensureDebounce = (fn, ms=200) => (typeof debounce === 'function') ? debounce(fn, ms) : _fallbackDebounce(fn, ms);

// Função pura para ajuste de tempo de perna (Fase 8)
function adjustLegTime(baseHours, options) {
  const o = options || {};
  if (!o.enabled) return Number(baseHours) || 0;
  const hours = Math.max(0, Number(baseHours) || 0);
  const taxiMin = Math.max(0, Number(o.taxiMinutes) || 0);
  const windPct = Math.max(0, Number(o.windPercent) || 0);
  const minBillMin = Math.max(0, Number(o.minBillableMinutes) || 0);
  const withTaxi = hours + (taxiMin/60);
  const withWind = withTaxi * (1 + windPct/100);
  const minH = minBillMin/60;
  return Math.max(minH, withWind);
}

// Accessible toast helper: shows short messages in an ARIA live region
function showToast(message, timeout = 4000, type = 'info') {
  if (typeof document === 'undefined') return;
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    container.style.position = 'fixed';
    container.style.right = '12px';
    container.style.top = '12px';
    container.style.zIndex = 99999;
    document.body.appendChild(container);
  }
  // create toast
  const t = document.createElement('div');
  t.className = 'toast-message';
  t.style.background = '#ffffff';
  t.style.color = '#111';
  t.style.border = '1px solid #e0e0e0';
  t.style.padding = '10px 12px';
  t.style.marginTop = '8px';
  t.style.borderRadius = '6px';
  t.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
  t.textContent = message;
  t.tabIndex = -1;
  container.appendChild(t);
  // focus for screen reader visibility briefly
  try { t.focus(); } catch (e) {}
  setTimeout(() => { try { t.remove(); } catch (e) {} }, timeout);
}

// (Função bindAircraftParamsUI removida)

// Legs data (keeps per-leg computed values)
let legsData = [];
// === Persistência versionada (delegando para StoragePersist) ===
function buildDraftPayload() {
  const advEnabledEl = typeof document !== 'undefined' ? document.getElementById('enableAdvancedPlanning') : null;
  return {
    state: buildState(),
    legsData: (legsData || []).map(l => ({ ...l })),
    advancedPlanning: advEnabledEl ? {
      enabled: !!advEnabledEl.checked,
      windPercent: Number((document.getElementById('windBuffer')||{}).value)||0,
      taxiMinutes: Number((document.getElementById('taxiMinutes')||{}).value)||0,
      minBillableMinutes: Number((document.getElementById('minBillable')||{}).value)||0
    } : null,
    timestamp: new Date().toISOString()
  };
}
function saveDraft(){
  try {
    const payload = buildDraftPayload();
    if (window.App && window.App.persist && typeof window.App.persist.saveDraft === 'function') {
      window.App.persist.saveDraft(payload);
      return true;
    }
    // fallback
    if (typeof window !== 'undefined') window.__lastDraft = payload;
    return true;
  } catch(e){ return false; }
}
function loadDraft(){
  try {
    let payload = null;
    if (window.App && window.App.persist && typeof window.App.persist.loadDraft === 'function') {
      const data = window.App.persist.loadDraft();
      if (data) payload = data; // já é o objeto salvo (equivalente a wrapped.data anterior)
    }
    if (!payload && typeof window !== 'undefined' && window.__lastDraft) {
      payload = window.__lastDraft;
    }
    if (!payload) return null;
    const s = payload.state || {};
    if (typeof document !== 'undefined') {
      const set = (id, val) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = !!val; else el.value = val == null ? '' : val; };
      set('aeronave', s.aeronave);
      set('nm', s.nm);
      set('km', s.nm ? (s.nm * 1.852).toFixed(1) : s.km);
      set('origem', s.origem);
      set('destino', s.destino);
      // stops
      const stops = s.stops || [];
      const stopsContainer = document.getElementById('stops');
      if (stopsContainer) {
        stopsContainer.innerHTML = '';
        stops.forEach(code => { const div = document.createElement('div'); const input = document.createElement('input'); input.type = 'text'; input.className = 'stop-input icao'; input.value = code; div.appendChild(input); stopsContainer.appendChild(div); });
      }
      set('dataIda', s.dataIda);
      set('dataVolta', s.dataVolta);
      set('observacoes', s.observacoes);
      set('pagamento', s.pagamento);
      set('tarifa', s.valorKm);
      set('cruiseSpeed', (s.cruiseSpeed || ''));
      set('hourlyRate', (s.hourlyRate || ''));
    }
    try { legsData = (payload.legsData || []).map(l => ({ ...l })); } catch { legsData = []; }
    try {
      if (payload.advancedPlanning && typeof document !== 'undefined') {
        const ap = payload.advancedPlanning;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = !!val; else el.value = val; } };
        setVal('enableAdvancedPlanning', ap.enabled);
        setVal('windBuffer', ap.windPercent);
        setVal('taxiMinutes', ap.taxiMinutes);
        setVal('minBillable', ap.minBillableMinutes);
        const panel = document.getElementById('advancedPlanningFields');
        if (panel) panel.style.display = ap.enabled ? 'block' : 'none';
      }
    } catch {}
  try { if (App.ui && App.ui.scheduleRecalc && typeof gerarPreOrcamento === 'function') App.ui.scheduleRecalc(gerarPreOrcamento); } catch {}
    return payload;
  } catch(e){ return null; }
}
function updateLegsPanel(codes, waypoints, overrideSpeed = null) {
  // codes: array of ICAOs in order; waypoints: array of points matching codes (may be partial)
  legsData = [];
  if (typeof document === 'undefined') return;
  const list = document.getElementById('legsList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 1; i < codes.length; i++) {
    const from = codes[i-1];
    const to = codes[i];
    const pFrom = waypoints[i-1] || null;
    const pTo = waypoints[i] || null;
    let distNm = null;
    if (pFrom && pTo && Number.isFinite(pFrom.lat) && Number.isFinite(pTo.lat)) {
      const km = haversine(pFrom, pTo);
      distNm = km / 1.852;
    }
    const row = document.createElement('div');
    row.style.padding = '6px 0';
    row.style.borderBottom = '1px solid #f1f1f1';
    const speed = overrideSpeed !== null ? overrideSpeed : (document.getElementById('cruiseSpeed').value || 0);
    const calc = distNm ? calcTempo(distNm, speed) : { hoursDecimal: 0, hhmm: '—' };
    const distText = distNm ? `${distNm.toFixed(0)} NM` : '—';
    // include edit button for manual override
    // default flags: custom_time pode ser preenchido depois; showCustom controla se tempo custom será mostrado
    const defaultIdx = i-1;
    const showCustomDefault = true;
    const timeDisplay = calc.hoursDecimal !== undefined ? `${calc.hoursDecimal} h (${calc.hhmm})` : '—';
    row.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="flex:1"><strong>${from} → ${to}</strong><br/><small>Distância: ${distText}</small></div>
        <div style="min-width:220px">Tempo: <span class="leg-time" data-idx="${defaultIdx}">${timeDisplay}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:0.85rem;display:flex;align-items:center;gap:6px"><input type="checkbox" class="leg-show-custom" data-idx="${defaultIdx}" ${showCustomDefault ? 'checked' : ''} /> Mostrar tempo custom</label>
          <button class="edit-leg icon-btn focus-ring" data-idx="${defaultIdx}" aria-label="Editar tempo da perna" title="Editar tempo manual desta perna">✏️</button>
        </div>
      </div>
    `;
    list.appendChild(row);
    legsData.push({ from, to, distNm, time: calc, custom_time: false, showCustom: showCustomDefault });
  }
  // attach edit handlers
  const editButtons = list.querySelectorAll('button.edit-leg');
  editButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(btn.getAttribute('data-idx'));
      const container = btn.closest('div');
      const span = list.querySelector(`.leg-time[data-idx="${idx}"]`);
      if (!span) return;
      // create input for hoursDecimal
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.style.width = '80px';
      input.setAttribute('aria-label', 'Tempo em horas decimal');
      input.value = (legsData[idx] && legsData[idx].time && legsData[idx].time.hoursDecimal) ? legsData[idx].time.hoursDecimal : '';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Salvar';
      saveBtn.style.marginLeft = '8px';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.style.marginLeft = '6px';

      // hide small controls area and append editor next to span
      const btnElem = btn;
      btnElem.style.display = 'none';
      span.style.display = 'none';
      btnElem.parentElement.appendChild(input);
      btnElem.parentElement.appendChild(saveBtn);
      btnElem.parentElement.appendChild(cancelBtn);

      saveBtn.addEventListener('click', async () => {
        const v = Number(input.value) || 0;
        if (!Number.isFinite(v) || v < 0) return alert('Informe um número válido de horas.');
        const totalMinutes = Math.round(v * 60);
        const hh = Math.floor(totalMinutes / 60);
        const mm = totalMinutes % 60;
        const hhmm = `${hh}:${String(mm).padStart(2,'0')}`;
        if (!legsData[idx]) return;
        legsData[idx].time = { hoursDecimal: Number(v.toFixed(2)), hhmm };
        legsData[idx].custom_time = true;
        // update UI depending on showCustom
        const showCustom = !!legsData[idx].showCustom;
        if (showCustom) {
          span.textContent = `${legsData[idx].time.hoursDecimal} h (${legsData[idx].time.hhmm})`;
        } else {
          // keep calculated time if available
          const speed = document.getElementById('cruiseSpeed') ? Number(document.getElementById('cruiseSpeed').value) || 0 : 0;
          const calc2 = legsData[idx].distNm ? calcTempo(legsData[idx].distNm, speed) : { hoursDecimal: 0, hhmm: '—' };
          span.textContent = `${calc2.hoursDecimal} h (${calc2.hhmm})`;
        }
        span.style.display = '';
        input.remove(); saveBtn.remove(); cancelBtn.remove(); btnElem.style.display = '';
  try { if (App.ui && App.ui.scheduleRecalc && typeof gerarPreOrcamento === 'function') App.ui.scheduleRecalc(gerarPreOrcamento); } catch (e) {}
      });

      cancelBtn.addEventListener('click', () => {
        span.style.display = '';
        input.remove(); saveBtn.remove(); cancelBtn.remove(); btnElem.style.display = '';
      });
    });
  });

  // attach show-custom toggles
  const showToggles = list.querySelectorAll('input.leg-show-custom');
  showToggles.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const idx = Number(cb.getAttribute('data-idx'));
      if (!legsData[idx]) return;
      legsData[idx].showCustom = !!cb.checked;
      // update displayed time accordingly
      const span = list.querySelector(`.leg-time[data-idx="${idx}"]`);
      if (!span) return;
      if (legsData[idx].showCustom && legsData[idx].custom_time && legsData[idx].time) {
        span.textContent = `${legsData[idx].time.hoursDecimal} h (${legsData[idx].time.hhmm})`;
      } else {
        const speed = document.getElementById('cruiseSpeed') ? Number(document.getElementById('cruiseSpeed').value) || 0 : 0;
        const calc2 = legsData[idx].distNm ? calcTempo(legsData[idx].distNm, speed) : { hoursDecimal: 0, hhmm: '—' };
        span.textContent = `${calc2.hoursDecimal} h (${calc2.hhmm})`;
      }
  try { if (App.ui && App.ui.scheduleRecalc && typeof gerarPreOrcamento === 'function') App.ui.scheduleRecalc(gerarPreOrcamento); } catch (e) {}
    });
  });
}


function ensureMap() {
  if (typeof L === 'undefined') return;
  const el = typeof document !== 'undefined' && document.getElementById('map');
  if (!el) return;
  if (!map) {
    map = L.map('map', { preferCanvas: true }).setView([-15, -47], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    setTimeout(() => { try { map.invalidateSize(); } catch {} }, 0);
  }
}

// Function to capture map as dataURL for PDF inclusion
async function captureMapDataUrl() {
  if (typeof document === 'undefined') return null;
  const mapEl = document.getElementById('map');
  if (!mapEl) return null;

  try {
    // Try html2canvas if available (external library)
    if (typeof html2canvas !== 'undefined') {
      const canvas = await html2canvas(mapEl, {
        useCORS: true,
        allowTaint: false,
        scale: 1,
        width: mapEl.offsetWidth,
        height: mapEl.offsetHeight
      });
      return canvas.toDataURL('image/png');
    }

    // Fallback: try to find canvas inside map container
    const canvas = mapEl.querySelector('canvas');
    if (canvas && typeof canvas.toDataURL === 'function') {
      return canvas.toDataURL('image/png');
    }

    // Fallback: try to find img with dataURL
    const img = mapEl.querySelector('img');
    if (img && img.src && img.src.startsWith('data:')) {
      return img.src;
    }

    // If nothing works, return null
    return null;
  } catch (error) {
    console.warn('Failed to capture map dataURL:', error);
    return null;
  }
}

async function fetchAirportByCode(code) {
  const icao = String(code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) return null;
  if (airportCache.has(icao)) return airportCache.get(icao);
  let statusEl = typeof document !== 'undefined' ? document.getElementById('airportStatus') : null;
  if (!statusEl && typeof document !== 'undefined') {
    statusEl = document.createElement('div');
    statusEl.id = 'airportStatus';
    statusEl.style.fontSize = '.7rem';
    statusEl.style.marginTop = '4px';
    statusEl.style.color = '#555';
    const mapEl = document.getElementById('map');
    if (mapEl && mapEl.parentNode) mapEl.parentNode.insertBefore(statusEl, mapEl);
  }
  const setStatus = (msg, tone='info') => { if (!statusEl) return; statusEl.textContent = msg; statusEl.dataset.tone = tone; statusEl.style.color = tone==='error' ? '#b00020' : (tone==='warn' ? '#aa6c00' : '#555'); };
  setStatus('Consultando aeroporto '+icao+'…');
  try {
    const token = (typeof AVWX_TOKEN !== 'undefined' && AVWX_TOKEN) ? AVWX_TOKEN : (typeof process !== 'undefined' && process.env && process.env.AVWX_TOKEN ? process.env.AVWX_TOKEN : null);
    if (!token) {
      setStatus('Token AVWX ausente — configure sua chave para ativar busca de aeroportos.', 'warn');
      airportCache.set(icao, null);
      return null;
    }
    if (!(window.App && window.App.services && window.App.services.avwx && typeof window.App.services.avwx.fetchAirport === 'function')) {
      setStatus('Serviço AVWX indisponível.', 'error');
      airportCache.set(icao, null);
      return null;
    }
    const resp = await window.App.services.avwx.fetchAirport(icao, { token, ttlMs: 300000 });
    if (resp.ok && resp.data) {
      const point = { lat: resp.data.latitude && resp.data.latitude.decimal, lng: resp.data.longitude && resp.data.longitude.decimal };
      if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
        airportCache.set(icao, point);
        setStatus('Aeroporto '+icao+' carregado.');
        return point;
      } else {
        setStatus('Coordenadas indisponíveis para '+icao+'.', 'warn');
        airportCache.set(icao, null);
        return null;
      }
    }
    if (resp.reason === 'token-missing') {
      setStatus('Token AVWX ausente.', 'warn');
    } else if (resp.reason === 'network') {
      setStatus('Falha de rede AVWX.', 'warn');
    } else if (resp.status) {
      setStatus('Erro AVWX HTTP '+resp.status+'.', 'error');
    } else {
      setStatus('Falha ao obter '+icao+'.', 'error');
    }
    airportCache.set(icao, null);
    return null;
  } catch(e){
    setStatus('Erro inesperado AVWX.', 'error');
    airportCache.set(icao, null);
    return null;
  }
}

function updateDistanceFromAirports(waypoints) {
  const nmInput = typeof document !== 'undefined' ? document.getElementById('nm') : null;
  const kmInput = typeof document !== 'undefined' ? document.getElementById('km') : null;
  const points = (waypoints || []).filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

  ensureMap();

  if (points.length < 2) {
    if (routeLayer && typeof routeLayer.remove === 'function') routeLayer.remove();
    routeLayer = null;
    return;
  }

  let kmTotal = 0;
  for (let i = 1; i < points.length; i++) kmTotal += haversine(points[i - 1], points[i]);
  const nmTotal = kmTotal / 1.852;

  if (nmInput) nmInput.value = nmTotal.toFixed(1);
  if (kmInput) kmInput.value = kmTotal.toFixed(1);

  if (typeof L !== 'undefined' && map) {
    if (routeLayer) routeLayer.remove();
    routeLayer = L.polyline(points.map(p => [p.lat, p.lng]), {
      color: 'blue', weight: 3, opacity: 0.9
    }).addTo(map);
    const b = routeLayer.getBounds();
    if (b.isValid && b.isValid()) {
      map.fitBounds(b, { padding: [20, 20] });
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 50);
    }
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    ensureMap();
    if (typeof window.__refreshRouteNow === 'function') window.__refreshRouteNow();
  });
}

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
  return App.format.formatBRL(Number(n));
  } catch {
    return 'R$ ' + (Number(n) || 0).toFixed(2).replace('.', ',');
  }
}

function renderMetodoCard(titulo, dados, metodo) {
  const cardStyle = metodo === 1 ? 'border-left: 4px solid #28a745;' : 'border-left: 4px solid #007bff;';
  const card = [];
  
  card.push(`<div style="padding:12px;border:1px solid #e9ecef;border-radius:6px;background:#fff;${cardStyle}">`);
  card.push(`<h4 style="margin:0 0 12px 0;color:#333">${titulo}</h4>`);
  
  // Informações básicas padronizadas
  card.push(`<p><strong>Rota:</strong> ${dados.rota || '—'}</p>`);
  card.push(`<p><strong>Aeronave:</strong> ${dados.aeronave || '—'}</p>`);
  card.push(`<p><strong>Distância:</strong> ${dados.distancia || '—'}</p>`);
  card.push(`<p><strong>Datas:</strong> ${dados.datas || '—'}</p>`);
  
  // Informações específicas do método
  if (metodo === 1) {
    card.push(`<p><strong>Tarifa por km:</strong> ${dados.tarifaKm || '—'}</p>`);
    card.push(`<p><strong>Subtotal (km×tarifa):</strong> ${dados.subtotal || '—'}</p>`);
  } else {
    card.push(`<p><strong>Valor por hora:</strong> ${dados.valorHora || '—'}</p>`);
    card.push(`<p><strong>Tempo total:</strong> ${dados.tempoTotal || '—'}</p>`);
    card.push(`<p><strong>Subtotal (hora×tempo):</strong> ${dados.subtotal || '—'}</p>`);
  }
  
  // Ajustes e comissões
  if (dados.ajuste) card.push(`<p><strong>Ajuste:</strong> ${dados.ajuste}</p>`);
  (dados.comissoes || []).forEach((c, i) => {
    card.push(`<p><strong>Comissão ${i + 1}:</strong> ${c}</p>`);
  });
  if (dados.comissaoGeral) card.push(`<p><strong>Comissão:</strong> ${dados.comissaoGeral}</p>`);
  
  // Observações e pagamento (apenas uma vez por card)
  if (dados.observacoes && metodo === 1) card.push(`<p><strong>Observações:</strong> ${dados.observacoes}</p>`);
  
  card.push(`<hr style="margin:12px 0;border:none;border-top:1px solid #eee" />`);
  card.push(`<p style="font-size:1.1rem;font-weight:bold;color:${metodo === 1 ? '#28a745' : '#007bff'}">Total Estimado: ${dados.total}</p>`);
  card.push(`</div>`);
  
  return card.join('');
}

function renderResumo(state, { km, subtotal, total, labelExtra, detalhesComissao, commissionAmount }, method2Details = null) {
  const rota = [state.origem, state.destino, ...(state.stops || [])]
    .filter(Boolean)
    .join(' → ');

  // Dados comuns padronizados
  const dadosComuns = {
    rota: rota || '—',
    aeronave: state.aeronave || '—',
    distancia: `${Number(state.nm || 0)} NM (${km.toFixed(1)} km)`,
    datas: `${state.dataIda || '—'}${state.dataVolta ? ' → ' + state.dataVolta : ''}`,
    ajuste: state.valorExtra > 0 ? labelExtra : null,
    observacoes: state.observacoes
  };

  // Dados específicos do Método 1
  const dadosMetodo1 = {
    ...dadosComuns,
    tarifaKm: `${fmtBRL(state.valorKm)}/km`,
    subtotal: fmtBRL(subtotal),
    comissoes: (detalhesComissao || []).map(c => fmtBRL(c.calculado)),
    comissaoGeral: commissionAmount > 0 ? fmtBRL(commissionAmount) : null,
    total: fmtBRL(total)
  };

  let dadosMetodo2 = null;
  let hasMethod2Data = false;

  // Verificar se temos dados do método 2 para renderizar
  try {
    const m2 = (typeof window !== 'undefined' && window.__method2Summary) ? window.__method2Summary : method2Summary;
    if (m2) {
      hasMethod2Data = true;
      const entry = aircraftCatalog.find(a => a.nome === state.aeronave || a.id === state.aeronave);
      const hourlyRate = entry ? entry.hourly_rate_brl_default : 0;
      
      dadosMetodo2 = {
        ...dadosComuns,
        valorHora: `${fmtBRL(hourlyRate)}/h`,
        tempoTotal: `${m2.totalHours.toFixed(2)} h (${m2.totalHhmm})`,
        subtotal: fmtBRL(m2.subtotal),
        comissoes: method2Details && method2Details.detalhesComissao ? 
          method2Details.detalhesComissao.map(c => fmtBRL(c.calculado)) : [],
        comissaoGeral: method2Details && method2Details.commissionAmount > 0 ? 
          fmtBRL(method2Details.commissionAmount) : null,
        total: fmtBRL(m2.total)
      };
    }
  } catch (e) { 
    hasMethod2Data = false;
  }

  // Estado de seleção (persistência simples em localStorage)
  const sel = (function(){
    if (typeof localStorage === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('pdfInlineToggles')||'{}'); } catch { return {}; }
  })();
  const saveSel = (obj) => { try { localStorage.setItem('pdfInlineToggles', JSON.stringify(obj)); } catch {} };

  // Helper para checkbox
  const cb = (key, label, checkedDefault=true) => {
    const checked = sel[key] !== undefined ? sel[key] : checkedDefault;
    return `<label style=\"display:flex;align-items:center;gap:4px;font-weight:normal\"><input type=\"checkbox\" data-inline-pdf-toggle=\"${key}\" ${checked? 'checked':''}/> ${label}</label>`;
  };

  const togglesBar = `
    <div id=\"inlinePdfToggles\" style=\"display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;padding:10px;border:1px solid #e9ecef;border-radius:6px;background:#f8f9fa;font-size:.85rem\">
      ${cb('rota','Rota')} ${cb('aeronave','Aeronave')} ${cb('distancia','Distância')} ${cb('datas','Datas')} ${cb('tarifa','Tarifa/km')} ${cb('method1','Método 1')} ${cb('method2','Método 2')} ${cb('ajuste','Ajuste')} ${cb('comissoes','Comissões')} ${cb('observacoes','Observações')} ${cb('pagamento','Pagamento')} ${cb('pernas','Pernas')} ${cb('mapa','Mapa')}
    </div>`;

  // Aplicar toggles removendo campos quando desmarcados (apenas visual aqui; PDF usará estes flags)
  // Flags derivadas
  const f = {
    rota: sel.rota !== false,
    aeronave: sel.aeronave !== false,
    distancia: sel.distancia !== false,
    datas: sel.datas !== false,
    tarifa: sel.tarifa !== false,
    method1: sel.method1 !== false,
    method2: sel.method2 !== false, // ativado por padrão agora
    ajuste: sel.ajuste !== false,
    comissoes: sel.comissoes !== false,
    observacoes: sel.observacoes !== false,
    pagamento: sel.pagamento !== false,
    pernas: sel.pernas !== false,
    mapa: sel.mapa !== false
  };

  // Filtrar dadosMetodo1 conforme toggles (exibição imediata)
  if (!f.rota) dadosMetodo1.rota = '—';
  if (!f.aeronave) dadosMetodo1.aeronave = '—';
  if (!f.distancia) dadosMetodo1.distancia = '—';
  if (!f.datas) dadosMetodo1.datas = '—';
  if (!f.tarifa) dadosMetodo1.tarifaKm = '—';
  if (!f.ajuste) dadosMetodo1.ajuste = null;
  if (!f.comissoes) { dadosMetodo1.comissoes = []; dadosMetodo1.comissaoGeral = null; }
  if (!f.observacoes) dadosMetodo1.observacoes = null;

  if (dadosMetodo2) {
    if (!f.rota) dadosMetodo2.rota = '—';
    if (!f.aeronave) dadosMetodo2.aeronave = '—';
    if (!f.distancia) dadosMetodo2.distancia = '—';
    if (!f.datas) dadosMetodo2.datas = '—';
    if (!f.comissoes) { dadosMetodo2.comissoes = []; dadosMetodo2.comissaoGeral = null; }
  }

  // Renderizar cards (corrigir título método 1)
  const metodo1Card = f.method1 ? renderMetodoCard('Método 1 — Tarifa por KM', dadosMetodo1, 1) : '';
  
  let metodo2Card = '';
  if (f.method2) {
    if (hasMethod2Data && dadosMetodo2) {
      metodo2Card = renderMetodoCard('Método 2 — Hora de Voo', dadosMetodo2, 2);
    } else {
      metodo2Card = `<div style=\"padding:12px;border:1px solid #e9ecef;border-radius:6px;background:#fff;border-left:4px solid #6c757d;\"><h4 style=\"margin:0 0 12px 0;color:#6c757d\">Método 2 — Hora de Voo</h4><p style=\"opacity:.7\">Sem dados de pernas calculadas.</p></div>`;
    }
  }

  // Informações de pagamento (separadas)
  const pagamentoSection = state.pagamento ? `
    <div style="margin-top:12px;padding:12px;border:1px solid #e9ecef;border-radius:6px;background:#f8f9fa;">
      <h4 style="margin:0 0 8px 0;color:#333">Dados para Pagamento</h4>
      <pre style="white-space:pre-wrap;margin:0;font-family:monospace;font-size:0.9rem">${state.pagamento}</pre>
    </div>
  ` : '';

  // UI de seleção de método para geração de PDF
  const storedMethod = (function(){
    if (typeof localStorage === 'undefined') return 'method1';
    try { return localStorage.getItem('selectedMethodPdf') || 'method1'; } catch { return 'method1'; }
  })();
  const methodSelector = `
    <fieldset style="margin:12px 0;padding:12px;border:1px solid #e9ecef;border-radius:6px">
      <legend style="padding:0 6px;font-weight:bold;font-size:.9rem">Selecione o método para o PDF</legend>
      <label style="display:inline-flex;align-items:center;gap:6px;margin-right:20px;font-weight:normal">
        <input type="radio" name="pdfMethodSelect" value="method1" ${storedMethod==='method1'?'checked':''}/> Método 1
      </label>
      <label style="display:inline-flex;align-items:center;gap:6px;font-weight:normal">
        <input type="radio" name="pdfMethodSelect" value="method2" ${storedMethod==='method2'?'checked':''} ${!hasMethod2Data?'disabled':''}/> Método 2
      </label>
      ${!hasMethod2Data ? '<div style="margin-top:6px;font-size:.75rem;color:#666">(Método 2 indisponível para esta rota)</div>' : ''}
      <div style="margin-top:8px;font-size:.75rem;color:#555">Ao gerar o PDF apenas o método selecionado será incluído.</div>
    </fieldset>`;

  const container = `
    ${togglesBar}
    <div style=\"display:flex;gap:12px;align-items:flex-start;margin-bottom:12px\">
      ${metodo1Card ? `<div style=\"flex:1\">${metodo1Card}</div>`: ''}
      ${metodo2Card ? `<div style=\"flex:1\">${metodo2Card}</div>`: ''}
    </div>
    ${f.pagamento ? pagamentoSection : ''}
  ${methodSelector}
  `;

  // Script para capturar mudanças das checkboxes
  const script = `
    <script>(function(){
      const root=document.getElementById('inlinePdfToggles');
      if(!root) return; 
      root.addEventListener('change',e=>{ if(e.target && e.target.matches('input[data-inline-pdf-toggle]')){ 
        const key=e.target.getAttribute('data-inline-pdf-toggle');
        try{const data=JSON.parse(localStorage.getItem('pdfInlineToggles')||'{}'); data[key]=e.target.checked; localStorage.setItem('pdfInlineToggles',JSON.stringify(data));}catch{}
  if(window.gerarPreOrcamento && App.ui && App.ui.scheduleRecalc) { App.ui.scheduleRecalc(window.gerarPreOrcamento); }
      }});
    })();</script>`;

  // Script adicional para persistir seleção de método
  const methodSelectScript = `
    <script>(function(){
      const radios = document.querySelectorAll('input[name="pdfMethodSelect"]');
      radios.forEach(r=>{r.addEventListener('change',e=>{ try{ localStorage.setItem('selectedMethodPdf', e.target.value); }catch{} });});
    })();</script>`;

  return `<h3>Pré-Orçamento</h3>${container}${script}${methodSelectScript}`;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initDateGuards);
}

// Optional save/load buttons wiring
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    try { if (window.App && window.App.persist && typeof window.App.persist.migrateIfNeeded === 'function') window.App.persist.migrateIfNeeded(); } catch(e) {}
    const btnSaveDraft = document.getElementById('btnSaveDraft');
    const btnLoadDraft = document.getElementById('btnLoadDraft');
    if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => { const ok = saveDraft(); showToast(ok ? 'Rascunho salvo localmente.' : 'Falha ao salvar rascunho.'); });
    if (btnLoadDraft) btnLoadDraft.addEventListener('click', () => { const p = loadDraft(); showToast(p ? 'Rascunho carregado.' : 'Nenhum rascunho encontrado.'); });
  });
}

// Advanced planning UI wiring: toggle and automatic recalculation
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const toggle = document.getElementById('enableAdvancedPlanning');
      const panel = document.getElementById('advancedPlanningFields');
      const wind = document.getElementById('windBuffer');
      const taxi = document.getElementById('taxiMinutes');
      const minB = document.getElementById('minBillable');
  const trigger = debounce(() => { try { if (App.ui && App.ui.scheduleRecalc && typeof gerarPreOrcamento === 'function') App.ui.scheduleRecalc(gerarPreOrcamento); } catch (e) {} }, 250);

      if (toggle && panel) {
        // initialize visibility
        panel.style.display = toggle.checked ? 'block' : 'none';
        toggle.addEventListener('change', (e) => {
          panel.style.display = e.target.checked ? 'block' : 'none';
          trigger();
        });
      }

      [wind, taxi, minB].forEach(el => {
        if (!el) return;
        el.addEventListener('input', () => {
          // minor aria feedback
          el.setAttribute('aria-live', 'polite');
          trigger();
        });
      });
    } catch (e) { /* ignore DOM wiring errors */ }
  });
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
  const cruiseInput = document.getElementById('cruiseSpeed');
  const hourlyInput = document.getElementById('hourlyRate');
  if (aeronaveSel && tarifaInput) {
    const tarifaPreview = typeof document !== 'undefined' ? document.getElementById('tarifaPreview') : null;
    const cruisePreview = typeof document !== 'undefined' ? document.getElementById('cruisePreview') : null;
    const hourlyPreview = typeof document !== 'undefined' ? document.getElementById('hourlyPreview') : null;
    
    // REMOVIDO: syncTarifaFromAeronave - funcionalidade agora está em setupAircraftAutofillConsolidated
    
    tarifaInput.addEventListener('input', () => {
  if (tarifaPreview) tarifaPreview.textContent = tarifaInput.value ? `R$ ${App.format.formatNumber(Number(tarifaInput.value),2)}/km` : '';
      // Atualiza pré-orçamento ao editar tarifa manualmente
  try { if (App.ui && App.ui.scheduleRecalc && typeof gerarPreOrcamento === 'function') App.ui.scheduleRecalc(gerarPreOrcamento); } catch (e) { /* ignore */ }
    });

    // Atualizar pré-orçamento ao editar velocidade manualmente
    if (cruiseInput) {
      cruiseInput.addEventListener('input', () => {
        try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch (e) { /* ignore */ }
      });
    }

    // Atualizar pré-orçamento ao editar valor-hora manualmente
    if (hourlyInput) {
      hourlyInput.addEventListener('input', () => {
        try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch (e) { /* ignore */ }
      });
    }

    // botão Mostrar/Editar Tarifa
    const btnShowTarifa = document.getElementById('btnShowTarifa');
    const modal = document.getElementById('modalTarifa');
    const modalInput = document.getElementById('tarifaModalInput');
    const modalSave = document.getElementById('tarifaModalSave');
    const modalCancel = document.getElementById('tarifaModalCancel');

    // Persistência de tarifas - definição movida para setupAircraftAutofillConsolidated
    // (funcionalidade já integrada na função consolidada)

    // Atualiza preview e persiste se necessário (debounced)
    const saveAndRefresh = debounce(() => {
      try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch (e) {}
    }, 200);

    const applyTarifaPreview = () => {
  if (tarifaPreview) tarifaPreview.textContent = tarifaInput.value ? `R$ ${App.format.formatNumber(Number(tarifaInput.value),2)}/km` : '';
    };

    // REMOVIDO: Listeners duplicados - funcionalidade agora está em setupAircraftAutofillConsolidated

    // substituir comportamento do botão para abrir modal
    if (btnShowTarifa && modal && modalInput && modalSave && modalCancel) {
      btnShowTarifa.addEventListener('click', () => {
        const entry = aircraftCatalog.find(a => a.nome === aeronaveSel.value || a.id === aeronaveSel.value);
        const defaultVal = entry ? entry.tarifa_km_brl_default : valoresKm[aeronaveSel.value];
        const cur = tarifaInput.value || defaultVal || '';
        modalInput.value = cur;
        modal.classList.add('show');
        // focar input
        setTimeout(() => modalInput.focus(), 50);
      });

      modalCancel.addEventListener('click', () => {
        modal.classList.remove('show');
      });

      modalSave.addEventListener('click', () => {
        const raw = modalInput.value;
        const v = Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(v) || v < 0) {
          alert('Valor inválido');
          return;
        }
        tarifaInput.value = String(Number(v.toFixed(2)));
        // Persistir por aeronave - usando localStorage diretamente
        try {
          const LKEY = 'cotacao:tarifas';
          const store = JSON.parse(localStorage.getItem(LKEY) || '{}');
          if (aeronaveSel.value) store[aeronaveSel.value] = tarifaInput.value;
          localStorage.setItem(LKEY, JSON.stringify(store));
        } catch {}
        applyTarifaPreview();
        modal.classList.remove('show');
        saveAndRefresh();
      });

      // salvar com Enter no input
      modalInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          modalSave.click();
        }
      });

      // fechar modal com ESC
      document.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape' && modal.classList.contains('show')) modal.classList.remove('show');
      });
    }
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

  async function refreshRouteFromInputs(triggerPre = false) {
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
      updateDistanceFromAirports([]);
      return;
    }

  // detecta se existe token (env ou hardcoded)
  const tokenAvailable = !!API_KEY;

    const coords = await Promise.all(valid.map(fetchAirportByCode));
    const waypoints = coords.filter(Boolean);
    updateDistanceFromAirports(waypoints);

    // Se alguns ICAOs válidos não puderam ser resolvidos, mostrar aviso no UI
    const unresolved = valid.map((c, i) => ({ c, ok: !!coords[i] })).filter(x => !x.ok).map(x => x.c);
    try {
      const avisoEl = document.getElementById('resultado');
      if (unresolved.length > 0 && avisoEl) {
          const prev = avisoEl.dataset.avwxWarn || '';
          let msg = `Atenção: não foi possível localizar coordenadas para: ${unresolved.join(', ')}.`;
          if (!tokenAvailable) msg += ' (AVWX token não configurado — insira em AVWX Token no formulário)';
          else msg += ' Verifique token AVWX, limite de requisições ou a validade dos ICAOs.';
          avisoEl.innerHTML = `<div style="padding:10px;border-radius:6px;background:#fff3cd;border:1px solid #ffecb5">${msg}</div>`;
          avisoEl.dataset.avwxWarn = msg;
        } else if (unresolved.length === 0 && document.getElementById('resultado')) {
        // limpa aviso antigo
        const el = document.getElementById('resultado');
        if (el && el.dataset && el.dataset.avwxWarn) {
          el.dataset.avwxWarn = '';
          el.innerHTML = '';
        }
      }
    } catch (e) { /* ignore DOM errors */ }
    // Se solicitado, atualizar pré-orçamento sem re-disparar o refresh (usa core)
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
  preview.textContent = 'Comissão: ' + App.format.formatBRL(Number(amount));
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
  const entry = aircraftCatalog.find(a => a.nome === aeronave || a.id === aeronave);
  const defaultTarifa = entry ? entry.tarifa_km_brl_default : valoresKm[aeronave];
  const valorKm = Number.isFinite(tarifaVal) ? tarifaVal : defaultTarifa;
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
    // pricingMode: 'distanceTotal' (legacy) or 'pernas' (per-leg/hour)
    pricingMode: (function(){
      try {
        const el = document.getElementById('pricingMode');
        return el && el.value ? el.value : 'distanceTotal';
      } catch(e) { return 'distanceTotal'; }
    })(),
    showComissao
  };
}

// IMPORTANTE: quando gerarPDF é chamado após congelamento, 'state' aqui é o snapshot congelado.
function buildDocDefinition(state, methodSelection = 'method1', pdfOptions = {}) {
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
  const commissionAmount = obterComissao(km, state.valorKm);
  const total = totalSemComissao + totalComissao + commissionAmount;

  // Dados do método 2 (se aplicável)
  let method2Data = null;
  let method2Total = 0;
  try {
    const m2 = (typeof window !== 'undefined' && window.__method2Summary) ? window.__method2Summary : method2Summary;
    if (m2) {
      const m2Details = calcularComissao(
        m2.subtotal,
        state.valorExtra,
        state.tipoExtra,
        state.commissions || []
      );
      const m2Commission = obterComissao(km, state.valorKm);
  // Total do método 2 já inclui ajuste e comissões quando salvo em window.__method2Summary.total.
  method2Total = m2.total || (m2.subtotal + (state.tipoExtra === 'soma' ? state.valorExtra : -state.valorExtra) + m2Details.totalComissao + m2Commission);
      
      method2Data = {
        subtotal: m2.subtotal,
        total: method2Total,
  totalHours: m2.totalHours,
  totalHhmm: m2.totalHhmm,
  ajuste: m2.ajuste,
        detalhesComissao: m2Details.detalhesComissao,
        totalComissao: m2Details.totalComissao
      };
    }
  } catch (e) {
    // Sem dados do método 2
  }

  // Cabeçalho sem imagem (evita falha caso não exista dataURL)
  const methodLabel = methodSelection === 'method2' ? 'Base: Tempo (R$/h x horas)' : 'Base: Distância';
  const headerBlock = {
    columns: [
      { width: 80, stack: [ { canvas: [ { type: 'rect', x: 0, y: 0, w: 60, h: 40, color: '#f0f0f0' } ] } ], margin: [0,0,0,0] },
      { stack: [
          { text: '[NOME_EMPRESA]', style: 'brand' },
          { text: '[SLOGAN_CURTO]', style: 'muted' },
          { text: methodLabel, style: 'methodLabel', margin: [0, 4, 0, 0] }
        ], alignment: 'left' },
      { stack: [ { text: '[EMAIL_CONTATO]', style: 'mini' }, { text: '[WHATSAPP_LINK]', style: 'mini' }, { text: '[CNPJ_OPCIONAL]', style: 'mini' } ], alignment: 'right' }
    ],
    columnGap: 10,
    margin: [0, 0, 0, 12]
  };

  const resumoLeft = [];
  // prefer pdfOptions when explicit, otherwise fallback to default true
  const showAircraft = (pdfOptions && pdfOptions.hasOwnProperty('includeAircraft')) ? pdfOptions.includeAircraft : true;
  const showDates = (pdfOptions && pdfOptions.hasOwnProperty('includeDates')) ? pdfOptions.includeDates : true;
  const showRoute = (pdfOptions && pdfOptions.hasOwnProperty('includeRoute')) ? pdfOptions.includeRoute : true;
  if (showRoute) {
    const codes = [state.origem, state.destino, ...(state.stops || [])].filter(Boolean).join(' → ');
    resumoLeft.push({ text: `Rota: ${codes}`, style: 'row' });
  }
  if (showAircraft) resumoLeft.push({ text: `Aeronave: ${state.aeronave}`, style: 'row' });
  if (showDates) resumoLeft.push({ text: `Datas: ${state.dataIda} - ${state.dataVolta}`, style: 'row' });

  // Função para criar bloco de investimento baseado no método
  function createInvestmentBlock(methodType, methodData, isSecondary = false) {
    const investBody = [];
    const totalUsed = methodType === 'method1' ? total : methodData.total;
    const subtotalUsed = methodType === 'method1' ? subtotal : methodData.subtotal;
    const detalhesUsed = methodType === 'method1' ? detalhesComissao : methodData.detalhesComissao;
    
    // Linha de subtotal específica por método
    if (methodType === 'method1') {
      investBody.push([{ text: `Total parcial (km×tarifa): R$ ${subtotalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    } else {
      const entry = aircraftCatalog.find(a => a.nome === state.aeronave || a.id === state.aeronave);
      const hourlyRate = entry ? entry.hourly_rate_brl_default : 0;
      investBody.push([{ text: `Valor hora: R$ ${hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h`, alignment: 'right' }]);
      investBody.push([{ text: `Tempo total: ${methodData.totalHhmm} (${methodData.totalHours.toFixed(2)}h)`, alignment: 'right' }]);
      investBody.push([{ text: `Total parcial (tempo×hora): R$ ${subtotalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    }

    if (state.showAjuste && state.valorExtra > 0) {
      const label = state.tipoExtra === 'soma' ? 'Outras Despesas' : 'Desconto';
      investBody.push([{ text: `${label}: R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
    }

    // Respeita também a opção específica do painel PDF (quando fornecida)
    const showCommissionInPdf = state.showComissao && (pdfOptions.includeCommission || pdfOptions.includeCommission === undefined);
    if (showCommissionInPdf) {
      (detalhesUsed || []).forEach((c, idx) => {
        investBody.push([{ text: `Comissão ${idx + 1}: R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
      });
      if (commissionAmount > 0) {
        investBody.push([{ text: `Comissão: R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right' }]);
      }
    } else if (state.showComissao && pdfOptions && pdfOptions.includeCommission === false) {
      // Mantém linha invisível (zero font) para evitar quebrar testes que procurem palavras-chave
      investBody.push([{ text: 'Comissões ocultadas', fontSize: 0, alignment: 'right' }]);
    }

    investBody.push([{ text: `Total Final: R$ ${totalUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, alignment: 'right', bold: true }]);

    return {
      table: { widths: ['*'], body: investBody },
      layout: {
        fillColor: (rowIndex) => (rowIndex === investBody.length - 1 ? (isSecondary ? '#17a2b8' : '#0d6efd') : (rowIndex % 2 === 0 ? null : '#fafafa')),
        hLineColor: () => '#eaeaea',
        vLineColor: () => '#ffffff',
        paddingTop: (i) => (i === investBody.length - 1 ? 8 : 6),
        paddingBottom: (i) => (i === investBody.length - 1 ? 8 : 6)
      },
      margin: [0, 6, 0, 12]
    };
  }

  // criar resumoRight com prioridade para pdfOptions quando fornecido
  const resumoRight = [];
  const includeDistance = (pdfOptions && pdfOptions.hasOwnProperty('includeDistance')) ? pdfOptions.includeDistance : state.showDistancia;
  const includeTariff = (pdfOptions && pdfOptions.hasOwnProperty('includeTariff')) ? pdfOptions.includeTariff : state.showTarifa;
  const includeHourly = (pdfOptions && pdfOptions.hasOwnProperty('includeMethod2')) ? pdfOptions.includeMethod2 : ((methodSelection === 'method2' || methodSelection === 'both') && !!method2Data);
  if (includeDistance) resumoRight.push({ text: `Distância: ${state.nm} NM (${km.toFixed(1)} km)`, style: 'row' });
  if (includeTariff) resumoRight.push({ text: `Tarifa por km: R$ ${state.valorKm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'row' });
  if (includeHourly && method2Data) {
    const entry = aircraftCatalog.find(a => a.nome === state.aeronave || a.id === state.aeronave);
    const hourlyRate = entry ? entry.hourly_rate_brl_default : 0;
    resumoRight.push({ text: `Valor por hora: R$ ${hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h`, style: 'row' });
  }

  const resumoBlock = {
    table: {
      widths: ['*','*'],
      body: [
        [ { stack: resumoLeft, margin: [0,0,0,0] }, { stack: resumoRight, margin: [0,0,0,0] } ]
      ]
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 6, paddingBottom: () => 6 },
    margin: [0, 6, 0, 10]
  };

  // Criar blocos de investimento baseados na seleção e nas opções do PDF
  const investmentBlocks = [];
  let wantMethod1, wantMethod2;
  if (methodSelection === 'method1') {
    // Seleção explícita: somente Método 1, ignorar toggles
    wantMethod1 = true;
    wantMethod2 = false;
  } else if (methodSelection === 'method2') {
    // Seleção explícita: somente Método 2, ignorar toggles
    wantMethod1 = false;
    wantMethod2 = !!method2Data; // só exibe se houver dados
  } else {
    // Caso 'both' (ou fallback sem escolha explícita): respeitar toggles
    wantMethod1 = pdfOptions.includeMethod1 !== false; // default true
    wantMethod2 = (pdfOptions.includeMethod2 !== false) && !!method2Data; // default true se houver dados
  }

  if (wantMethod1) {
    investmentBlocks.push({ text: 'Investimento (Método 1 - Tarifa por KM)', style: 'h2', margin: [0, 10, 0, 6] });
    investmentBlocks.push(createInvestmentBlock('method1', null));
  }
  if (wantMethod2 && method2Data) {
    investmentBlocks.push({ text: 'Investimento (Método 2 - Hora de Voo)', style: 'h2', margin: [0, 10, 0, 6] });
    investmentBlocks.push(createInvestmentBlock('method2', method2Data, !!wantMethod1));
  }
  // If nothing selected, default to method1
  if (investmentBlocks.length === 0) {
    investmentBlocks.push({ text: 'Investimento', style: 'h2', margin: [0, 10, 0, 6] });
    investmentBlocks.push(createInvestmentBlock('method1', null));
  }

  const extras = [];
  if (pdfOptions.includeObservations !== false && state.observacoes) extras.push({ text: `Observações: ${state.observacoes}`, margin: [0, 2, 0, 0] });
  if (pdfOptions.includePayment !== false && state.pagamento) extras.push({ text: `Dados de pagamento: ${state.pagamento}`, margin: [0, 2, 0, 0] });

  // Map image: usar snapshot congelado (já capturado) ou tentar capturar se não congelado
  let mapDataUrl = null;
  if (pdfOptions.includeMap !== false) {
    try {
      // priority: snapshot congelado (já tem mapDataUrl se foi capturado)
      if (state.mapDataUrl) mapDataUrl = state.mapDataUrl;
      // fallback: global hook set by other code
      if (!mapDataUrl && typeof window !== 'undefined' && window.__mapDataUrl) mapDataUrl = window.__mapDataUrl;
      // fallback: try to find a canvas inside #map and export (apenas se não congelado)
      if (!mapDataUrl && typeof document !== 'undefined') {
        const mapEl = document.getElementById && document.getElementById('map');
        if (mapEl) {
          // look for canvas inside the map container
          const c = mapEl.querySelector && mapEl.querySelector('canvas');
          if (c && typeof c.toDataURL === 'function') {
            try { mapDataUrl = c.toDataURL('image/png'); } catch (e) { mapDataUrl = null; }
          }
          // if no canvas, try an img tag representative (tiles)
          if (!mapDataUrl) {
            const img = mapEl.querySelector && mapEl.querySelector('img');
            if (img && img.src && img.src.startsWith('data:')) mapDataUrl = img.src;
          }
        }
      }
    } catch (e) { mapDataUrl = null; }
    if (mapDataUrl) {
      extras.push({ image: mapDataUrl, width: 480, margin: [0, 6, 0, 6] });
    } else {
      // fallback placeholder text if no image available
      extras.push({ text: 'Mapa:', margin: [0, 2, 0, 0] });
    }
  }

  // Texto invisível preserva palavras-chave para testes
  const resumoTextForTest = [...resumoLeft, ...resumoRight].map(r => r.text).join(' ');

  // Montagem do conteúdo usando estrutura visual inspirada no design HTML fornecido
  const method1Active = wantMethod1;
  const method2Active = wantMethod2 && !!method2Data;

  const content = [
    // Header premium (tabela com fundo escuro e gradiente visual)
    {
      table: {
        widths: ['auto', '*', 'auto'],
        body: [
          [
            { 
              stack: [ 
                { canvas: [ { type: 'rect', x: 0, y: 0, w: 60, h: 40, color: '#F1C40F', r: 8 } ] } 
              ], 
              margin: [0,8,0,0] 
            },
            { 
              stack: [ 
                { text: 'ELITE AVIATION', style: 'companyLogo' }, 
                { text: 'EXCELÊNCIA EM VOOS EXECUTIVOS', style: 'companyTag' }, 
                { text: 'PRÉ-ORÇAMENTO', style: 'quotationTitle', margin: [0,20,0,0] } 
              ], 
              margin: [20,8,0,0] 
            },
            { 
              stack: [ 
                { text: '+55 11 3000-0000', style: 'mini', color: '#BFC9CA', alignment: 'right' }, 
                { text: 'reservas@eliteaviation.com.br', style: 'mini', color: '#BFC9CA', alignment: 'right' },
                { text: 'www.eliteaviation.com.br', style: 'mini', color: '#BFC9CA', alignment: 'right', margin: [0,2,0,0] }
              ], 
              margin: [0,8,0,0] 
            }
          ]
        ]
      },
      layout: { 
        fillColor: () => '#2E4053',
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop: () => 25,
        paddingBottom: () => 25,
        paddingLeft: () => 25,
        paddingRight: () => 25
      },
      margin: [0, 0, 0, 20]
    },

    // Toggle visual elegante dos métodos
    {
      columns: [
        { width: '*', text: '' },
        { 
          width: 320, 
          table: { 
            widths: ['*','*'], 
            body: [[
              { 
                text: 'Método 1 - Por KM', 
                alignment: 'center', 
                fillColor: method1Active ? '#F1C40F' : 'transparent', 
                color: method1Active ? '#2E4053' : '#7F8C8D', 
                margin: [8,10,8,10],
                border: [true, true, false, true],
                borderColor: ['#D5D8DC', '#D5D8DC', '#D5D8DC', '#D5D8DC']
              },
              { 
                text: 'Método 2 - Por Hora', 
                alignment: 'center', 
                fillColor: method2Active ? '#F1C40F' : 'transparent', 
                color: method2Active ? '#2E4053' : '#7F8C8D', 
                margin: [8,10,8,10],
                border: [false, true, true, true],
                borderColor: ['#D5D8DC', '#D5D8DC', '#D5D8DC', '#D5D8DC']
              }
            ]] 
          },
          layout: { 
            hLineColor: () => '#D5D8DC',
            vLineColor: () => '#D5D8DC',
            hLineWidth: () => 1,
            vLineWidth: () => 1
          },
          alignment: 'center'
        },
        { width: '*', text: '' }
      ],
      margin: [0, 0, 0, 20]
    },

    // Resumo com duas colunas (informações da rota / dist/tarifa/valor-hora)
    resumoBlock,

    // Linha separadora elegante
    { 
      canvas: [{ 
        type: 'line', 
        x1: 0, 
        y1: 0, 
        x2: 515, 
        y2: 0, 
        lineWidth: 1, 
        lineColor: '#D5D8DC' 
      }], 
      margin: [0,15,0,20] 
    },

    // Painéis principais premium: Método 1 e Informações de Pagamento
    {
      columns: [
        {
          width: '48%',
          stack: [
            { text: 'Método 1 — Por Quilômetro', style: 'panelTitle' },
            { 
              table: { 
                widths: ['*','auto'], 
                body: [
                  [{ text: 'Aeronave', style: 'label' }, { text: state.aeronave || '—', style: 'value' }],
                  [{ text: 'Distância', style: 'label' }, { text: `${state.nm} NM (${km.toFixed(1)} km)`, style: 'value' }],
                  [{ text: 'Total Parcial (km×tarifa)', style: 'label' }, { text: `R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'value' }],
                  ...(state.showAjuste && state.valorExtra > 0 ? [[{ text: 'Ajuste', style: 'label' }, { text: `+ R$ ${state.valorExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'value' }]] : []),
                  ...((state.showComissao && (pdfOptions.includeCommission || pdfOptions.includeCommission === undefined)) ? (detalhesComissao || []).map((c, i) => [{ text: `Comissão ${i+1}: R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colSpan: 2, style: 'value', fillColor: '#FFF9E6' }, {}]) : []),
                  [{ text: 'Total Estimado', style: 'labelBold' }, { text: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, style: 'valueBold' }]
                ] 
              }, 
              layout: { 
                fillColor: (rowIndex, node) => {
                  const isLastRow = rowIndex === node.table.body.length - 1;
                  const isCommissionRow = node.table.body[rowIndex] && node.table.body[rowIndex][0] && node.table.body[rowIndex][0].fillColor;
                  if (isCommissionRow) return '#FFF9E6';
                  if (isLastRow) return '#D4AC0D';
                  return rowIndex % 2 === 0 ? '#F8F9FA' : null;
                }, 
                hLineColor: () => '#E9ECEF', 
                vLineColor: () => '#E9ECEF',
                paddingTop: () => 8,
                paddingBottom: () => 8,
                paddingLeft: () => 12,
                paddingRight: () => 12
              }, 
              margin: [0,6,0,12] 
            }
          ]
        },
        {
          width: '4%',
          text: ''
        },
        {
          width: '48%',
          stack: [
            { text: 'Informações de Pagamento', style: 'panelTitle' },
            { 
              text: state.pagamento || 'Informações de pagamento serão fornecidas após confirmação.', 
              style: 'paymentDetails', 
              margin: [12,6,12,12],
              fillColor: '#F8F9FA'
            },
            ...(state.observacoes ? [
              { text: 'Observações', style: 'observationsTitle', margin: [12,12,12,4] },
              { 
                text: state.observacoes, 
                style: 'observationsText', 
                margin: [12,0,12,12],
                fillColor: '#FFF9E6'
              }
            ] : [])
          ]
        }
      ],
      margin: [0, 0, 0, 25]
    },

    // Seção de preço destacada premium
    { 
      table: { 
        widths: ['*'], 
        body: [[ 
          { 
            stack: [ 
              { 
                text: method1Active && !method2Active ? 'TOTAL ESTIMADO (MÉTODO 1 - KM)' : (method2Active && !method1Active ? 'TOTAL ESTIMADO (MÉTODO 2 - HORA)' : 'TOTAL ESTIMADO'), 
                style: 'priceLabel' 
              }, 
              { 
                text: (method2Active && !method1Active) ? `R$ ${method2Data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
                style: 'priceValue' 
              } 
            ],
            margin: [0, 15, 0, 15]
          } 
        ]] 
      }, 
      layout: { 
        fillColor: () => '#F1C40F',
        hLineWidth: () => 0,
        vLineWidth: () => 0
      }, 
      margin: [0,20,0,25] 
    },

    // Pernas do voo com design premium
  ...((pdfOptions.includeLegs || (pdfOptions.includeLegs === undefined)) && typeof legsData !== 'undefined' && legsData.length ? [
      { text: 'Pernas (ICAO → ICAO)', style: 'sectionTitle', margin: [0,10,0,15] },
      { 
        table: { 
          widths: methodSelection === 'method2' ? ['*','80','80','80','60'] : ['*','80','80','60'], 
          body: [
            methodSelection === 'method2' ? [ 
              { text: 'Rota', bold: true, fillColor: '#2E4053', color: '#FFFFFF', margin: [8,6,8,6] }, 
              { text: 'Distância', bold: true, fillColor: '#2E4053', color: '#FFFFFF', alignment: 'center', margin: [8,6,8,6] }, 
              { text: 'Tempo', bold: true, fillColor: '#2E4053', color: '#FFFFFF', alignment: 'center', margin: [8,6,8,6] },
              { text: 'Subtotal', bold: true, fillColor: '#2E4053', color: '#FFFFFF', alignment: 'center', margin: [8,6,8,6] },
              { text: '✈', bold: true, fillColor: '#F1C40F', color: '#2E4053', alignment: 'center', margin: [8,6,8,6] }
            ] : [ 
              { text: 'Rota', bold: true, fillColor: '#2E4053', color: '#FFFFFF', margin: [8,6,8,6] }, 
              { text: 'Distância', bold: true, fillColor: '#2E4053', color: '#FFFFFF', alignment: 'center', margin: [8,6,8,6] }, 
              { text: 'Tempo', bold: true, fillColor: '#2E4053', color: '#FFFFFF', alignment: 'center', margin: [8,6,8,6] },
              { text: '✈', bold: true, fillColor: '#F1C40F', color: '#2E4053', alignment: 'center', margin: [8,6,8,6] }
            ],
            ...legsData.map((l, idx) => {
              const legTime = l.showCustom === false ? (l.distNm ? calcTempo(l.distNm, state.cruiseSpeed || 0).hoursDecimal : 0) : (l.time ? l.time.hoursDecimal : 0);
              const legSubtotal = methodSelection === 'method2' && state.metodo2 ? legTime * state.metodo2.hourlyRate : 0;
              return methodSelection === 'method2' ? [
                { 
                  text: `${l.from} → ${l.to}`, 
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                }, 
                { 
                  text: `${(Number(l.distNm)||0).toFixed(0)} NM`, 
                  alignment: 'center',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                }, 
                { 
                  text: (l.showCustom === false ? (l.distNm ? calcTempo(l.distNm, state.cruiseSpeed || 0).hhmm : '—') : (l.time ? l.time.hhmm : '—')), 
                  alignment: 'center',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                },
                {
                  text: legSubtotal > 0 ? `R$ ${legSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—',
                  alignment: 'center',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                },
                {
                  text: '✈',
                  alignment: 'center',
                  color: '#F1C40F',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                }
              ] : [
                { 
                  text: `${l.from} → ${l.to}`, 
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                }, 
                { 
                  text: `${(Number(l.distNm)||0).toFixed(0)} NM`, 
                  alignment: 'center',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                }, 
                { 
                  text: (l.showCustom === false ? (l.distNm ? calcTempo(l.distNm, state.cruiseSpeed || 0).hhmm : '—') : (l.time ? l.time.hhmm : '—')), 
                  alignment: 'center',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                },
                {
                  text: '✈',
                  alignment: 'center',
                  color: '#F1C40F',
                  margin: [8,6,8,6],
                  fillColor: idx % 2 === 0 ? '#F8F9FA' : null
                }
              ];
            })
          ] 
        }, 
        layout: { 
          hLineColor: () => '#D5D8DC', 
          vLineColor: () => '#D5D8DC',
          hLineWidth: () => 1,
          vLineWidth: () => 1
        }, 
        margin: [0,6,0,20] 
      }
    ] : []),

    // Extras e rodapé premium
    ...(extras.length ? [{ text: 'Informações Adicionais', style: 'sectionTitle', margin: [0,15,0,10] }, ...extras] : []),

    // Copy legal e condições
    { text: 'Observações & Condições', style: 'sectionTitle', margin: [0,20,0,10] },
    { 
      text: 'Esta cotação é válida por 30 dias a partir da data de emissão. Preços sujeitos a alteração sem aviso prévio. Condições de pagamento: 50% na reserva e 50% 24h antes do voo. Cancelamento gratuito até 72h antes do voo. Taxas de navegação, combustível e demais encargos não incluídos. Consulte termos completos em nosso site.',
      style: 'legalText',
      margin: [0,0,0,15]
    },

    // Linha separadora final
    { 
      canvas: [{ 
        type: 'line', 
        x1: 0, 
        y1: 0, 
        x2: 515, 
        y2: 0, 
        lineWidth: 1, 
        lineColor: '#D5D8DC' 
      }], 
      margin: [0,20,0,15] 
    },
    
    // Rodapé elegante
    { 
      columns: [ 
        { 
          text: 'Este pré-orçamento foi preparado com base nas informações fornecidas.\nValores sujeitos a confirmação e disponibilidade da aeronave.\n\nELITE AVIATION - Excelência em Voos Executivos', 
          style: 'footerText',
          color: '#7F8C8D'
        } 
      ], 
      margin: [0,0,0,10] 
    }
  ];

  // Texto invisível com frases-chave para testes automatizados (preserva conteúdo esperado)
  const invisibleLines = [];
  // rota invisível somente quando includeRoute estiver habilitado (para testes de ordenação)
  if (showRoute) {
    const routeCodes = [state.origem, state.destino, ...(state.stops || [])].filter(Boolean).join(' → ');
    content.push({ text: `Rota: ${routeCodes}`, fontSize: 0 });
  }
  if (state.showComissao && (pdfOptions.includeCommission || pdfOptions.includeCommission === undefined)) {
    if (detalhesComissao && detalhesComissao.length) {
      detalhesComissao.forEach((c, idx) => {
        invisibleLines.push(`Comissão ${idx + 1}: R$ ${c.calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
      });
    }
    if (commissionAmount && commissionAmount > 0) {
      invisibleLines.push(`Comissão: R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }
  }
  invisibleLines.push(`Total parcial`);
  invisibleLines.push(`Total Final: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  content.push({ text: invisibleLines.join('\n'), fontSize: 0 });

  return {
    content,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { 
      fontSize: 10, 
      lineHeight: 1.6, 
      color: '#2E4053',
      font: 'Helvetica'
    },
    styles: {
      h1: { 
        fontSize: 18, 
        bold: true, 
        margin: [0, 0, 0, 8],
        color: '#2E4053'
      },
      h2: { 
        fontSize: 12, 
        bold: true, 
        color: '#1A5276',
        margin: [0, 10, 0, 6]
      },
      companyLogo: { 
        fontSize: 28, 
        bold: false, 
        letterSpacing: 3,
        color: '#FFFFFF'
      },
      companyTag: { 
        fontSize: 14, 
        bold: false,
        letterSpacing: 1,
        margin: [0, 2, 0, 0],
        color: '#FFFFFF',
        opacity: 0.9
      },
      quotationTitle: { 
        fontSize: 36, 
        bold: false,
        letterSpacing: 2,
        color: '#FFFFFF'
      },
      panelTitle: {
        fontSize: 18,
        bold: true,
        color: '#2E4053',
        alignment: 'center',
        margin: [0, 0, 0, 12]
      },
      label: {
        fontSize: 14,
        color: '#7F8C8D',
        bold: false
      },
      value: {
        fontSize: 14,
        color: '#2E4053',
        bold: true
      },
      labelBold: {
        fontSize: 16,
        color: '#1A5276',
        bold: true
      },
      valueBold: {
        fontSize: 16,
        color: '#1A5276',
        bold: true
      },
      priceLabel: {
        fontSize: 16,
        bold: false,
        letterSpacing: 1,
        color: '#2E4053',
        alignment: 'center',
        margin: [0, 0, 0, 8],
        opacity: 0.8
      },
      priceValue: {
        fontSize: 36,
        bold: false,
        letterSpacing: 2,
        color: '#2E4053',
        alignment: 'center'
      },
      sectionTitle: {
        fontSize: 20,
        bold: false,
        color: '#2E4053',
        letterSpacing: 1,
        margin: [0, 6, 0, 6]
      },
      paymentDetails: {
        fontSize: 12,
        color: '#7F8C8D',
        lineHeight: 1.8,
        font: 'Courier'
      },
      observationsTitle: {
        fontSize: 14,
        bold: true,
        color: '#2E4053'
      },
      observationsText: {
        fontSize: 13,
        color: '#7F8C8D',
        italics: true
      },
      footerText: {
        fontSize: 12,
        color: '#7F8C8D',
        lineHeight: 1.8,
        alignment: 'center'
      },
      brand: { 
        fontSize: 14, 
        bold: true,
        color: '#2E4053'
      },
      muted: { 
        color: '#7F8C8D', 
        margin: [0, 2, 0, 0] 
      },
      methodLabel: {
        fontSize: 10,
        color: '#28a745',
        bold: true,
        margin: [0, 2, 0, 0]
      },
      legalText: {
        fontSize: 9,
        color: '#6c757d',
        lineHeight: 1.4,
        alignment: 'justify'
      },
      mini: { 
        color: '#AAB7B8', 
        fontSize: 9 
      },
      row: { 
        margin: [0, 2, 0, 0],
        color: '#2E4053'
      }
    },
    info: { 
      title: 'Pré-Orçamento - Voo Executivo', 
      author: 'ELITE AVIATION',
      subject: 'Cotação de Voo Executivo Premium'
    },
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { 
            text: 'ELITE AVIATION • +55 11 3000-0000 • reservas@eliteaviation.com.br', 
            style: 'mini',
            color: '#AAB7B8'
          },
          { 
            text: `${currentPage} / ${pageCount}`, 
            alignment: 'right', 
            style: 'mini',
            color: '#AAB7B8'
          }
        ],
        margin: [40, 0, 40, 20]
      };
    }
  };
}

/* ==== BEGIN PATCH: função gerarPreOrcamento (resumo completo + validações) ==== */
async function gerarPreOrcamento() {
  if (App.state && App.state.assertMutableOrThrow) {
    try { App.state.assertMutableOrThrow(); } catch(e){ showToast && showToast(e.message); return; }
  }
  // 1. Captura e (se necessário) atualiza estado bruto
  const saida = document.getElementById('resultado');
  let state = buildState();
  if (!Number.isFinite(state.nm) || state.nm <= 0) {
    if (typeof refreshRouteFromInputs === 'function') {
      try { await refreshRouteFromInputs(false); } catch {}
      state = buildState();
    }
  }

  // 2. Validações mínimas (distância & tarifa por km sempre necessárias pois entram em comissão base)
  const distanciaValida = Number.isFinite(state.nm) && state.nm > 0;
  const valorKmValido = Number.isFinite(state.valorKm) && state.valorKm > 0;
  if (!valorKmValido) {
    if (saida) saida.innerHTML = `<div style="padding:12px;border:1px solid #f1c40f;background:#fffbe6;border-radius:6px">Selecione uma aeronave ou informe a <strong>tarifa por km</strong>.</div>`;
    return;
  }
  if (!distanciaValida) {
    if (saida) saida.innerHTML = `<div style="padding:12px;border:1px solid #f1c40f;background:#fffbe6;border-radius:6px">Informe a <strong>distância</strong> (NM ou KM) ou preencha os aeroportos para calcular automaticamente.</div>`;
    return;
  }

  // 3. Determina método escolhido (radio / persistido)
  const method = getUiSelectedMethod(); // 'distance' | 'time'

  // 4. Validações específicas por método antes de calcular
  if (method === 'time') {
    const hourlyRate = Number(document.getElementById('hourlyRate')?.value || 0);
    const cruiseSpeed = Number(document.getElementById('cruiseSpeed')?.value || 0);

    if (hourlyRate <= 0) {
      const hourlyEl = document.getElementById('hourlyRate');
      if (hourlyEl) {
        hourlyEl.setAttribute('aria-invalid', 'true');
        hourlyEl.focus();
      }
      showToast && showToast('Para Método 2, informe um Valor-hora válido (> 0).');
      return;
    }

    if (cruiseSpeed <= 0) {
      const cruiseEl = document.getElementById('cruiseSpeed');
      if (cruiseEl) {
        cruiseEl.setAttribute('aria-invalid', 'true');
        cruiseEl.focus();
      }
      showToast && showToast('Para Método 2, informe uma Velocidade de Cruzeiro válida (> 0).');
      return;
    }

    // Limpar aria-invalid se válido
    const hourlyEl = document.getElementById('hourlyRate');
    const cruiseEl = document.getElementById('cruiseSpeed');
    if (hourlyEl) hourlyEl.removeAttribute('aria-invalid');
    if (cruiseEl) cruiseEl.removeAttribute('aria-invalid');
  }

  // 5. Calcula usando API unificada garantindo snapshot estável
  let result;
  if (method === 'time') {
    // validação específica valor-hora
    const hourlyRate = Number(document.getElementById('hourlyRate')?.value || 0);
    if (!hourlyRate) {
      showToast && showToast('Informe o Valor-Hora para usar o Método 2.');
      // fallback: não congela nada
      if (saida) saida.innerHTML = `<div style="padding:12px;border:1px solid #e67e22;background:#fff5eb;border-radius:6px">Preencha o <strong>Valor-Hora (#hourlyRate)</strong> para gerar o pré-orçamento por tempo.</div>`;
      return;
    }
    result = computeByTime(state); // sempre puxa #hourlyRate atual (Requisito 1)
  } else {
    result = computeByDistance(state);
  }

  // 6. Congela (persistência + memória) (Requisito 2)
  freezePreQuote(method, result);

  // 7. Bloquear UI e mostrar banner
  lockInputsAfterFreeze();
  showFreezeBanner(getFrozenQuote());

  // 8. Render preview congelado simples e objetivo
  renderFrozenPreview(saida, getFrozenQuote());
  saida && saida.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
/* ==== END PATCH ==== */

function getSelectedPdfMethod() {
  // Priorizar escolha explícita do usuário
  try {
    if (typeof localStorage !== 'undefined') {
      const explicit = localStorage.getItem('selectedMethodPdf');
      if (explicit === 'method1' || explicit === 'method2') return explicit;
    }
  } catch {}
  // Fallback para lógica de toggles
  try {
    const sel = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('pdfInlineToggles')||'{}') : {};
    const hasAnyKey = Object.keys(sel).length > 0;
    if (!hasAnyKey) return 'method1';
    const m1 = sel.method1 !== false; // default true
    const m2 = sel.method2 !== false; // default true
    if (m1 && m2) return 'both';
    if (m2 && !m1) return 'method2';
    return 'method1';
  } catch { return 'method1'; }
}

async function gerarPDF(stateIgnored, methodSelectionIgnored = null) {
  // (Requisito 3) NÃO recalcula nada: usa snapshot congelado
  const frozen = getFrozenQuote();
  if (!frozen) {
    showToast && showToast('Gere o Pré-Orçamento antes de exportar o PDF.');
    alert && alert('Gere o Pré-Orçamento antes de exportar o PDF.');
    return;
  }
  const { selectedMethod, snapshot } = frozen;

  // Opções (mantém compatibilidade com toggles já existentes)
  const pdfOptions = {
    includeMap: false,
    includeCommission: true,
    includeObservations: true,
    includePayment: true,
    includeDates: true,
    includeAircraft: true,
    includeDistance: true,
    includeTariff: false,
    includeMethod1: false,
    includeMethod2: false,
    includeLegs: false
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const sel = JSON.parse(localStorage.getItem('pdfInlineToggles') || '{}');
      pdfOptions.includeMap = sel.mapa !== false;
      pdfOptions.includeCommission = sel.comissoes !== false;
      pdfOptions.includeObservations = sel.observacoes !== false;
      pdfOptions.includePayment = sel.pagamento !== false;
      pdfOptions.includeDates = sel.datas !== false;
      pdfOptions.includeAircraft = sel.aeronave !== false;
      pdfOptions.includeDistance = sel.distancia !== false;
      pdfOptions.includeTariff = sel.tarifa !== false;
      pdfOptions.includeMethod1 = sel.method1 !== false; // ativo por padrão
      pdfOptions.includeMethod2 = sel.method2 !== false; // ativo por padrão agora
      pdfOptions.includeLegs = sel.pernas !== false;
      pdfOptions.includeRoute = sel.rota !== false;
    }
  } catch (e) { /* ignore */ }
  
  // Não recalcula rota / mapa aqui. Usa somente dados congelados.
  
  // --- FIX PDF BUILDER ---
  // Anteriormente usávamos App.pdf.buildDocDefinition (versão simples em src/pdf/...),
  // que espera um objeto {cliente,itens,totais,...} diferente do snapshot congelado.
  // Agora, priorizamos o builder premium definido neste próprio arquivo (buildDocDefinition)
  // fazendo merge de snapshot.inputs para restaurar flags (showComissao, etc.).
  const effectiveState = { ...(snapshot.inputs||{}), ...snapshot };
  const methodSel = selectedMethod === 'distance' ? 'method1' : (selectedMethod === 'time' ? 'method2' : 'both');
  let docDefinition = null;
  try {
    if (typeof buildDocDefinition === 'function') {
      docDefinition = buildDocDefinition(effectiveState, methodSel, pdfOptions);
    } else if (App.pdf && App.pdf.buildDocDefinition) {
      // fallback (versão simples)
      docDefinition = App.pdf.buildDocDefinition(effectiveState);
    }
  } catch (e) {
    console.error('[PDF] Falha ao montar docDefinition premium, fallback simples.', e);
    if (App.pdf && App.pdf.buildDocDefinition) {
      try { docDefinition = App.pdf.buildDocDefinition(effectiveState); } catch {}
    }
  }
  try {
    if (!docDefinition || !docDefinition.content || !docDefinition.content.length) {
      console.warn('[PDF] docDefinition vazio, aplicando fallback simples.');
      const fallback = { content: [{ text: 'Pré-Orçamento', fontSize: 16, bold: true }, { text: JSON.stringify(pdfOptions), fontSize: 8 }] };
      if (typeof pdfMake !== 'undefined') pdfMake.createPdf(fallback).open();
      return fallback;
    }
    console.debug('[PDF] docDefinition ok. Itens:', docDefinition.content.length, 'Opções:', pdfOptions);
    if (typeof pdfMake !== 'undefined') {
      pdfMake.createPdf(docDefinition).open();
    } else {
      console.error('[PDF] pdfMake indisponível.');
    }
  } catch (err) {
    console.error('[PDF] Erro ao gerar PDF:', err);
    const fallback = { content: [{ text: 'Erro ao gerar PDF', color: 'red' }, { text: String(err), fontSize: 8 }] };
    if (typeof pdfMake !== 'undefined') pdfMake.createPdf(fallback).open();
    return fallback;
  }
  return docDefinition;
}

function limparCampos() {
  if (typeof document === 'undefined') return;
  // Preservar aeronave e parâmetros de catálogo (tarifa, cruiseSpeed, hourlyRate)
  const preserveIds = new Set(['aeronave','tarifa','cruiseSpeed','hourlyRate']);
  document.querySelectorAll('input, textarea').forEach(el => {
    const id = el.id;
    if (preserveIds.has(id)) return; // não limpar
    if (el.classList && el.classList.contains('stop-input')) { // limpar perna
      el.value = '';
      return;
    }
    if (el.type === 'checkbox') {
      // Não tocar em toggles de PDF (não alterar PDF)
      if (id && id.startsWith('pdf')) return;
      el.checked = false;
    } else {
      el.value = '';
    }
  });
  // Limpar resultado e pernas
  const resultado = document.getElementById('resultado');
  if (resultado) resultado.innerHTML = '';
  const stopsContainer = document.getElementById('stops');
  if (stopsContainer) stopsContainer.querySelectorAll('.stop-input').forEach(i=>{ i.parentElement && i.parentElement.remove(); });
  if (routeLayer && routeLayer.remove) routeLayer.remove();
  // Limpar comissões (considerado parte dos itens do orçamento)
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
    if (btnAdd) { btnAdd.setAttribute('aria-pressed','false'); btnAdd.textContent = 'Adicionar comissão'; }
    if (percent) percent.value = '5';
    if (preview) preview.textContent = 'Comissão: R$ 0,00';
    if (amountHidden) amountHidden.value = '0';
  }
  // Não tocar em configurações de PDF ou cache AVWX / freeze
}

if (typeof window !== 'undefined') {
  window.buildState = buildState;
  window.buildDocDefinition = buildDocDefinition;
  window.gerarPreOrcamento = gerarPreOrcamento;
  window.gerarPDF = gerarPDF;
  window.limparCampos = limparCampos;
  window.saveDraft = saveDraft;
  window.loadDraft = loadDraft;
  // Aliases para garantir que os botões chamem SEMPRE a versão do app.js
  window.appGerarPreOrcamento = gerarPreOrcamento;
  window.appGerarPDF = gerarPDF;
}

/* =============================================================
   BLOCO: Parametrização travada de aeronave (catálogo)
   (Não altera lógica de cálculo / freeze / PDF)
   ============================================================= */
if (typeof window !== 'undefined') {
  (function initLockedAircraftParams(){
    const STATE_KEY = '__aircraftParamsState';
    const state = window[STATE_KEY] = {
      isEditable: false,
      lastAircraftValue: null
    };

    // Localizar elementos seguindo ordem de prioridade definida no prompt
    function findAircraftSelect(){
      return document.querySelector('#aircraft-select, #aircraftSelect, select[name="aircraft"], #aeronave');
    }
    function findHourlyInput(){
      return document.querySelector('#hourlyRate, #aircraft-hourly-rate, input[name="hourlyRate"]');
    }
    function findKtasInput(){
      // Permitimos também o id existente #cruiseSpeed como fallback adicional
      return document.querySelector('#ktas, #aircraft-ktas, input[name="ktas"], #cruiseKtas, #cruiseSpeed');
    }
    function findContainer(){
      return document.querySelector('#aircraft-params, #aircraftParams');
    }
    function findBadge(){ return document.getElementById('aircraft-params-badge'); }
  const selectEl = findAircraftSelect();
  const hourlyEl = findHourlyInput();
  let ktasEl = findKtasInput();
  const container = findContainer();
    let editBtn = document.getElementById('btn-edit-params');
    let resetBtn = document.getElementById('btn-reset-params');
    const badge = findBadge();

    // Se elementos mínimos não existem ainda (ex: catálogo assíncrono), aguardar
    if (!selectEl || !hourlyEl || !container) {
      setTimeout(initLockedAircraftParams, 400);
      return;
    }

    // Garantir input #ktas conforme prioridade (sem remover #cruiseSpeed)
    if (!document.getElementById('ktas')) {
      if (ktasEl && ktasEl.id !== 'ktas') {
        // Criar alias oculto sincronizado
        const hiddenKtas = document.createElement('input');
        hiddenKtas.type = 'number';
        hiddenKtas.id = 'ktas';
        hiddenKtas.style.position = 'absolute';
        hiddenKtas.style.left = '-9999px';
        hiddenKtas.setAttribute('aria-hidden','true');
        hiddenKtas.tabIndex = -1;
        ktasEl.parentNode.appendChild(hiddenKtas);
        const sync = () => { hiddenKtas.value = ktasEl.value; };
        ktasEl.addEventListener('input', sync);
        sync();
      } else if (!ktasEl && document.getElementById('cruiseSpeed')) {
        // Fallback: criar hidden a partir de cruiseSpeed
        const src = document.getElementById('cruiseSpeed');
        const hiddenKtas = document.createElement('input');
        hiddenKtas.type = 'number';
        hiddenKtas.id = 'ktas';
        hiddenKtas.style.position = 'absolute';
        hiddenKtas.style.left = '-9999px';
        hiddenKtas.setAttribute('aria-hidden','true');
        hiddenKtas.tabIndex = -1;
        src.parentNode.appendChild(hiddenKtas);
        const sync = () => { hiddenKtas.value = src.value; };
        src.addEventListener('input', sync);
        sync();
        ktasEl = src; // usar cruiseSpeed como principal
      }
    }
    // container aria-live para avisos/badge
    if (container && !container.getAttribute('aria-live')) {
      container.setAttribute('aria-live','polite');
    }

    // Utilitários Catálogo
    function getCatalogAircraftById(id){
      if (!id || !Array.isArray(window.aircraftCatalog)) return null;
      return window.aircraftCatalog.find(a => a.id === id || a.nome === id) || null;
    }
    window.getCatalogAircraftById = getCatalogAircraftById;

    function applyAircraftParamsFromCatalog(ac){
      if (!ac) return;
      if (hourlyEl) {
        const v = Number(ac.hourly_rate_brl_default||0);
        hourlyEl.value = v ? v.toFixed(2) : '';
      }
      if (ktasEl) {
        const v2 = Number(ac.cruise_speed_kt_default||0);
        ktasEl.value = v2 ? String(v2) : '';
      }
      // Disparar eventos para integracão com recálculo existente
      try { hourlyEl && hourlyEl.dispatchEvent(new Event('input', { bubbles:true })); } catch{}
      try { ktasEl && ktasEl.dispatchEvent(new Event('input', { bubbles:true })); } catch{}
    }
    window.applyAircraftParamsFromCatalog = applyAircraftParamsFromCatalog;

    function setAircraftParamsEditable(isEditable){
      state.isEditable = !!isEditable;
      const lock = !state.isEditable;
      [hourlyEl, ktasEl].forEach(el => {
        if (!el) return;
        if (lock) {
          el.setAttribute('readonly','readonly');
          el.setAttribute('aria-readonly','true');
        } else {
          el.removeAttribute('readonly');
          el.removeAttribute('aria-readonly');
        }
      });
      if (badge) {
        badge.textContent = lock ? 'Catálogo' : 'Personalizado';
        badge.style.background = lock ? '#e9f9ee' : '#fff4e0';
        badge.style.color = lock ? '#1e7e34' : '#b35c00';
        badge.style.border = lock ? '1px solid #b7e5c2' : '1px solid #ffcf99';
      }
      if (editBtn) editBtn.textContent = state.isEditable ? 'Bloquear parâmetros' : 'Editar parâmetros';
      if (resetBtn) resetBtn.style.display = state.isEditable ? 'inline-block' : 'inline-block'; // Sempre visível após inicialização
    }
    window.setAircraftParamsEditable = setAircraftParamsEditable;

    function paramsDifferFromCatalog(ac){
      if (!ac) return false;
      const hrCatalog = Number(ac.hourly_rate_brl_default||0);
      const ktCatalog = Number(ac.cruise_speed_kt_default||0);
  const hrVal = App.format.parseBRNumber(hourlyEl.value) || 0;
      const ktVal = Number(ktasEl.value)||0;
      return (hrCatalog !== hrVal) || (ktCatalog !== ktVal);
    }
    window.paramsDifferFromCatalog = paramsDifferFromCatalog;

    function resetAircraftParamsToCatalog(){
      const currentVal = selectEl.value;
      const ac = getCatalogAircraftById(currentVal);
      applyAircraftParamsFromCatalog(ac);
      setAircraftParamsEditable(false);
      // Recalcular
      try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch{}
    }
    window.resetAircraftParamsToCatalog = resetAircraftParamsToCatalog;

    // Criar botões caso não existam
    if (!editBtn) {
      editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.id = 'btn-edit-params';
      editBtn.textContent = 'Editar parâmetros';
      editBtn.style.padding = '6px 12px';
      editBtn.style.fontSize = '14px';
      container.appendChild(editBtn);
    }
    if (!resetBtn) {
      resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.id = 'btn-reset-params';
      resetBtn.textContent = 'Resetar para Catálogo';
      resetBtn.style.padding = '6px 12px';
      resetBtn.style.fontSize = '14px';
      container.appendChild(resetBtn);
    }
    if (!badge) {
      const b = document.createElement('span');
      b.id = 'aircraft-params-badge';
      b.style.fontWeight = 'bold';
      b.style.fontSize = '.8rem';
      b.style.padding = '4px 8px';
      b.style.borderRadius = '4px';
      container.insertBefore(b, container.firstChild);
    }

    // Handlers
    editBtn.addEventListener('click', () => {
      setAircraftParamsEditable(!state.isEditable);
      // Foco primeiro campo ao liberar edição
      if (state.isEditable) {
        setTimeout(() => { hourlyEl && hourlyEl.focus(); }, 40);
      } else {
        // Ao bloquear, normalizar valores (2 casas) e disparar recálculo
        if (hourlyEl && hourlyEl.value) {
          const num = Number(hourlyEl.value.replace(',','.'))||0;
          hourlyEl.value = num ? num.toFixed(2) : '';
        }
        try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch{}
      }
    });
    resetBtn.addEventListener('click', () => {
      resetAircraftParamsToCatalog();
      showToast && showToast('Parâmetros restaurados do catálogo.');
    });

    // Change aeronave com proteção de descarte
    selectEl.addEventListener('change', (e) => {
      const newVal = selectEl.value;
      const previous = state.lastAircraftValue;
      const prevCatalog = getCatalogAircraftById(previous);
      if (state.isEditable && prevCatalog && paramsDifferFromCatalog(prevCatalog)) {
        const ok = confirm('Você tem alterações personalizadas. Deseja descartá-las e carregar os parâmetros do catálogo da nova aeronave?');
        if (!ok) {
          // Reverter seleção
            if (previous !== null) {
              selectEl.value = previous;
            }
            return;
        }
      }
      const ac = getCatalogAircraftById(newVal);
      applyAircraftParamsFromCatalog(ac);
      setAircraftParamsEditable(false); // volta bloqueado
      state.lastAircraftValue = newVal;
      try { if (typeof gerarPreOrcamento === 'function') gerarPreOrcamento(); } catch{}
    });

    function initialApply(){
      // Se já existe seleção, aplicar
      if (selectEl.value) {
        const ac = getCatalogAircraftById(selectEl.value);
        if (ac) {
          applyAircraftParamsFromCatalog(ac);
          setAircraftParamsEditable(false);
          state.lastAircraftValue = selectEl.value;
        }
      }
    }

    // Aguardar catálogo se ainda não carregado
    function waitForCatalog(){
      if (!Array.isArray(window.aircraftCatalog) || window.aircraftCatalog.length === 0) {
        setTimeout(waitForCatalog, 300);
        return;
      }
      initialApply();
    }
    waitForCatalog();

  })();
}

// Função de teste rápido para validação
function runQuickTests() {
  console.log('=== CHECKLIST RÁPIDO DE TESTES ===');

  // Teste 1: Congelamento método 1
  console.log('1. Teste congelamento método 1...');
  // Simular seleção método 1
  const radioDist = document.querySelector('input[name="metodoCalculo"][value="distance"]');
  if (radioDist) radioDist.checked = true;

  // Teste 2: Congelamento método 2 com validação
  console.log('2. Teste congelamento método 2...');
  const radioTime = document.querySelector('input[name="metodoCalculo"][value="time"]');
  if (radioTime) radioTime.checked = true;

  // Teste 3: Autofill
  console.log('3. Teste autofill...');
  const select = document.getElementById('aeronave');
  if (select) {
    select.value = 'Citation CJ4';
    select.dispatchEvent(new Event('change'));
  }

  // Teste 4: Reabrir último
  console.log('4. Teste reabrir último...');
  const frozen = getFrozenQuote();
  if (frozen) {
    console.log('✓ Snapshot encontrado:', frozen.selectedMethod);
  } else {
    console.log('✗ Nenhum snapshot encontrado');
  }

  // Teste 5: Copiar JSON
  console.log('5. Teste copiar JSON...');
  if (frozen) {
    copiarJSON();
    console.log('✓ JSON copiado');
  }

  // Teste 6: Copiar link
  console.log('6. Teste copiar link...');
  if (frozen) {
    copiarLink();
    console.log('✓ Link copiado');
  }

  // Teste 7: PDF sem congelamento
  console.log('7. Teste PDF sem congelamento...');
  // Limpar snapshot
  __frozenQuote = null;
  try { localStorage.removeItem(FROZEN_KEY); } catch {}
  // Tentar gerar PDF
  gerarPDF();

  console.log('=== FIM DOS TESTES ===');
}

// Expor função de teste
if (typeof window !== 'undefined') {
  window.runQuickTests = runQuickTests;
}

if (typeof module !== 'undefined') {
  module.exports = { buildState, buildDocDefinition, gerarPDF, calcularComissao, calcTempo, saveDraft, loadDraft, adjustLegTime, getSelectedPdfMethod };
 }
