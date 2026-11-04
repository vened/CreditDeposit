import { describe, expect, it } from 'vitest';
import { clearInput, loadInput, saveInput, type StorageLike } from './storage';
import type { LoanInput } from './finance/types';
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
});
