import { describe, expect, it } from 'vitest';
import { money, parseDecimalInput } from './money';

describe('decimal input', () => {
  it.each([
    ['100\u00a0000,50', '100000.50'], ['100\u202f000,50', '100000.50'],
    [' 100 000.50 ', '100000.50'], ['-12,05', '-12.05'], ['0', '0'],
    ['', null], ['12abc', null], ['Infinity', null], ['NaN', null],
    ['1e3', null], ['1,2.3', null], ['1 2', null], ['12\n34', null],
  ])('normalizes %j to %j', (raw, expected) => {
    expect(parseDecimalInput(raw)).toBe(expected);
  });
  it('rounds half up to kopecks without binary rounding', () => {
    expect(money('1.005')).toBe('1.01');
    expect(money('0')).toBe('0.00');
    expect(money('-0.001')).toBe('0.00');
    expect(money('999999999999.995')).toBe('1000000000000.00');
  });
  it('rejects nonfinite output', () => {
    expect(() => money('Infinity')).toThrow();
  });
});
