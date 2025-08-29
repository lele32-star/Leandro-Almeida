import { describe, it, expect } from 'vitest';
import { computeByDistancePure } from '../src/calc/computeByDistance.js';

function dummyCommission() { return { totalComissao: 0, detalhesComissao: [], commissionAmount: 0 }; }

describe('computeByDistancePure', () => {
  it('calcula subtotal básico e total sem extras', () => {
    const r = computeByDistancePure({ nm: 100, valorKm: 10 }, dummyCommission);
    expect(r.distanciaKm).toBeCloseTo(185.2, 3);
    expect(r.subtotal).toBeCloseTo(1852, 2);
    expect(r.total).toBeCloseTo(1852, 2);
  });
  it('aplica acréscimo', () => {
    const r = computeByDistancePure({ nm: 50, valorKm: 20, valorExtra: 100, tipoExtra: 'soma' }, dummyCommission);
    expect(r.subtotal).toBeCloseTo(50*1.852*20, 2);
    expect(r.ajusteAplicado).toBe(100);
    expect(r.total).toBeCloseTo(r.subtotal + 100, 2);
  });
  it('aplica desconto', () => {
    const r = computeByDistancePure({ nm: 50, valorKm: 20, valorExtra: 100, tipoExtra: 'subtrai' }, dummyCommission);
    expect(r.ajusteAplicado).toBe(-100);
    expect(r.total).toBeCloseTo(r.subtotal - 100, 2);
  });
});
