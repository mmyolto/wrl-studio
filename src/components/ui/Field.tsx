import { Check, ChevronDown } from 'lucide-react';
import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

const control =
  'w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none disabled:bg-stone-50 disabled:text-stone-500 aria-[invalid=true]:border-flame-500 aria-[invalid=true]:focus:ring-flame-500/15';

interface FieldProps {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactElement<{
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-required'?: boolean;
  }>;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, required, hint, error, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-700">
        {label}
        {required && (
          <span className="ml-0.5 text-flame-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {isValidElement(children)
        ? cloneElement(children, {
            id,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': describedBy,
            'aria-required': required || undefined,
          })
        : children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-flame-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Static text shown inside the left edge, e.g. a dialling code. */
  prefix?: string;
  /** A control placed after the input (e.g. a button); the label still targets the input. */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, prefix, suffix, ...rest },
  ref,
) {
  const input = <input ref={ref} className={cn(control, 'h-10', prefix && 'rounded-l-none', className)} {...rest} />;
  if (!prefix && !suffix) return input;
  return (
    <div className="flex gap-2">
      <div className="flex min-w-0 flex-1">
        {prefix && (
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-stone-300 bg-stone-50 px-3 text-sm text-stone-500">
            {prefix}
          </span>
        )}
        {input}
      </div>
      {suffix}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea ref={ref} rows={rows} className={cn(control, 'resize-y py-2.5 leading-relaxed', className)} {...rest} />
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  options: Array<string | { value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, placeholder, options, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(control, 'h-10 appearance-none pr-9', className)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-stone-400" />
    </div>
  );
});

interface ChoiceProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string; icon?: ReactNode }>;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  size?: 'sm' | 'md';
}

/** A row of pill buttons acting as a radio group — faster than a dropdown for short lists. */
export function ChoiceChips({ value, onChange, options, id, size = 'md', ...aria }: ChoiceProps) {
  return (
    <div id={id} role="radiogroup" className="flex flex-wrap gap-2" {...aria}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o, icon: undefined } : o;
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border font-medium transition',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-sm',
              selected
                ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-brand-400 hover:bg-brand-50',
            )}
          >
            {selected ? <Check className="h-3.5 w-3.5" /> : opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-300 accent-brand-600"
      />
      {label}
    </label>
  );
}
