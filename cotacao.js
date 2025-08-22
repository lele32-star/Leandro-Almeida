function valorParcial(distanciaKm, valorKm) {
  return distanciaKm * valorKm;
}

function valorTotal(distanciaKm, valorKm, valorExtra = 0) {
  return valorParcial(distanciaKm, valorKm) + valorExtra;
}

if (typeof module !== 'undefined') {
  module.exports = { valorParcial, valorTotal };
} else if (typeof window !== 'undefined') {
  window.valorParcial = valorParcial;
  window.valorTotal = valorTotal;
}
