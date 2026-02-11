import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  theme?: 'kiosk' | 'admin';
  showCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  theme = 'kiosk',
  showCloseButton = true,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    const el = contentRef.current;
    const focusables = getFocusables(el);
    const first = focusables[0];
    if (first) {
      const t = setTimeout(() => first.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        if (previousActiveRef.current?.focus) previousActiveRef.current.focus();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;
      const focusables = getFocusables(contentRef.current);
      if (focusables.length === 0) return;
      const current = document.activeElement as HTMLElement;
      const idx = focusables.indexOf(current);
      if (idx === -1) return;
      if (e.shiftKey) {
        if (idx === 0) {
          const last = focusables[focusables.length - 1];
          if (last) {
            e.preventDefault();
            last.focus();
          }
        }
      } else {
        if (idx === focusables.length - 1) {
          const first = focusables[0];
          if (first) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleClose = () => {
    onClose();
    if (previousActiveRef.current?.focus) previousActiveRef.current.focus();
  };

  if (!open) return null;

  const textClass = theme === 'kiosk' ? 'text-kiosk-text' : 'text-admin-text';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className={`relative w-full max-w-md rounded-2xl bg-white shadow-xl ${textClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            <span className="flex-1" />
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                className="rounded p-1 hover:bg-gray-100"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
