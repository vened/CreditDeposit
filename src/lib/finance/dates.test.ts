import { describe, expect, it } from 'vitest';
import { addDays, addMonthsClamped, daysBetween, daysInYear, firstOfNextMonth, isISODate } from './dates';

describe('UTC calendar', () => {
  it('counts leap day and crosses year and daylight-saving boundaries', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(daysInYear('2024-01-01')).toBe(366);
    expect(daysInYear('2100-01-01')).toBe(365);
  });
  it('clamps from the original anniversary without accumulating February drift', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
    expect(firstOfNextMonth('2026-12-31')).toBe('2027-01-01');
  });
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '26-01-01', '', '2026-01-01T00:00:00Z'])('rejects invalid ISO date %j', raw => {
    expect(isISODate(raw)).toBe(false);
    expect(() => addDays(raw, 1)).toThrow();
  });
  it('supports four-digit years without Date.UTC 0–99 remapping', () => {
    expect(isISODate('0099-02-28')).toBe(true);
    expect(addDays('0099-02-28', 1)).toBe('0099-03-01');
  });
  it('rejects calendar arithmetic outside supported ISO years or with fractions', () => {
    expect(() => addDays('9999-12-31', 1)).toThrow();
    expect(() => addDays('2026-01-01', 0.5)).toThrow();
    expect(() => addMonthsClamped('2026-01-01', NaN)).toThrow();
  });
});
