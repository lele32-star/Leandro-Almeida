import { describe, it, expect } from 'vitest';

import '../src/utils/safeExport.js';
import '../src/format/number.js';
import '../src/calc/computeByDistance.js';

describe('computeByDistance', () => {
  const fn = window.App.calc.computeByDistance;
  it('calcula base + adicional + comissão', () => {
    const r = fn({ distanceKm: 100, pricePerKm: 36, fixedAdditions: 5000, commissionPct: 25 });
    expect(Math.round(r.base)).toBe(3600);
    expect(Math.round(r.withAdd)).toBe(8600);
    expect(Math.round(r.total)).toBe(10750);
  });
});
