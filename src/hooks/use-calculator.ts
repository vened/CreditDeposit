'use client';
import { useEffect, useRef, useState } from 'react';
import { calculateDeposit } from '@/lib/finance/deposit';
import { calculateSavings } from '@/lib/finance/savings';
import { calculateLoan } from '@/lib/finance/loan';
import { calculateCreditCard } from '@/lib/finance/credit-card';
import { validateInput } from '@/lib/finance/validation';
import { clearInput, hasLegacyCardInput, loadInput, saveInput } from '@/lib/storage';
import type { CalculatorKind, FieldIssue, Inputs, Results } from '@/lib/finance/types';
function calculate<K extends CalculatorKind>(kind: K, input: Inputs[K]): Results[K] {
  switch (kind) {
    case 'deposit': return calculateDeposit(input as Inputs['deposit']) as Results[K];
    case 'savings': return calculateSavings(input as Inputs['savings']) as Results[K];
    case 'loan': return calculateLoan(input as Inputs['loan']) as Results[K];
    case 'credit-card': return calculateCreditCard(input as Inputs['credit-card']) as Results[K];
  }
  throw new Error('Неизвестный калькулятор');
}
function evaluate<K extends CalculatorKind>(kind: K, input: Inputs[K]): { result: Results[K] | null; issues: FieldIssue[] } {
  const valid = validateInput(kind, input);
  if (!valid.ok) return { result: null, issues: valid.issues };
  try { return { result: calculate(kind, valid.value), issues: [] }; }
  catch (error) { return { result: null, issues: [{ path: 'calculation', message: error instanceof Error ? error.message : 'Не удалось рассчитать. Проверьте параметры.' }] }; }
}
export function useCalculator<K extends CalculatorKind>(kind: K, defaults: Inputs[K]) {
  const [state, setState] = useState(() => ({ input: defaults, ...evaluate(kind, defaults), restored: false, legacyCardInput: false }));
  const ready = useRef(false);
  useEffect(() => {
    let input = defaults;
    let legacyCardInput = false;
    try {
      const restored = loadInput(kind, window.localStorage);
      input = restored ?? defaults;
      legacyCardInput = kind === 'credit-card' && restored === null && hasLegacyCardInput(window.localStorage);
    } catch { /* private mode */ }
    ready.current = true;
    setState({ input, ...evaluate(kind, input), restored: true, legacyCardInput });
  }, [kind, defaults]);
  function setInput(input: Inputs[K]) {
    const checked = validateInput(kind, input);
    if (!checked.ok) { invalidate(checked.issues); return; }
    const next = evaluate(kind, checked.value);
    setState(previous => ({ ...previous, input: checked.value, ...next, legacyCardInput: false }));
    if (ready.current && !next.issues.length) { try { saveInput(kind, checked.value, window.localStorage); } catch { /* computation works without storage */ } }
  }
  function invalidate(issues: FieldIssue[]) { setState(previous => ({ ...previous, result: null, issues })); }
  function reset() {
    try { clearInput(kind, window.localStorage); } catch { /* computation works without storage */ }
    setState({ input: defaults, ...evaluate(kind, defaults), restored: true, legacyCardInput: false });
  }
  return { ...state, setInput, invalidate, reset };
}
