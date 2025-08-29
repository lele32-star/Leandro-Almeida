(function(){
  const root = (typeof window !== 'undefined') ? window : globalThis;
  if (!root.App) root.App = {};
  root.safeExport = function safeExport(ns, obj) {
    const parts = ns.split('.');
    let cursor = root.App;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] = cursor[parts[i]] || {};
      cursor = cursor[parts[i]];
    }
    const last = parts[parts.length - 1];
    // não sobreescreve se já existir (incremental)
    cursor[last] = cursor[last] || obj;
    return cursor[last];
  };
})();