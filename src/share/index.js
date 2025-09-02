(function(){
  async function createShareLink(snapshot) {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try { 
      await navigator.clipboard.writeText(url); 
    } catch(e) { 
      // Silently ignore clipboard errors - fallback will be handled by caller
    }
    return url;
  }
  safeExport('share', Object.assign(window.App.share || {}, { createShareLink }));
})();