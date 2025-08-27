(async () => {
  const { fetchAirportByCode } = require('../app.js');
  // stub global fetch
  global.fetch = async (url, opts) => ({ ok: true, json: async () => ({ latitude: -81.3, longitude: 28.4 }) });
  const p = await fetchAirportByCode('KMCO');
  console.log('result', p);
})();
