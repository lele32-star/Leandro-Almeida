 (function(){
  let _catalog = null;

  function loadCatalog(catalog) {
    // catalog: [{id, nome, categoria, cruise_speed_kt_default, hourly_rate_brl_default, ...}]
    _catalog = Array.isArray(catalog) ? catalog.slice() : [];
  }

  function getSelectedAircraftData(state) {
    if (!_catalog) return null;
    const key = state?.aircraftId || state?.aircraftName || state?.aeronave || state?.nome;
    if (!key) return null;
    return _catalog.find(a => a.id === key || a.nome === key) || null;
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

  safeExport('domain', Object.assign(window.App.domain || {}, {
    aircraft: { loadCatalog, getSelectedAircraftData, applyAircraftDefaults, isLockedFromCatalog }
  }));
 })();
