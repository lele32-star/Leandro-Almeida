(function(){
  const PREFIX = 'app:quote:';
  const CURRENT = 1;

  function key(k){ return PREFIX + k; }

  function migrateIfNeeded() {
    // exemplo: se encontrar chaves antigas, migrar para {version, data}
    // mantenha simples (no-op se nada antigo encontrado)
  }

  function saveDraft(data) {
    const payload = { version: CURRENT, data };
    localStorage.setItem(key('draft'), JSON.stringify(payload));
    return true;
  }

  function loadDraft() {
    const raw = localStorage.getItem(key('draft'));
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw);
      // Return the payload with data property for compatibility with app.js
      return { data: payload?.data ?? null };
    } catch { return null; }
  }

  // Expose via window.StoragePersist for compatibility with existing app.js
  if (typeof window !== 'undefined') {
    window.StoragePersist = { migrateIfNeeded, saveDraft, loadDraft };
  }
})();
