import { describe, expect, it } from 'vitest';
import { clearInput, loadInput, saveInput, hasLegacyCardInput, type StorageLike } from './storage';
import type { LoanInput } from './finance/types';
import { defaults } from '../content/calculators';
const loan: LoanInput = { principal: '120000', annualRate: '12', months: 12, issuedOn: '2026-10-01', scheme: 'annuity', upfrontFee: '0', monthlyFee: '0' };
function memory(): StorageLike { const values = new Map<string, string>(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } }; }
describe('local calculator input storage', () => {
  it.each(['{', JSON.stringify({ version: 2, input: loan }), JSON.stringify({ version: 1, input: { ...loan, principal: '' } }), JSON.stringify({ version: 1, input: { ...loan, months: 601 } })])('rejects damaged, obsolete and invalid saved input: %s', value => {
    const storage = memory(); storage.setItem('procent:v1:loan', value); expect(loadInput('loan', storage)).toBeNull();
  });
  it('roundtrips all valid loan fields in version 1', () => { const storage = memory(); expect(saveInput('loan', loan, storage)).toBe(true); expect(JSON.parse(storage.getItem('procent:v1:loan')!)).toEqual({ version: 1, input: loan }); expect(loadInput('loan', storage)).toEqual(loan); });
  it('clears only the selected calculator', () => { const storage = memory(); saveInput('loan', loan, storage); storage.setItem('procent:v1:deposit', 'keep'); expect(clearInput('loan', storage)).toBe(true); expect(loadInput('loan', storage)).toBeNull(); expect(storage.getItem('procent:v1:deposit')).toBe('keep'); });
  it('survives unavailable storage and quota errors', () => { const storage: StorageLike = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } }; expect(loadInput('loan', storage)).toBeNull(); expect(saveInput('loan', loan, storage)).toBe(false); expect(clearInput('loan', storage)).toBe(false); });
  it('does not persist invalid inputs', () => { const storage = memory(); expect(saveInput('loan', { ...loan, principal: '' }, storage)).toBe(false); expect(storage.getItem('procent:v1:loan')).toBeNull(); });
  it('roundtrips card account top-ups', () => {
    const storage = memory();
    const input = { ...defaults['credit-card'], topUps: [{ date: '2026-11-11', amount: '1000' }] };
    expect(saveInput('credit-card', input, storage)).toBe(true);
    expect(loadInput('credit-card', storage)).toEqual(input);
  });
  it('preserves the old card record and uses a separate version for the new plan', () => {
    const storage = memory();
    const old = JSON.stringify({ version: 1, input: { ownFunds: '123456', purchaseAmount: '100000', purchaseDate: '2026-01-01', repaymentDate: '2026-01-11', savings: defaults['credit-card'].savings } });
    storage.setItem('procent:v1:credit-card', old);
    expect(loadInput('credit-card', storage)).toBeNull();
    expect(hasLegacyCardInput(storage)).toBe(true);
    expect(saveInput('credit-card', defaults['credit-card'], storage)).toBe(true);
    expect(storage.getItem('procent:v1:credit-card')).toBe(old);
    expect(JSON.parse(storage.getItem('procent:v2:credit-card')!).version).toBe(2);
    clearInput('credit-card', storage);
    expect(storage.getItem('procent:v1:credit-card')).toBeNull();
    expect(storage.getItem('procent:v2:credit-card')).toBeNull();
  });
  it.each(['deposit', 'savings'] as const)('keeps %s on storage version 1', kind => {
    const storage = memory();
    expect(saveInput(kind, defaults[kind], storage)).toBe(true);
    expect(loadInput(kind, storage)).toEqual(defaults[kind]);
    expect(JSON.parse(storage.getItem(`procent:v1:${kind}`)!).version).toBe(1);
  });
  it('roundtrips recurring rules without duplicating deposits on repeated saves', () => {
    const storage = memory();
    const input = { ...defaults['credit-card'], topUps: [{ date: '2026-11-02', amount: '100' }], recurringTopUps: [{ amount: '1000', startDate: '2026-11-01', endDate: '', frequency: 'weekly' as const }] };
    expect(saveInput('credit-card', input, storage)).toBe(true);
    const restored = loadInput('credit-card', storage);
    expect(restored).toEqual(input);
    expect(saveInput('credit-card', restored!, storage)).toBe(true);
    expect(loadInput('credit-card', storage)).toEqual(input);
  });
});
