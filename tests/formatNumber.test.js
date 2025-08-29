import { describe, it, expect } from 'vitest';
import '../src/utils/safeExport.js';
import '../src/format/number.js';

describe('format/number', () => {
  const { parseBRNumber, formatNumber, formatBRL } = window.App.format;
  it('parseBRNumber lida com formato brasileiro', () => {
    expect(parseBRNumber('1.234,56')).toBeCloseTo(1234.56, 2);
    expect(parseBRNumber('2.500')).toBeCloseTo(2500, 2);
    expect(parseBRNumber('3,5')).toBeCloseTo(3.5, 2);
  });
  it('formatNumber fixa casas', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50');
  });
  it('formatBRL inclui símbolo', () => {
    expect(formatBRL(10)).toMatch(/R\$/);
  });
});
