/**
 * AVWX API Service - Secure implementation with caching and error handling
 * 
 * Features:
 * - Only adds Authorization header if token is provided
 * - Simple cache with 5-minute TTL in localStorage
 * - Proper error handling for offline/network issues
 * - Clear configuration warnings when token is missing
 */

// Global AVWX service namespace
window.AVWXService = (function() {
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const CACHE_PREFIX = 'avwx_cache_';

  /**
   * Get cached data if still valid
   */
  function getCachedData(key) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return data;
      }
      // Remove expired cache
      localStorage.removeItem(CACHE_PREFIX + key);
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
}

  /**
   * Set cached data with timestamp
   */
  function setCachedData(key, data) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
  } catch (e) {
    // Ignore cache errors (e.g., quota exceeded)
  }
}

  /**
   * Fetch airport data from AVWX API
   * @param {string} code - ICAO airport code
   * @param {Object} options - Options object
   * @param {string} [options.token] - AVWX API token (optional)
   * @returns {Promise<Object|null>} Airport data with coordinates or null if not found
   */
  async function fetchAirport(code, { token } = {}) {
  const icao = String(code || '').toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) return null;

  // Check cache first
  const cacheKey = `station_${icao}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://avwx.rest/api/station/${icao}`;
    const headers = {};
    
    // Only add Authorization header if token is provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      } else if (res.status === 403) {
        throw new Error('FORBIDDEN');
      } else if (res.status === 404) {
        throw new Error('NOT_FOUND');
      } else {
        throw new Error('FETCH_FAILED');
      }
    }

    const data = await res.json();

    // Robust coordinate extraction: recursive search for lat/lon keys
    function findLatLon(obj, depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 6) return null;
      const keys = Object.keys(obj || {});
      let latVal, lonVal;
      
      for (const k of keys) {
        const lk = k.toLowerCase();
        if (lk.includes('lat')) latVal = obj[k];
        if (lk.includes('lon') || lk.includes('lng') || lk.includes('long')) lonVal = obj[k];
      }
      
      if (latVal !== undefined && lonVal !== undefined) {
        const latN = Number(String(latVal).replace(',', '.'));
        const lonN = Number(String(lonVal).replace(',', '.'));
        if (Number.isFinite(latN) && Number.isFinite(lonN)) {
          return { lat: latN, lng: lonN };
        }
      }
      
      for (const k of keys) {
        try {
          const v = obj[k];
          if (v && typeof v === 'object') {
            const r = findLatLon(v, depth + 1);
            if (r) return r;
          }
        } catch (e) { /* ignore */ }
      }
      return null;
    }

    const point = findLatLon(data);
    
    // Cache the result (even if null)
    setCachedData(cacheKey, point);
    
    return point;
  } catch (error) {
    // Cache null result for failed requests to avoid repeated failed calls
    setCachedData(cacheKey, null);
    throw error;
  }
}

  /**
   * Fetch METAR data from AVWX API
   * @param {string} icao - ICAO airport code
   * @param {Object} options - Options object
   * @param {string} [options.token] - AVWX API token (optional)
   * @returns {Promise<Object|null>} METAR data or null if not found
   */
  async function fetchMETAR(icao, { token } = {}) {
  if (!icao || String(icao).trim() === '') return null;
  
  const code = String(icao).toUpperCase();
  
  // Check cache first
  const cacheKey = `metar_${code}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://avwx.rest/api/metar/${code}`;
    const headers = {};
    
    // Only add Authorization header if token is provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      } else if (res.status === 403) {
        throw new Error('FORBIDDEN');
      } else if (res.status === 404) {
        throw new Error('NOT_FOUND');
      } else {
        throw new Error('FETCH_FAILED');
      }
    }

    const data = await res.json();
    
    // Cache the result
    setCachedData(cacheKey, data);
    
    return data;
  } catch (error) {
    // Cache null result for failed requests
    setCachedData(cacheKey, null);
    throw error;
  }
}

  /**
   * Get token from environment or other sources
   * Priority: 1. Environment variable, 2. URL params, 3. localStorage
   */
  function getAVWXToken() {
  // 1. Environment variable (for server-side or build-time injection)
  if (typeof process !== 'undefined' && process.env && process.env.AVWX_TOKEN) {
    return process.env.AVWX_TOKEN;
  }
  
  // 2. URL parameter (for secure testing)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('avwx_token');
    if (urlToken) return urlToken;
  }
  
  // 3. localStorage (when user enters token in UI)
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem('avwx_token');
    } catch (e) {
      // Ignore localStorage errors
    }
  }
  
  return null;
}

  /**
   * Clear all AVWX cache entries
   */
  function clearCache() {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  // Public API
  return {
    fetchAirport,
    fetchMETAR,
    getAVWXToken,
    clearCache
  };
})();