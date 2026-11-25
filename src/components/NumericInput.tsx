import type { KeyboardEvent } from 'react';
import type { NullableNum } from '../../shared/types.js';

interface NumericInputProps {
  id: string;
  value: NullableNum;
  onChange: (value: NullableNum) => void;
  ariaLabel?: string;
  placeholder?: string;
  compact?: boolean;
  disabled?: boolean;
}

export function NumericInput({
  id,
  value,
  onChange,
  ariaLabel,
  placeholder = '0',
  compact = false,
  disabled = false,
}: NumericInputProps) {
  const displayValue = value === null || value === undefined ? '' : String(value);

  const handleChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^\d]/g, '');
    if (digitsOnly === '') {
      onChange(null);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    onChange(Number.isFinite(parsed) ? parsed : null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const form = e.currentTarget.closest('[data-form-grid]');
      if (!form) return;
      const inputs = Array.from(
        form.querySelectorAll<HTMLInputElement>('input[data-numeric-input="true"]:not(:disabled)'),
      );
      const idx = inputs.indexOf(e.currentTarget);
      if (idx >= 0 && idx + 1 < inputs.length) {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      data-numeric-input="true"
      aria-label={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={handleKeyDown}
      className={`w-full rounded-lg border border-slate-300 bg-white text-right font-medium text-slate-900 tabular-nums transition-colors placeholder:text-slate-300 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/20 disabled:bg-slate-100 disabled:text-slate-400 ${
        compact ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2 text-base'
      }`}
    />
  );
}
