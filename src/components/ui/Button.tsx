import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900',
  secondary: 'border border-stone-300 bg-white text-stone-800 shadow-sm hover:bg-stone-50 active:bg-stone-100',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
  danger: 'bg-flame-600 text-white shadow-sm hover:bg-flame-500',
  soft: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className={size === 'icon' ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
      )}
      {children}
    </button>
  );
});
