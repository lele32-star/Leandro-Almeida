/**
 * Aircraft Domain Module
 * Consolidates aircraft catalog loading, selection, defaults application and locking logic
 */

// Global cache for the catalog
let aircraftCatalog = [];

/**
 * Load aircraft catalog from data/aircraftCatalog.json
 * @returns {Promise<Array>} Array of aircraft objects
 */
async function loadCatalog() {
  // Return cached catalog if already loaded
  if (aircraftCatalog.length > 0) {
    return aircraftCatalog;
  }

  try {
    // Try fetch in browser environment
    if (typeof fetch === 'function') {
      const response = await fetch('data/aircraftCatalog.json');
      if (response.ok) {
        const catalog = await response.json();
        if (Array.isArray(catalog)) {
          aircraftCatalog = catalog;
          
          // Expose globally for compatibility with existing code
          if (typeof window !== 'undefined') {
            window.aircraftCatalog = aircraftCatalog;
          }
          
          // Augment with legacy aircraft that might not be in the official catalog
          const legacyAugment = [
            { nome: 'Hawker 400', cruise_speed_kt_default: 430, hourly_rate_brl_default: 18000, tarifa_km_brl_default: 36 },
            { nome: 'Phenom 100', cruise_speed_kt_default: 390, hourly_rate_brl_default: 16500, tarifa_km_brl_default: 36 },
            { nome: 'Citation II', cruise_speed_kt_default: 375, hourly_rate_brl_default: 15000, tarifa_km_brl_default: 36 },
            { nome: 'King Air C90', cruise_speed_kt_default: 280, hourly_rate_brl_default: 12000, tarifa_km_brl_default: 30 },
            { nome: 'Sêneca IV', cruise_speed_kt_default: 190, hourly_rate_brl_default: 6500, tarifa_km_brl_default: 22 },
            { nome: 'Cirrus SR22', cruise_speed_kt_default: 180, hourly_rate_brl_default: 3300, tarifa_km_brl_default: 15 }
          ];
          
          legacyAugment.forEach(legacy => {
            if (!aircraftCatalog.find(a => a.nome === legacy.nome)) {
              const id = legacy.nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              aircraftCatalog.push({ id, categoria: 'legacy', ...legacy });
            }
          });
          
          return aircraftCatalog;
        }
      }
    }
    
    // Fallback: return empty array if fetch fails
    console.warn('Failed to load aircraft catalog, using empty catalog');
    return [];
    
  } catch (error) {
    console.warn('Error loading aircraft catalog:', error);
    return [];
  }
}

/**
 * Get aircraft data for the selected aircraft
 * Consolidates the logic from both duplicate functions in app.js
 * @param {Object} state - Application state containing aeronave selection
 * @returns {Object|null} Aircraft data with hourlyRate, cruiseKtas, tarifaKm
 */
function getSelectedAircraftData(state) {
  const selectValue = state?.aeronave || (typeof document !== 'undefined' ? document.getElementById('aeronave')?.value : null);
  
  if (!selectValue) {
    return null;
  }

  // Ensure catalog is available (use global window.aircraftCatalog or local cache)
  const catalog = (typeof window !== 'undefined' && window.aircraftCatalog) || aircraftCatalog;
  
  if (!Array.isArray(catalog) || catalog.length === 0) {
    console.warn('Aircraft catalog not loaded');
    return null;
  }

  // Search by id, nome, or modelo for maximum compatibility
  const aircraft = catalog.find(a => 
    a.id === selectValue || 
    a.nome === selectValue || 
    a.modelo === selectValue
  );
  
  if (!aircraft) {
    console.warn(`Aircraft "${selectValue}" not found in catalog`);
    return null;
  }

  // Legacy fallback values for compatibility
  const valoresKm = {
    "Hawker 400": 36,
    "Phenom 100": 36,
    "Citation II": 36,
    "King Air C90": 30,
    "Sêneca IV": 22,
    "Cirrus SR22": 15
  };

  return {
    hourlyRate: aircraft.hourly_rate_brl_default || aircraft.hourlyRate || 0,
    cruiseKtas: aircraft.cruise_speed_kt_default || aircraft.cruiseKtas || 0,
    tarifaKm: aircraft.tarifa_km_brl_default || aircraft.tarifaKm || valoresKm[selectValue] || 0
  };
}

/**
 * Apply aircraft defaults to form fields
 * @param {Object} state - Current application state
 * @param {Object} aircraft - Aircraft data from getSelectedAircraftData
 */
function applyAircraftDefaults(state, aircraft) {
  if (!aircraft || typeof document === 'undefined') {
    return;
  }

  // Get form elements
  const hourlyInput = document.getElementById('hourlyRate');
  const cruiseInput = document.getElementById('cruiseSpeed');
  const tarifaInput = document.getElementById('tarifa');
  
  // Apply hourly rate if field exists and is empty or default
  if (hourlyInput && aircraft.hourlyRate && (!hourlyInput.value || hourlyInput.value === '' || hourlyInput.value == hourlyInput.defaultValue)) {
    hourlyInput.value = aircraft.hourlyRate;
    hourlyInput.placeholder = `R$ ${Number(aircraft.hourlyRate).toLocaleString('pt-BR')}/h`;
    hourlyInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Apply cruise speed if field exists and is empty or default
  if (cruiseInput && aircraft.cruiseKtas && (!cruiseInput.value || cruiseInput.value === '' || cruiseInput.value == cruiseInput.defaultValue)) {
    cruiseInput.value = aircraft.cruiseKtas;
    cruiseInput.placeholder = `${aircraft.cruiseKtas} KTAS`;
    cruiseInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Apply tarifa with localStorage persistence
  if (tarifaInput && aircraft.tarifaKm) {
    const LKEY = 'cotacao:tarifas';
    let store = {};
    try {
      store = JSON.parse(localStorage.getItem(LKEY) || '{}');
    } catch (e) {
      store = {};
    }
    
    const saved = store[state.aeronave];
    
    if (saved !== undefined && saved !== null) {
      tarifaInput.value = saved;
    } else if (!tarifaInput.value || tarifaInput.value === '') {
      tarifaInput.value = aircraft.tarifaKm;
    }
    
    // Update preview if exists
    const tarifaPreview = document.getElementById('tarifaPreview');
    if (tarifaPreview) {
      tarifaPreview.textContent = tarifaInput.value ? 
        `R$ ${Number(tarifaInput.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/km` : '';
    }
  }
}

/**
 * Check if aircraft parameters are locked from catalog (readonly mode)
 * @param {Object} state - Current application state
 * @returns {boolean} True if parameters should be locked/readonly
 */
function isLockedFromCatalog(state) {
  // Check if there's a global state indicating parameters are locked
  if (typeof window !== 'undefined' && window.__aircraftParamsState) {
    return !window.__aircraftParamsState.isEditable;
  }
  
  // Default behavior: parameters are locked to catalog values
  return true;
}

// For CommonJS compatibility (Node.js environment like tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadCatalog,
    getSelectedAircraftData,
    applyAircraftDefaults,
    isLockedFromCatalog
  };
}

// For ES modules compatibility
if (typeof window !== 'undefined') {
  window.aircraftDomain = {
    loadCatalog,
    getSelectedAircraftData,
    applyAircraftDefaults,
    isLockedFromCatalog
  };
}

export {
  loadCatalog,
  getSelectedAircraftData,
  applyAircraftDefaults,
  isLockedFromCatalog
};