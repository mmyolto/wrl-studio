import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** "drawer" slides in from the right — used for record details. */
  variant?: 'dialog' | 'drawer';
  /** Prevent closing on backdrop click / Esc (e.g. while saving). */
  locked?: boolean;
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

let openCount = 0;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'dialog',
  locked,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    openCount++;
    document.body.style.overflow = 'hidden';

    // Focus the first form field, otherwise the panel itself.
    const panel = panelRef.current;
    const field = panel?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), select, textarea');
    (field ?? panel)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) {
        // Only the top-most modal handles Esc.
        const panels = document.querySelectorAll('[data-modal-panel]');
        if (panels[panels.length - 1] === panelRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openCount--;
      if (openCount === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  const drawer = variant === 'drawer';

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in" role="presentation">
      <div
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-[2px]"
        onClick={() => !locked && onClose()}
        aria-hidden
      />
      <div
        className={cn(
          'relative flex w-full',
          drawer ? 'justify-end' : 'items-end justify-center sm:items-center sm:p-4',
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget && !locked) onClose();
        }}
      >
        <div
          ref={panelRef}
          data-modal-panel
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            'relative flex max-h-full w-full flex-col bg-white shadow-2xl outline-none',
            drawer
              ? 'h-full max-w-xl animate-slide-in'
              : cn('max-h-[92dvh] animate-pop-in rounded-t-2xl sm:max-h-[88dvh] sm:rounded-2xl', SIZES[size]),
          )}
        >
          <header className="flex items-start gap-4 border-b border-stone-200 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-bold text-stone-900">
                {title}
              </h2>
              {description && <div className="mt-0.5 text-sm text-stone-500">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="-mr-2 rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 disabled:opacity-40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <footer className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-stone-50/70 px-5 py-3 sm:flex-row sm:justify-end sm:px-6 sm:rounded-b-2xl">
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
