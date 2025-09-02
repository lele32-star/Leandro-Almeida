import { describe, it, expect } from 'vitest';

import '../src/utils/safeExport.js';
import '../src/calc/computeByTime.js';

describe('computeByTime', () => {
  const fn = window.App.calc.computeByTime;
  it('múltiplas pernas com taxi/buffer', () => {
    const r = fn({
      legs: [{distanceNm: 300, cruiseKt: 200}, {distanceNm: 200, cruiseKt: 200}],
      defaults: { taxiMin: 10, bufferMin: 5 },
      hourlyRate: 8700,
      commissionPct: 25
    });
    expect(r.hours).toBeGreaterThan(0);
    expect(r.total).toBeGreaterThan(r.base);
  });
});
