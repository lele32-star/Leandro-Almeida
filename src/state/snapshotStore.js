/* Snapshot Store (freeze) isolado e imutável */
(function(root){
  const KEY = 'quote:last';
  const VERSION = '1.0';
  let frozen = null; // {version, ts, method, snapshot}

  function isFrozen(){ return !!frozen; }
  function getFrozenQuote(){
    if (frozen) return frozen;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.version === VERSION) { frozen = data; return frozen; }
    } catch{}
    return frozen;
  }
  function freezeQuote(method, snapshot){
    frozen = { version: VERSION, ts: Date.now(), method, snapshot: JSON.parse(JSON.stringify(snapshot)) };
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
})(typeof window !== 'undefined' ? window : globalThis);
