import type { CalculatorKind, Inputs } from './finance/types';
import { validateInput } from './finance/validation';
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const key = (kind: CalculatorKind) => `procent:v1:${kind}`;
export function loadInput<K extends CalculatorKind>(kind: K, storage: StorageLike): Inputs[K] | null {
  try { const raw = storage.getItem(key(kind)); if (!raw) return null; const envelope: unknown = JSON.parse(raw);
    if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || envelope.version !== 1 || !('input' in envelope)) return null;
    const checked = validateInput(kind, envelope.input); return checked.ok ? checked.value : null;
  } catch { return null; }
}
export function saveInput<K extends CalculatorKind>(kind: K, input: Inputs[K], storage: StorageLike): boolean {
  try { const checked = validateInput(kind, input); if (!checked.ok) return false; storage.setItem(key(kind), JSON.stringify({ version: 1, input: checked.value })); return true; } catch { return false; }
}
export function clearInput(kind: CalculatorKind, storage: StorageLike): boolean { try { storage.removeItem(key(kind)); return true; } catch { return false; } }
