// Cálculo puro do método por tempo
// legs: [{ distNm, custom_time(optional:{hoursDecimal,hhmm}), showCustom }]
// cruise: KTAS
// commissionCalcFn assinatura igual ao distance

import { nmToKm, applyExtra, adjustLegTime } from './utils.js';

export function computeByTimePure({ nm=0, valorKm=0, valorExtra=0, tipoExtra='soma', aeronave=null, commissions=[], legs=[], cruise=0, hourlyRate=0, windPercent=0, taxiMinutes=0, minBillableMinutes=0 }, commissionCalcFn) {
  const distanciaNm = Number(nm) || 0;
  const distanciaKm = nmToKm(distanciaNm);
  const tarifa = Number(valorKm) || 0; // mantido como referência
  const ktas = Number(cruise) || 0;
  const hrRate = Number(hourlyRate) || 0;

  // Se não houver pernas fornecidas, criar uma perna única
  const legsList = Array.isArray(legs) && legs.length ? legs.slice() : [{ distNm: distanciaNm }];

  function baseLegHours(distNm) {
    if (!ktas || !distNm) return 0;
    return Number((distNm / ktas).toFixed(4));
  }

  let totalHours = 0;
  const legsComputed = legsList.map((l) => {
    const distNmLeg = Number(l.distNm)||0;
    const base = baseLegHours(distNmLeg);
    let finalHours;
    if (l.showCustom && l.custom_time && typeof l.custom_time.hoursDecimal === 'number') {
      finalHours = Number(l.custom_time.hoursDecimal.toFixed(4));
    } else {
      finalHours = adjustLegTime(base, { windPercent, taxiMinutes, minBillableMinutes });
    }
    totalHours += finalHours;
    const totalMinutes = Math.round(finalHours * 60);
    const hh = Math.floor(totalMinutes/60);
    const mm = totalMinutes % 60;
    const hhmm = `${hh}:${String(mm).padStart(2,'0')}`;
    return { distNm: distNmLeg, hoursDecimal: finalHours, hhmm };
  });

  const subtotal = totalHours * hrRate;
  const { ajusteAplicado, total: subtotalComExtra } = applyExtra(subtotal, valorExtra, tipoExtra);
  const { totalComissao=0, detalhesComissao=[], commissionAmount=0 } = commissionCalcFn ? commissionCalcFn({ subtotal, valorExtra, tipoExtra, commissions, km: distanciaKm, valorKm: tarifa }) : {};
  const comissaoTotal = (totalComissao||0) + (commissionAmount||0);
  const total = subtotalComExtra + comissaoTotal;
  const mins = Math.round(totalHours*60);
  const hh = Math.floor(mins/60);
  const mm = mins % 60;
  const totalHhmm = `${hh}:${String(mm).padStart(2,'0')}`;

  return {
    method: 'time',
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
    metodo2: { hourlyRate: hrRate, cruise: ktas, totalHours, totalHhmm, windPercent, taxiMinutes, minBillable: minBillableMinutes },
    legs: legsComputed.map(l => ({ distNm: l.distNm })),
    raw: { subtotal, ajusteAplicado, totalHours, hourlyRate: hrRate }
  };
}

// ES module export above
