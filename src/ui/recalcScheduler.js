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
  
  // Export to App.ui.scheduleRecalc
  window.App = window.App || {};
  window.App.ui = window.App.ui || {};
  window.App.ui.scheduleRecalc = scheduleRecalc;
  
  // Also provide a global helper function for easier access
  window.safeScheduleRecalc = function(fn) {
    try {
      if (window.App && window.App.ui && window.App.ui.scheduleRecalc) {
        window.App.ui.scheduleRecalc(fn);
      } else if (typeof fn === 'function') {
        // Fallback: call immediately if scheduler not available
        fn();
      }
    } catch (e) {
      console.warn('[safeScheduleRecalc] Error:', e);
    }
  };
})();
