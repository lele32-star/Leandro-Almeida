/* Domínio de Aeronaves: catálogo e defaults centralizados
   Mantém compatibilidade via window.AircraftDomain
*/
(function(root){
  const STATE = {
    catalog: [],
    loaded: false,
    loading: false
  };

  const LEGACY_AUGMENT = [
    { nome: 'Hawker 400', cruise_speed_kt_default: 430, hourly_rate_brl_default: 18000, tarifa_km_brl_default: 36 },
    { nome: 'Phenom 100', cruise_speed_kt_default: 390, hourly_rate_brl_default: 16500, tarifa_km_brl_default: 36 },
    { nome: 'Citation II', cruise_speed_kt_default: 375, hourly_rate_brl_default: 15000, tarifa_km_brl_default: 36 },
    { nome: 'Sêneca IV', cruise_speed_kt_default: 190, hourly_rate_brl_default: 6500, tarifa_km_brl_default: 22 },
    { nome: 'Cirrus SR22', cruise_speed_kt_default: 180, hourly_rate_brl_default: 3300, tarifa_km_brl_default: 15 }
  ];

  function ensureId(entry){
    if (!entry.id) entry.id = entry.nome.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    return entry;
  }

  function mergeLegacy(){
    LEGACY_AUGMENT.forEach(l => {
      if (!STATE.catalog.find(a => a.nome === l.nome)) STATE.catalog.push(ensureId({ categoria:'legacy', ...l }));
    });
  }

  function loadCatalog(){
    if (STATE.loaded) return Promise.resolve(STATE.catalog);
    if (STATE.loading) return new Promise(res => { const int = setInterval(()=>{ if(STATE.loaded){clearInterval(int); res(STATE.catalog);} },100); });
    STATE.loading = true;
    if (typeof fetch !== 'function') { STATE.loaded = true; mergeLegacy(); root.aircraftCatalog = STATE.catalog; return Promise.resolve(STATE.catalog); }
    return fetch('data/aircraftCatalog.json')
      .then(r => r.ok ? r.json() : [])
      .catch(()=>[])
      .then(list => {
        if (Array.isArray(list)) STATE.catalog = list.map(ensureId); else STATE.catalog = [];
        mergeLegacy();
        STATE.loaded = true; STATE.loading = false;
        root.aircraftCatalog = STATE.catalog;
        return STATE.catalog;
      });
  }

  function getSelectedAircraftData(value){
    if (!value) return null;
    const cat = root.aircraftCatalog || STATE.catalog;
    if (!Array.isArray(cat)) return null;
    return cat.find(a => a.nome === value || a.id === value) || null;
  }

  function applyAircraftDefaults(target, aircraft){
    if (!aircraft || !target) return target;
    target.hourlyRate = aircraft.hourly_rate_brl_default || target.hourlyRate || 0;
    target.cruiseKtas = aircraft.cruise_speed_kt_default || target.cruiseKtas || 0;
    target.tarifaKm = aircraft.tarifa_km_brl_default || target.tarifaKm || 0;
    return target;
  }

  function isLockedFromCatalog(){
    const st = root.__aircraftParamsState;
    if (!st) return true; // default bloqueado
    return !st.isEditable;
  }

  const api = { loadCatalog, getSelectedAircraftData, applyAircraftDefaults, isLockedFromCatalog };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AircraftDomain = api;
})(typeof window !== 'undefined' ? window : globalThis);
