/* Persistência padronizada de drafts com prefixo e versionamento.
 * Prefixo: app:quote:
 * Versão atual do schema de draft: 1
 * Funções expostas: saveDraft(state), loadDraft(), migrateIfNeeded()
 */
(function(root){
  const PREFIX = 'app:quote:';
  const KEY_DRAFT = PREFIX + 'draft';
  const KEY_VERSION = PREFIX + 'draftVersion';
  const CURRENT_VERSION = 1;
  const LEGACY_KEY = 'cotacao:currentDraft';

  function getLS(){ try { if (typeof localStorage !== 'undefined') return localStorage; } catch(e){} return null; }

  function migrateIfNeeded(){
    const ls = getLS(); if(!ls) return null;
    // Se já existe draft versionado, nada a fazer
    try {
      const existing = ls.getItem(KEY_DRAFT);
      if (existing) return JSON.parse(existing);
    } catch(e) {}
    // Procurar legacy
    let legacyRaw = null;
    try { legacyRaw = ls.getItem(LEGACY_KEY); } catch(e) {}
    if (!legacyRaw && typeof root !== 'undefined' && root.__lastDraft) {
      try { legacyRaw = JSON.stringify(root.__lastDraft); } catch(e) {}
    }
    if (!legacyRaw) return null;
    let legacyObj = null;
    try { legacyObj = JSON.parse(legacyRaw); } catch(e){ legacyObj=null; }
    if (!legacyObj) return null;
    const wrapped = { draftVersion: CURRENT_VERSION, savedAt: new Date().toISOString(), data: legacyObj };
    try {
      ls.setItem(KEY_DRAFT, JSON.stringify(wrapped));
      ls.setItem(KEY_VERSION, String(CURRENT_VERSION));
    } catch(e) {}
    return wrapped;
  }

  function saveDraft(state){
    const ls = getLS();
    const payload = {
      draftVersion: CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      data: state
    };
    if (ls) {
      try {
        ls.setItem(KEY_DRAFT, JSON.stringify(payload));
        ls.setItem(KEY_VERSION, String(CURRENT_VERSION));
        return true;
      } catch(e) { /* ignore */ }
    }
    // fallback ambiente de teste
    try { root.__lastDraftVersioned = payload; } catch(e) {}
    return false;
  }

  function loadDraft(){
    const ls = getLS();
    let raw = null;
    if (ls) {
      try { raw = ls.getItem(KEY_DRAFT); } catch(e){}
    }
    if (!raw && typeof root !== 'undefined' && root.__lastDraftVersioned) {
      try { raw = JSON.stringify(root.__lastDraftVersioned); } catch(e) {}
    }
    if (!raw) {
      // tentar migrar on-demand
      const migrated = migrateIfNeeded();
      if (!migrated) return null;
      return migrated;
    }
    try { return JSON.parse(raw); } catch(e){ return null; }
  }

  const api = { saveDraft, loadDraft, migrateIfNeeded, constants:{ PREFIX, KEY_DRAFT, CURRENT_VERSION } };
  root.StoragePersist = api;
  // Opcional: export CommonJS
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
