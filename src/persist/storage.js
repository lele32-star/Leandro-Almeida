/**
 * Standardized localStorage with app:quote: prefix and versioned drafts
 * Fase 6 — Persistência padronizada + drafts versionados
 */

// Standardized prefix for all storage keys
const STORAGE_PREFIX = 'app:quote:';

// Current draft version for schema evolution
const CURRENT_DRAFT_VERSION = 1;

// Storage keys with standardized prefix
const KEYS = {
  DRAFT: `${STORAGE_PREFIX}draft`,
  TARIFFS: `${STORAGE_PREFIX}tariffs`,
  OVERRIDES: `${STORAGE_PREFIX}overrides`,
  PDF_METHOD: `${STORAGE_PREFIX}pdfMethod`,
  PDF_TOGGLES: `${STORAGE_PREFIX}pdfToggles`,
  FROZEN_QUOTE: `${STORAGE_PREFIX}frozenQuote`
};

// Legacy keys for migration
const LEGACY_KEYS = {
  DRAFT: 'cotacao:currentDraft',
  TARIFFS: 'cotacao:tarifas',
  OVERRIDES: 'avCotacao.aircraftOverrides',
  PDF_METHOD: 'selectedMethodPdf',
  PDF_TOGGLES: 'pdfInlineToggles',
  FROZEN_QUOTE: 'quote:last'
};

/**
 * Safe localStorage wrapper
 */
function safeGetItem(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (e) {
    // ignore storage errors
  }
  return false;
}

function safeRemoveItem(key) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // ignore storage errors
  }
}

/**
 * Migration function to move data from legacy keys to standardized keys
 */
function migrateIfNeeded() {
  let migrated = false;

  // Check if migration is needed (no standardized keys exist but legacy keys do)
  const hasDraftData = safeGetItem(KEYS.DRAFT);
  const hasLegacyDraftData = safeGetItem(LEGACY_KEYS.DRAFT);

  if (!hasDraftData && hasLegacyDraftData) {
    try {
      const legacyData = JSON.parse(hasLegacyDraftData);
      // Add version to legacy draft and save with new key
      const versionedDraft = {
        ...legacyData,
        draftVersion: CURRENT_DRAFT_VERSION,
        migratedFrom: 'legacy',
        migrationTimestamp: new Date().toISOString()
      };
      safeSetItem(KEYS.DRAFT, JSON.stringify(versionedDraft));
      migrated = true;
    } catch (e) {
      // ignore migration errors for drafts
    }
  }

  // Migrate other data types if they exist in legacy locations
  Object.entries(LEGACY_KEYS).forEach(([type, legacyKey]) => {
    if (type === 'DRAFT') return; // already handled above

    const standardKey = KEYS[type];
    const hasStandardData = safeGetItem(standardKey);
    const hasLegacyData = safeGetItem(legacyKey);

    if (!hasStandardData && hasLegacyData) {
      safeSetItem(standardKey, hasLegacyData);
      migrated = true;
    }
  });

  return migrated;
}

/**
 * Save draft with versioning
 */
function saveDraft(state) {
  if (!state) return false;

  try {
    const versionedDraft = {
      state,
      draftVersion: CURRENT_DRAFT_VERSION,
      timestamp: new Date().toISOString(),
      legsData: state.legsData || [],
      advancedPlanning: state.advancedPlanning || null
    };

    const success = safeSetItem(KEYS.DRAFT, JSON.stringify(versionedDraft));
    
    // Fallback for testing environments
    if (!success && typeof window !== 'undefined') {
      window.__lastDraft = versionedDraft;
      return true;
    }

    return success;
  } catch (e) {
    return false;
  }
}

/**
 * Load draft with migration support
 */
function loadDraft() {
  // First, ensure migration has been attempted
  migrateIfNeeded();

  try {
    let rawData = safeGetItem(KEYS.DRAFT);
    
    // Fallback to legacy key if no standardized data
    if (!rawData) {
      rawData = safeGetItem(LEGACY_KEYS.DRAFT);
    }
    
    // Fallback for testing environments
    if (!rawData && typeof window !== 'undefined' && window.__lastDraft) {
      rawData = JSON.stringify(window.__lastDraft);
    }

    if (!rawData) return null;

    const draftData = JSON.parse(rawData);
    
    // Handle legacy drafts (no draftVersion)
    if (!draftData.draftVersion) {
      // Legacy draft - add version and re-save with new key
      draftData.draftVersion = CURRENT_DRAFT_VERSION;
      draftData.migratedFrom = 'legacy';
      draftData.migrationTimestamp = new Date().toISOString();
      
      // Save migrated draft to new location
      safeSetItem(KEYS.DRAFT, JSON.stringify(draftData));
    }

    return draftData;
  } catch (e) {
    return null;
  }
}

/**
 * Generic storage functions with standardized keys
 */
function saveData(type, data) {
  const key = KEYS[type.toUpperCase()];
  if (!key) return false;
  
  return safeSetItem(key, JSON.stringify(data || {}));
}

function loadData(type) {
  const key = KEYS[type.toUpperCase()];
  const legacyKey = LEGACY_KEYS[type.toUpperCase()];
  
  if (!key) return null;

  try {
    // Try standardized key first
    let rawData = safeGetItem(key);
    
    // Fallback to legacy key if no standardized data
    if (!rawData && legacyKey) {
      rawData = safeGetItem(legacyKey);
      // If found in legacy location, migrate it
      if (rawData) {
        safeSetItem(key, rawData);
      }
    }

    return rawData ? JSON.parse(rawData) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Clear specific data type
 */
function clearData(type) {
  const key = KEYS[type.toUpperCase()];
  if (key) {
    safeRemoveItem(key);
  }
}

// Export API
const StorageAPI = {
  saveDraft,
  loadDraft,
  migrateIfNeeded,
  saveData,
  loadData,
  clearData,
  keys: KEYS,
  legacyKeys: LEGACY_KEYS
};

// Browser global
if (typeof window !== 'undefined') {
  window.StorageAPI = StorageAPI;
}

// ES module export
export default StorageAPI;
export { saveDraft, loadDraft, migrateIfNeeded, saveData, loadData, clearData };