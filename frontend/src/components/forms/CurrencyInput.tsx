import { useState, useRef, forwardRef } from 'react';

// ─── Indian number format helpers ─────────────────────────────────────────────

/**
 * Formats a numeric string in Indian comma style.
 * 10000000 → "1,00,00,000"
 * 1000000  → "10,00,000"
 * 100000   → "1,00,000"
 * 1000     → "1,000"
 */
export function toIndianFormat(value: string | number): string {
  const str = String(value).replace(/[^0-9]/g, '');
  if (!str) return '';

  // Indian system: last 3 digits, then pairs of 2
  const lastThree = str.slice(-3);
  const rest      = str.slice(0, -3);
  const formatted = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return formatted;
}

/**
 * Strips all non-numeric characters → raw number string for submission.
 */
export function stripFormatting(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

// ─── CurrencyInput component ──────────────────────────────────────────────────
//
// Drop-in replacement for <input type="number"> on currency fields.
//
// Usage (with react-hook-form):
//   <CurrencyInput
//     label="Price (₹)"
//     value={field.value}
//     onChange={field.onChange}
//     error={errors.price?.message}
//   />
//
// The component:
//   • Displays the formatted value (e.g. "10,00,000") in the visible input
//   • Calls onChange with a plain number (not a string) so react-hook-form
//     and Zod receive the correct type
//   • Shows ₹ prefix inside the input (via padding + overlay)
//   • Shows a human-readable label below the input while typing
//     e.g. "₹ 10 Lakh" / "₹ 1 Crore 50 Lakh"
// ─────────────────────────────────────────────────────────────────────────────

interface CurrencyInputProps {
  label: string;
  value?: number | string;
  onChange: (value: number) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Converts a raw number to a human-readable Indian denomination label.
 * 10000000 → "1 Crore"
 * 2500000  → "25 Lakh"
 * 1500000  → "15 Lakh"
 * 100000   → "1 Lakh"
 * 50000    → "50 Thousand"
 */
function toWordLabel(num: number): string {
  if (!num || num === 0) return '';
  const cr  = Math.floor(num / 1_00_00_000);
  const lakh = Math.floor((num % 1_00_00_000) / 1_00_000);
  const thou = Math.floor((num % 1_00_000) / 1_000);

  const parts: string[] = [];
  if (cr   > 0) parts.push(`${cr} Crore`);
  if (lakh > 0) parts.push(`${lakh} Lakh`);
  if (thou > 0 && cr === 0) parts.push(`${thou} Thousand`); // only show thousands when < 1L
  return parts.join(' ');
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, value, onChange, onBlur, error, placeholder = '0', className = '', id }, ref) => {
    // Display string (formatted with commas)
    const [displayVal, setDisplayVal] = useState<string>(
      value ? toIndianFormat(String(value)) : ''
    );

    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = stripFormatting(e.target.value);
      const formatted = toIndianFormat(raw);
      setDisplayVal(formatted);

      const numeric = raw ? Number(raw) : 0;
      onChange(numeric);
    };

    const wordLabel = value ? toWordLabel(Number(value)) : '';

    return (
      <div className={`form-group ${className}`}>
        <label className="form-label" htmlFor={id}>
          {label}
        </label>

        {/* Input with ₹ prefix */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted select-none pointer-events-none">
            ₹
          </span>
          <input
            id={id}
            ref={(node) => {
              inputRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
            }}
            type="text"
            inputMode="numeric"
            value={displayVal}
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder}
            className="form-input pl-8"
            autoComplete="off"
          />
        </div>

        {/* Live word label — appears while typing */}
        {wordLabel && (
          <p className="text-[11px] text-accent font-medium mt-1 tracking-wide">
            ₹ {wordLabel}
          </p>
        )}

        {/* Validation error */}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
