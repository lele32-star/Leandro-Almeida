 (function(){
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
