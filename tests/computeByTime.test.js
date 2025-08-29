import { describe, it, expect } from 'vitest';
import { computeByTimePure } from '../src/calc/computeByTime.js';

function dummyCommission() { return { totalComissao: 0, detalhesComissao: [], commissionAmount: 0 }; }

describe('computeByTimePure', () => {
  it('perna única básica', () => {
    const r = computeByTimePure({ nm: 300, cruise: 300, hourlyRate: 10000 }, dummyCommission);
    // 300 NM / 300 KT = 1h
    expect(r.metodo2.totalHours).toBeCloseTo(1, 4);
    expect(r.subtotal).toBeCloseTo(10000, 2);
    expect(r.total).toBeCloseTo(10000, 2);
  });
  it('múltiplas pernas com taxi e buffer', () => {
    const legs = [ { distNm: 200 }, { distNm: 100 } ]; // total 300 NM
    const r = computeByTimePure({ legs, cruise: 300, hourlyRate: 10000, windPercent: 10, taxiMinutes: 6 }, dummyCommission);
  // Implementação aplica taxi+wind por perna individualmente.
  // Perna1: (200/300)=0.6667+0.1=0.7667*1.1=0.8434
  // Perna2: (100/300)=0.3333+0.1=0.4333*1.1=0.4767
  // Total ≈ 1.3201
  expect(r.metodo2.totalHours).toBeCloseTo(1.32, 2);
  });
  it('mínimo faturável por perna', () => {
    const legs = [ { distNm: 30 }, { distNm: 30 } ];
    const r = computeByTimePure({ legs, cruise: 300, hourlyRate: 6000, minBillableMinutes: 60 }, dummyCommission);
    // Cada perna teria 0.1h, mínimo 1h => 2h total
    expect(r.metodo2.totalHours).toBeCloseTo(2, 4);
    expect(r.subtotal).toBeCloseTo(12000, 2);
  });
  it('custom time override quando showCustom=true', () => {
    const legs = [ { distNm: 100, showCustom: true, custom_time: { hoursDecimal: 2 } } ];
    const r = computeByTimePure({ legs, cruise: 400, hourlyRate: 5000 }, dummyCommission);
    expect(r.metodo2.totalHours).toBeCloseTo(2, 4);
    expect(r.subtotal).toBe(10000);
  });
});
