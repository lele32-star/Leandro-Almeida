(async () => {
  const { gerarPDF } = require('../app.js');
  const fetchCalls = [];
  global.fetch = async (url) => { fetchCalls.push(url); return { ok: true, json: async () => ({ latitude: -81.3, longitude: 28.4 }) }; };
  const doc = await gerarPDF({ origem: 'KMCO', destino: 'KSFO', stops: ['KJFK'], showMapa: true });
  console.log('fetchCalls', fetchCalls);
  console.log('doc ok', !!doc);
})();
