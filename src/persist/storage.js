// ETAPA 7: Persistência padronizada + versão
// Implementação simples conforme especificação da etapa.
(function(){
  const PREFIX = 'app:quote:';
  const CURRENT = 1;

  function key(k){ return PREFIX + k; }

  function migrateIfNeeded() {
    // exemplo: se encontrar chaves antigas, migrar para {version, data}
    // mantendo simples (no-op)
  }

  function saveDraft(data) {
    try {
      const payload = { version: CURRENT, data };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key('draft'), JSON.stringify(payload));
      } else {
        // fallback teste
        if (typeof window !== 'undefined') window.__lastDraft = data;
      }
    } catch(e) { /* noop */ }
  }

  function loadDraft() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(key('draft')) : null;
      if (!raw) return null;
      const payload = JSON.parse(raw);
      return payload && payload.data ? payload.data : null;
    } catch { return null; }
  }

  safeExport('persist', Object.assign(window.App.persist || {}, { migrateIfNeeded, saveDraft, loadDraft }));
})();
