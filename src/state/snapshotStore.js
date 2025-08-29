(function(){
  let _frozen = null;

  function freezeQuote(snapshot) { 
    const snapshotWithTimestamp = { ...snapshot, ts: Date.now() };
    _frozen = JSON.parse(JSON.stringify(snapshotWithTimestamp)); 
    return _frozen; 
  }
  function unfreezeQuote() { _frozen = null; }
  function getFrozenQuote() { return _frozen ? JSON.parse(JSON.stringify(_frozen)) : null; }
  function isFrozen() { return !!_frozen; }
  function assertMutableOrThrow() { if (_frozen) throw new Error('Cotação congelada. Clique em "Novo Pré-Orçamento" para editar.'); }

  // Initialize App namespace if it doesn't exist
  if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.state = Object.assign(window.App.state || {}, { 
      freezeQuote, 
      unfreezeQuote, 
      getFrozenQuote, 
      isFrozen, 
      assertMutableOrThrow 
    });
    
    // Also maintain compatibility with existing SnapshotStore usage
    window.SnapshotStore = { 
      freezeQuote, 
      unfreezeQuote, 
      getFrozenQuote, 
      isFrozen, 
      assertMutableOrThrow 
    };
  }
})();
