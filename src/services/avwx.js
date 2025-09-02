// Serviço AVWX seguro com cache TTL (implementação única etapa 8)
(function(){
  const CACHE_KEY = 'app:quote:avwx-cache';
  function readCache(){ try{ return JSON.parse(localStorage.getItem(CACHE_KEY))||{} } catch { return {} } }
  function writeCache(obj){ try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch(e) { /* ignore cache write */ } }

  async function fetchAirport(code, { token, ttlMs = 300000 } = {}) {
    if (!token) return { ok:false, reason:'token-missing' };
    const icao = String(code||'').toUpperCase();
    if (!/^[A-Z]{4}$/.test(icao)) return { ok:false, reason:'invalid-code' };
    const cache = readCache();
    const now = Date.now();
    const hit = cache[icao];
    if (hit && (now - hit.t) < ttlMs) return { ok:true, data: hit.d, cached:true };
    try {
      const res = await fetch(`https://avwx.rest/api/station/${encodeURIComponent(icao)}`, { headers:{ 'Authorization': token } });
      if (!res.ok) return { ok:false, status: res.status };
      const data = await res.json();
      cache[icao] = { t: now, d: data };
      writeCache(cache);
      return { ok:true, data };
    } catch(e){ return { ok:false, reason:'network', error:String(e) }; }
  }
  safeExport('services', Object.assign(window.App.services || {}, { avwx: { fetchAirport } }));
})();
