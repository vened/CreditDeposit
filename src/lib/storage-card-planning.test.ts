import { describe, expect, it } from 'vitest';
import { loadCardPlanningInput, saveCardPlanningInput, clearCardPlanningInput, hasLegacyCardInput, type StorageLike } from './storage';
import type { CardPlanningInput } from './finance/types';
const input: CardPlanningInput = { ownFunds: '1000', creditLimit: '1000', startDate: '2026-01-01', endDate: '2026-01-31', monthlySpending: '310', spendingOverrides: { '2025-12': '100', '2026-01': '310' }, repaymentDay: 31, fees: '0', topUps: [{ date: '2026-01-03', amount: '2' }], recurringTopUps: [{ amount: '1', startDate: '2026-01-01', endDate: '', frequency: 'weekly' }], repayments: [], savings: { annualRate: '0', basis: 'daily', payout: 'monthly', capitalize: false, partialMonths: 'actual', rateChanges: [] } };
function memory(): StorageLike { const map = new Map<string, string>(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value); }, removeItem: key => { map.delete(key); } }; }
describe('separate card planning storage', () => {
  it('roundtrips overrides and recurrence rules in v2 without daily materialization', () => {
    const storage = memory();
    expect(saveCardPlanningInput(input, storage)).toBe(true);
    expect(loadCardPlanningInput(storage)).toEqual(input);
    expect(JSON.parse(storage.getItem('procent:v2:credit-card')!)).toEqual({ version: 2, input });
    expect(saveCardPlanningInput(loadCardPlanningInput(storage)!, storage)).toBe(true);
    expect(loadCardPlanningInput(storage)).toEqual(input);
  });
  it('preserves old data byte-for-byte without guessing a conversion', () => {
    const storage = memory();
    const old = JSON.stringify({ version: 1, input: { purchaseAmount: '12345', purchaseDate: '2026-01-01' } });
    storage.setItem('procent:v1:credit-card', old);
    expect(loadCardPlanningInput(storage)).toBeNull();
    expect(hasLegacyCardInput(storage)).toBe(true);
    saveCardPlanningInput(input, storage);
    expect(storage.getItem('procent:v1:credit-card')).toBe(old);
  });
  it('clears only both card versions', () => {
    const storage = memory();
    storage.setItem('procent:v1:credit-card', 'old'); saveCardPlanningInput(input, storage); storage.setItem('procent:v1:loan', 'keep');
    expect(clearCardPlanningInput(storage)).toBe(true);
    expect(storage.getItem('procent:v1:credit-card')).toBeNull(); expect(loadCardPlanningInput(storage)).toBeNull(); expect(hasLegacyCardInput(storage)).toBe(false);
    expect(storage.getItem('procent:v1:loan')).toBe('keep');
  });
  it.each(['{', JSON.stringify({ version: 1, input }), JSON.stringify({ version: 2, input: { ...input, repaymentDay: 0 } })])('rejects damaged or invalid new data', value => {
    const storage = memory(); storage.setItem('procent:v2:credit-card', value); expect(loadCardPlanningInput(storage)).toBeNull();
  });
  it('survives unavailable storage and rejects invalid writes', () => {
    const storage: StorageLike = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('unavailable'); } };
    expect(loadCardPlanningInput(storage)).toBeNull(); expect(hasLegacyCardInput(storage)).toBe(false);
    expect(saveCardPlanningInput(input, storage)).toBe(false); expect(clearCardPlanningInput(storage)).toBe(false);
    const available = memory(); expect(saveCardPlanningInput({ ...input, monthlySpending: '' }, available)).toBe(false); expect(available.getItem('procent:v2:credit-card')).toBeNull();
  });
});
