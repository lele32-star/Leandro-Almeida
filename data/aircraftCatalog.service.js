// Serviço simples para expor catálogo e overrides
const CATALOG_PATH = './aircraftCatalog.json';
const STORAGE_KEY = 'avCotacao.aircraftOverrides';

let _inMemoryStore = null;

function _hasLocalStorage() {
  try { return typeof localStorage !== 'undefined' && localStorage; } catch (e) { return false; }
}

function getCatalog() {
  // require é síncrono e funciona tanto em Node quanto em bundlers simples
  // eslint-disable-next-line global-require
  const catalog = require(CATALOG_PATH);
  return Array.isArray(catalog) ? catalog : [];
}

function getById(id) {
  return getCatalog().find(c => c.id === id) || null;
}

function loadOverrides() {
  if (_hasLocalStorage()) {
    const raw = localStorage.getItem(STORAGE_KEY);
    try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; 
  }
  return _inMemoryStore || {};
}

function saveOverrides(obj) {
  if (_hasLocalStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || {}));
  } else {
    _inMemoryStore = obj || {};
  }
}

function clearOverrides() {
  saveOverrides({});
}

function getAircraftEffectiveParams(id) {
  const entry = getById(id);
  if (!entry) return null;
  const overrides = loadOverrides();
  const ov = (entry.id && overrides && overrides[entry.id]) ? overrides[entry.id] : {};
  // normalize values: prefer explicit override keys cruise_speed_kt / hourly_rate_brl,
  // fall back to *_default from catalog
  const cruise_speed_kt = Number(ov.cruise_speed_kt ?? ov.cruise_speed_kt_default ?? entry.cruise_speed_kt_default);
  const hourly_rate_brl = Number(ov.hourly_rate_brl ?? ov.hourly_rate_brl_default ?? entry.hourly_rate_brl_default);
  return {
    id: entry.id,
    nome: entry.nome,
    categoria: entry.categoria,
    cruise_speed_kt_default: entry.cruise_speed_kt_default,
    hourly_rate_brl_default: entry.hourly_rate_brl_default,
    cruise_speed_kt,
    hourly_rate_brl
  };
}

module.exports = {
  getCatalog,
  getById,
  loadOverrides,
  saveOverrides,
  clearOverrides,
  getAircraftEffectiveParams,
  STORAGE_KEY
};
