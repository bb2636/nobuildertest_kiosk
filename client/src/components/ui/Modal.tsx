import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

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
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

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
        onClick={onClose}
        aria-hidden="true"
      />
      <div
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
                onClick={onClose}
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
