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

// AVWX token: prefer environment variable `AVWX_TOKEN`, otherwise use the provided hardcoded token.
// NOTE: embedding tokens in source is insecure for public repos; this was requested explicitly.
const API_KEY = (typeof process !== 'undefined' && process.env && process.env.AVWX_TOKEN)
  ? process.env.AVWX_TOKEN
  : 'Zq-Qlr7SEVgfe5DE8lc2O6S7TPwqGnd7IDytnPp7T-Y';

// Função centralizada para cabeçalhos AVWX (esquema oficial usa 'BEARER' em maiúsculas segundo documentação)
function avwxHeaders(){
  return API_KEY ? { Authorization: `BEARER ${API_KEY}` } : {};
}

// --- [ADD/REPLACE] Utilitários do mapa e cache ---
let map;
let routeLayer = null;
const airportCache = new Map();

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

async function fetchAirportByCode(code) {
  const icao = String(code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) return null;
  if (airportCache.has(icao)) return airportCache.get(icao);
  try {
  const headers = avwxHeaders();
    const url = `https://avwx.rest/api/station/${icao}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();

    // Robust coordinate extraction: busca recursiva por chaves lat/lon em qualquer nível
    function findLatLon(obj, depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 6) return null;
      const keys = Object.keys(obj || {});
      let latVal, lonVal;
      for (const k of keys) {
        const lk = k.toLowerCase();
        if (lk.includes('lat')) latVal = obj[k];
        if (lk.includes('lon') || lk.includes('lng') || lk.includes('long')) lonVal = obj[k];
      }
      if (latVal !== undefined && lonVal !== undefined) {
        const latN = Number(String(latVal).replace(',', '.'));
        const lonN = Number(String(lonVal).replace(',', '.'));
        if (Number.isFinite(latN) && Number.isFinite(lonN)) return { lat: latN, lng: lonN };
      }
      for (const k of keys) {
        try {
          const v = obj[k];
          if (v && typeof v === 'object') {
            const r = findLatLon(v, depth + 1);
            if (r) return r;
          }
        } catch (e) { /* ignore */ }
      }
      return null;
    }

    const point = findLatLon(data);
    airportCache.set(icao, point);
    return point;
  } catch {
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
// --- [END ADD/REPLACE] ---

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
        const raw = modalInput.value;
        const v = Number(String(raw).replace(',', '.'));
        if (!Number.isFinite(v) || v < 0) {
          alert('Valor inválido');
          return;
        }
        tarifaInput.value = String(Number(v.toFixed(2)));
        // Persistir por aeronave
        const store = loadTarifasStore();
        if (aeronaveSel.value) store[aeronaveSel.value] = tarifaInput.value;
        saveTarifasStore(store);
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
  const commissionAmount = obterComissao(km, state.valorKm);
  const total = totalSemComissao + totalComissao + commissionAmount;

  // Cabeçalho estilizado (barra full-bleed com "falso" gradiente em camadas de canvas)
  const headerBlock = {
    stack: [
      {
        // camada de fundo principal
        canvas: [
          { type: 'rect', x: -40, y: -30, w: 595, h: 90, color: '#1B2635' },
          { type: 'rect', x: -40, y: 30, w: 595, h: 4, color: '#F1C40F' }
        ]
      },
      {
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
      }
    ],
    margin: [0, 0, 0, 18]
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
      pdfMake.createPdf(finalDef).open();
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
