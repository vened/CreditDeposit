import { useId, type ReactNode } from 'react';
import type { FieldIssue } from '@/lib/finance/types';
import styles from './calculator.module.css';
export function FormField({ label, value, onChange, path, issues, type = 'text', hint, options, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void; path: string; issues: FieldIssue[]; type?: string; hint?: string; options?: { value: string; label: string; disabled?: boolean }[]; disabled?: boolean;
}) {
  const id = useId(); const error = issues.find(issue => issue.path === path)?.message;
  return <div className={styles.field}><label htmlFor={id}>{label}</label>
    {options ? <select id={id} value={value} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={`${id}-help`} disabled={disabled}>{options.map(option => <option key={option.value} {...option}>{option.label}</option>)}</select>
      : <input id={id} type={type} inputMode={type === 'text' ? 'decimal' : undefined} value={value} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={`${id}-help`} disabled={disabled} />}
    <span id={`${id}-help`} className={error ? styles.error : styles.helper}>{error || hint}</span>
  </div>;
}
export function FormSection({ title, children }: { title: string; children: ReactNode }) { return <details className={styles.advanced}><summary>{title}</summary><div className={styles.advancedBody}>{children}</div></details>; }
