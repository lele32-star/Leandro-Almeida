function valorParcial(distanciaKm, valorKm) {
  return distanciaKm * valorKm;
}

function valorTotal(distanciaKm, valorKm, valorExtra = 0) {
  return valorParcial(distanciaKm, valorKm) + valorExtra;
}

module.exports = { valorParcial, valorTotal };
