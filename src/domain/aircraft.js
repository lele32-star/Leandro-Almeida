// safeExport utility to ensure App.domain structure exists
function safeExport(namespace, exports) {
  if (typeof window === 'undefined') return;
  if (!window.App) window.App = {};
  if (!window.App[namespace]) window.App[namespace] = {};
  Object.assign(window.App[namespace], exports);
}

(function(){
  let _catalog = null;

  function loadCatalog(catalog) {
    // catalog: [{id, nome, categoria, cruise_speed_kt_default, hourly_rate_brl_default, ...}]
    _catalog = Array.isArray(catalog) ? catalog.slice() : [];
  }

  function getSelectedAircraftData(state) {
    if (!_catalog) return null;
    const id = state?.aircraftId || state?.aeronave || state;
    if (!id) return null;
    return _catalog.find(a => a.id === id || a.nome === id) || null;
  }

  function applyAircraftDefaults(state, aircraft) {
    // aplica cruise/hora se o campo estiver vazio ou bloqueado pelo catálogo
    const s = Object.assign({}, state);
    if (!s.params) s.params = {};
    if (aircraft?.cruise_speed_kt_default && (s.params.cruiseKtFromCatalog || !s.params.cruiseKt)) {
      s.params.cruiseKt = aircraft.cruise_speed_kt_default;
      s.params.cruiseKtFromCatalog = true;
    }
    if (aircraft?.hourly_rate_brl_default && (s.params.hourlyFromCatalog || !s.params.hourlyRate)) {
      s.params.hourlyRate = aircraft.hourly_rate_brl_default;
      s.params.hourlyFromCatalog = true;
    }
    return s;
  }

  function isLockedFromCatalog(state) {
    // se flags *FromCatalog estiverem ativas, UI deve tratar como readonly
    return Boolean(state?.params?.cruiseKtFromCatalog || state?.params?.hourlyFromCatalog);
  }

  safeExport('domain', {
    aircraft: { loadCatalog, getSelectedAircraftData, applyAircraftDefaults, isLockedFromCatalog }
  });
})();
