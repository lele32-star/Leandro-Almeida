(function(){
  const CACHE_KEY = 'app:quote:avwx-cache';
  function readCache(){ try{ return JSON.parse(localStorage.getItem(CACHE_KEY))||{} } catch { return {} } }
  function writeCache(obj){ localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); }

  async function fetchAirport(code, { token, ttlMs = 300000 } = {}) {
    if (!token) return { ok:false, reason:'token-missing' };
    const cache = readCache();
    const now = Date.now();
    const hit = cache[code];
    if (hit && (now - hit.t) < ttlMs) return { ok:true, data: hit.d, cached:true };

    try{
      const res = await fetch(`https://avwx.rest/api/station/${encodeURIComponent(code)}`, {
        headers: { 'Authorization': token }
      });
      if (!res.ok) return { ok:false, status: res.status };
      const data = await res.json();
      cache[code] = { t: now, d: data };
      writeCache(cache);
      return { ok:true, data };
    } catch(e){
      return { ok:false, reason:'network', error: String(e) };
    }
  }

  // Initialize App namespace and services if not already available
  if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.services = window.App.services || {};
    window.App.services.avwx = { fetchAirport };
  }
})();
