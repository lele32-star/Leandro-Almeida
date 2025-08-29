/* Serviço AVWX seguro com cache TTL.
 * fetchAirport(code,{token, ttlMs}) retorna { lat, lng } ou null.
 * Cache: localStorage (quando disponível) usando chave app:quote:avwx:station:<ICAO>
 */
(function(root){
  const PREFIX = 'app:quote:avwx:station:';
  const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  function now(){ return Date.now(); }
  function getLS(){ try { if (typeof localStorage !== 'undefined') return localStorage; } catch(e){} return null; }
  function cacheKey(code){ return PREFIX + code; }

  function readCache(code){
    const ls = getLS(); if(!ls) return null;
    try { const raw = ls.getItem(cacheKey(code)); if(!raw) return null; const obj = JSON.parse(raw); if (obj.expiresAt && obj.expiresAt > now()) return obj.value; return null; } catch(e){ return null; }
  }
  function writeCache(code, value, ttlMs){
    const ls = getLS(); if(!ls) return;
    try { ls.setItem(cacheKey(code), JSON.stringify({ value, expiresAt: now() + (ttlMs||DEFAULT_TTL) })); } catch(e){}
  }

  async function fetchAirport(code, opts){
    const icao = String(code||'').toUpperCase();
    if(!/^([A-Z]{4})$/.test(icao)) return null;
    const cached = readCache(icao); if (cached) return cached;
    const token = opts && opts.token; // só injeta se fornecido
    if (!token) {
      // Sem token -> retorna null e deixa UI avisar
      return null;
    }
    const url = `https://avwx.rest/api/station/${icao}`;
    const headers = { 'Accept':'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(url, { headers });
    } catch(e) {
      return { error: 'offline' };
    }
    if (!res.ok) return { error: 'http', status: res.status };
    let data; try { data = await res.json(); } catch(e){ return { error: 'parse' }; }

    function findLatLon(obj, depth=0){
      if(!obj || typeof obj !== 'object' || depth>6) return null;
      const keys = Object.keys(obj);
      let latVal, lonVal;
      for(const k of keys){ const lk = k.toLowerCase(); if(lk.includes('lat')) latVal = obj[k]; if(lk.includes('lon')||lk.includes('lng')||lk.includes('long')) lonVal = obj[k]; }
      if(latVal!==undefined && lonVal!==undefined){
        const latN = Number(String(latVal).replace(',','.'));
        const lonN = Number(String(lonVal).replace(',','.'));
        if(Number.isFinite(latN) && Number.isFinite(lonN)) return { lat: latN, lng: lonN };
      }
      for(const k of keys){ const v = obj[k]; if(v && typeof v === 'object'){ const r = findLatLon(v, depth+1); if(r) return r; } }
      return null;
    }
    const point = findLatLon(data);
    if (point) writeCache(icao, point, opts && opts.ttlMs);
    return point || null;
  }

  root.AVWXService = { fetchAirport };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AVWXService;
})(typeof window !== 'undefined' ? window : globalThis);
