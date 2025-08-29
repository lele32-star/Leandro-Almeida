(function(){
  // Helper function to safely export to nested namespace
  function safeExport(namespace, obj) {
    if (typeof window === 'undefined') return;
    window.App = window.App || {};
    window.App[namespace] = obj;
  }

  let pending = false;
  function scheduleRecalc(fn) {
    if (pending) return;
    pending = true;
    Promise.resolve().then(() => {
      pending = false;
      try { fn && fn(); } catch (e) { console.error('[scheduleRecalc]', e); }
    });
  }
  safeExport('ui', Object.assign(window.App.ui || {}, { scheduleRecalc }));
})();
