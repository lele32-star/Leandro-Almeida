// src/services/aircraftCatalog.js
const CATALOG_URL = 'data/aircraftCatalog.json';
const LS_KEY_OVERRIDES = 'avCotacao.aircraftOverrides';
// Estrutura de override por aeronave:
// { [aircraftId]: { tarifa_km_brl?: number, cruise_speed_kt?: number, hourly_rate_brl?: number } }

export async function loadCatalog() {
  const res = await fetch(CATALOG_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao carregar catálogo de aeronaves');
  return res.json();
}

export function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_OVERRIDES) || '{}');
  } catch {
    return {};
  }
}

export function saveOverrides(next) {
  localStorage.setItem(LS_KEY_OVERRIDES, JSON.stringify(next || {}));
}

export function mergeEffectiveParams(aircraft, overrides) {
  const ov = overrides?.[aircraft.id] || {};
  return {
    id: aircraft.id,
    nome: aircraft.nome,
    categoria: aircraft.categoria,
    tarifa_km_brl_effective:
      typeof ov.tarifa_km_brl === 'number' ? ov.tarifa_km_brl : aircraft.tarifa_km_brl_default,
    cruise_speed_kt_effective:
      typeof ov.cruise_speed_kt === 'number' ? ov.cruise_speed_kt : aircraft.cruise_speed_kt_default,
    hourly_rate_brl_effective:
      typeof ov.hourly_rate_brl === 'number' ? ov.hourly_rate_brl : aircraft.hourly_rate_brl_default
  };
}

export function setOverride(aircraftId, patch) {
  const all = loadOverrides();
  all[aircraftId] = { ...(all[aircraftId] || {}), ...patch };
  saveOverrides(all);
}

export function clearOverride(aircraftId) {
  const all = loadOverrides();
  delete all[aircraftId];
  saveOverrides(all);
}
