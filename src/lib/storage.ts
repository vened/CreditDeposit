import type { CalculatorKind, CardPlanningInput, Inputs } from './finance/types';
import { validateCardPlanningInput, validateInput } from './finance/validation';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const key = (kind: CalculatorKind) => `procent:v1:${kind}`;
export function loadInput<K extends CalculatorKind>(kind: K, storage: StorageLike): Inputs[K] | null {
  if (kind === 'credit-card') return loadCardPlanningInput(storage) as Inputs[K] | null;
  try { const raw = storage.getItem(key(kind)); if (!raw) return null; const envelope: unknown = JSON.parse(raw);
    if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || envelope.version !== 1 || !('input' in envelope)) return null;
    const checked = validateInput(kind, envelope.input); return checked.ok ? checked.value : null;
  } catch { return null; }
}
export function saveInput<K extends CalculatorKind>(kind: K, input: Inputs[K], storage: StorageLike): boolean {
  if (kind === 'credit-card') return saveCardPlanningInput(input as CardPlanningInput, storage);
  try { const checked = validateInput(kind, input); if (!checked.ok) return false; storage.setItem(key(kind), JSON.stringify({ version: 1, input: checked.value })); return true; } catch { return false; }
}
export function clearInput(kind: CalculatorKind, storage: StorageLike): boolean { if (kind === 'credit-card') return clearCardPlanningInput(storage); try { storage.removeItem(key(kind)); return true; } catch { return false; } }

const cardPlanningKey = 'procent:v2:credit-card';
const legacyCardKey = 'procent:v1:credit-card';
export function loadCardPlanningInput(storage: StorageLike): CardPlanningInput | null {
  try {
    const raw = storage.getItem(cardPlanningKey);
    if (!raw) return null;
    const envelope: unknown = JSON.parse(raw);
    if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || envelope.version !== 2 || !('input' in envelope)) return null;
    const checked = validateCardPlanningInput(envelope.input);
    return checked.ok ? checked.value : null;
  } catch { return null; }
}
export function saveCardPlanningInput(input: CardPlanningInput, storage: StorageLike): boolean {
  try {
    const checked = validateCardPlanningInput(input);
    if (!checked.ok) return false;
    storage.setItem(cardPlanningKey, JSON.stringify({ version: 2, input: checked.value }));
    return true;
  } catch { return false; }
}
export function hasLegacyCardInput(storage: StorageLike): boolean {
  try { return storage.getItem(legacyCardKey) !== null; } catch { return false; }
}
export function clearCardPlanningInput(storage: StorageLike): boolean {
  try { storage.removeItem(cardPlanningKey); storage.removeItem(legacyCardKey); return true; } catch { return false; }
}
