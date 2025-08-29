// Cálculo puro do método por distância
// Assumimos que commissionCalcFn(state) retorna { totalComissao, detalhesComissao, commissionAmount }

import { nmToKm, applyExtra } from './utils.js';

export function computeByDistancePure({ nm=0, valorKm=0, valorExtra=0, tipoExtra='soma', aeronave=null, commissions=[] }, commissionCalcFn) {
  const distanciaNm = Number(nm) || 0;
  const distanciaKm = nmToKm(distanciaNm);
  const tarifa = Number(valorKm) || 0;
  const subtotal = distanciaKm * tarifa;

  const { ajusteAplicado, total: subtotalComExtra } = applyExtra(subtotal, valorExtra, tipoExtra);
  const { totalComissao=0, detalhesComissao=[], commissionAmount=0 } = commissionCalcFn ? commissionCalcFn({ subtotal, valorExtra, tipoExtra, commissions, km: distanciaKm, valorKm: tarifa }) : {};
  const comissaoTotal = (totalComissao||0) + (commissionAmount||0);
  const total = subtotalComExtra + comissaoTotal;

  return {
    method: 'distance',
    distanciaNm,
    distanciaKm,
    valorKm: tarifa,
    subtotal,
    ajusteAplicado,
    comissao: comissaoTotal,
    comissaoDetalhes: detalhesComissao,
    commissionAmountExtra: commissionAmount,
    total,
    aeronave,
    raw: { subtotal, ajusteAplicado, totalComissao, commissionAmount }
  };
}

// ES module export above
