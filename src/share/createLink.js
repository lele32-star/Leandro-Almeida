(function(){
  function createShareLink(snapshot) {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const revoke = () => { try { URL.revokeObjectURL(url); } catch {} };
    return { url, revoke };
  }
  safeExport('share', Object.assign(window.App.share || {}, { createShareLink }));
})();
