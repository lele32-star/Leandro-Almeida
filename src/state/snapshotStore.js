/* Snapshot Store (freeze) isolado e imutável */
(function(root){
  const KEY = 'quote:last';
  const VERSION = '1.0';
  let frozen = null; // {version, ts, method, snapshot}

  function isFrozen(){ return !!frozen; }
  function getFrozenQuote(){
    if (frozen) return frozen.snapshot;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.version === VERSION) { 
        frozen = data; 
        return frozen.snapshot;
      }
    } catch{}
    return frozen ? frozen.snapshot : null;
  }
  function freezeQuote(snapshot, method){
    // Handle both signatures: freezeQuote(snapshot) and freezeQuote(method, snapshot)
    let actualMethod = method;
    let actualSnapshot = snapshot;
    
    if (typeof snapshot === 'string' && typeof method === 'object') {
      // Legacy signature: freezeQuote(method, snapshot)
      actualMethod = snapshot;
      actualSnapshot = method;
    } else if (typeof snapshot === 'object' && method === undefined) {
      // New signature: freezeQuote(snapshot)
      actualMethod = 'manual';
      actualSnapshot = snapshot;
    }
    
    frozen = { version: VERSION, ts: Date.now(), method: actualMethod, snapshot: JSON.parse(JSON.stringify(actualSnapshot)) };
    try { localStorage.setItem(KEY, JSON.stringify(frozen)); } catch{}
    return frozen;
  }
  function unfreezeQuote(){
    frozen = null;
    try { localStorage.removeItem(KEY); } catch{}
  }
  function assertMutableOrThrow(){
    if (isFrozen()) throw new Error('QuoteFrozen');
  }
  const api = { isFrozen, getFrozenQuote, freezeQuote, unfreezeQuote, assertMutableOrThrow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SnapshotStore = api;
  
  // Expose to window.App.state for tests
  if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.state = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
