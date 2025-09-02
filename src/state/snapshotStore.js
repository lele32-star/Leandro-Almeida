 (function(){
  let _frozen = null;

  function freezeQuote(snapshot) { _frozen = JSON.parse(JSON.stringify(snapshot)); return _frozen; }
  function unfreezeQuote() { _frozen = null; }
  function getFrozenQuote() { return _frozen ? JSON.parse(JSON.stringify(_frozen)) : null; }
  function isFrozen() { return !!_frozen; }
  function assertMutableOrThrow() { if (_frozen) throw new Error('Cotação congelada. Clique em "Novo Pré-Orçamento" para editar.'); }

  safeExport('state', Object.assign(window.App.state || {}, { freezeQuote, unfreezeQuote, getFrozenQuote, isFrozen, assertMutableOrThrow }));
 })();
