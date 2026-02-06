import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  theme?: 'kiosk' | 'admin';
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ theme = 'kiosk', label, error, className = '', ...props }, ref) => {
    const border = theme === 'kiosk' ? 'border-kiosk-border' : 'border-admin-border';
    const ring = error
      ? 'ring-1 ring-red-500 border-red-500'
      : 'focus:ring-1 focus:ring-offset-0 ' + (theme === 'kiosk' ? 'focus:ring-kiosk-primary' : 'focus:ring-admin-primary');
    const textColor = theme === 'kiosk' ? 'text-kiosk-text' : 'text-admin-text';
    return (
      <label className="block">
        {label && (
          <span className={`block text-sm font-medium mb-1 ${textColor}`}>{label}</span>
        )}
        <input
          ref={ref}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none transition ${border} ${ring} ${textColor} placeholder:opacity-60 ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-kiosk-error">{error}</p>}
      </label>
    );
  }
);
Input.displayName = 'Input';
