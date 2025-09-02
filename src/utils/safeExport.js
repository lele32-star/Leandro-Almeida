(function(){
  const root = (typeof window !== 'undefined') ? window : globalThis;
  if (!root.App) root.App = {};
  const fn = function safeExport(ns, obj) {
    const parts = ns.split('.');
    let cursor = root.App;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] = cursor[parts[i]] || {};
      cursor = cursor[parts[i]];
    }
    const last = parts[parts.length - 1];
    cursor[last] = cursor[last] || obj;
    return cursor[last];
  };
  root.safeExport = root.safeExport || fn;
  if (typeof root.safeExport === 'function' && typeof globalThis.safeExport === 'undefined') {
    try { globalThis.safeExport = root.safeExport; } catch(e) { /* ignore attach error */ }
  }
})();
