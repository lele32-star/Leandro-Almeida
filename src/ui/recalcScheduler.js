/* Debounce central para recálculo UI
   scheduleRecalc(fn, {delay, microtask})
   - delay: ms (default 0)
   - microtask: se true, usa Promise.resolve; senão, requestAnimationFrame
*/
(function(root){
  let timer = null;
  function scheduleRecalc(fn, {delay=0, microtask=true}={}){
    if (timer) clearTimeout(timer);
    if (delay > 0) {
      timer = setTimeout(fn, delay);
      return;
    }
    if (microtask) {
      timer = setTimeout(()=>Promise.resolve().then(fn), 0);
    } else {
      timer = setTimeout(()=>requestAnimationFrame(fn), 0);
    }
  }
  root.scheduleRecalc = scheduleRecalc;
  if (typeof module !== 'undefined' && module.exports) module.exports = { scheduleRecalc };
})(typeof window !== 'undefined' ? window : globalThis);
