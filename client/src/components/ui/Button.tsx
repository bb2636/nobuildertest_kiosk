import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Theme = 'kiosk' | 'admin';
type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: Theme;
  variant?: Variant;
  fullWidth?: boolean;
}

const themeClasses: Record<Theme, Record<Variant, string>> = {
  kiosk: {
    primary: 'bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90',
    secondary: 'bg-white border border-kiosk-border text-kiosk-text hover:bg-kiosk-surface',
    destructive: 'bg-white border border-kiosk-error text-kiosk-error hover:bg-red-50',
    ghost: 'text-kiosk-text hover:bg-kiosk-surface',
  },
  admin: {
    primary: 'bg-admin-primary text-white hover:bg-admin-primaryHover active:opacity-90',
    secondary: 'bg-white border border-admin-border text-admin-text hover:bg-admin-surface',
    destructive: 'bg-white border border-admin-error text-admin-error hover:bg-red-50',
    ghost: 'text-admin-text hover:bg-admin-surface',
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ theme = 'kiosk', variant = 'primary', fullWidth, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
    const size = 'px-4 py-2.5 text-sm';
    const themeVariant = themeClasses[theme][variant];
    return (
      <button
        ref={ref}
        className={`${base} ${size} ${themeVariant} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
