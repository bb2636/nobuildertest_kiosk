import { type InputHTMLAttributes } from 'react';

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  theme?: 'kiosk' | 'admin';
  label?: string;
  onLabel?: string;
  offLabel?: string;
}

export function Toggle({
  theme = 'admin',
  label,
  onLabel = '판매 중',
  offLabel = '품절',
  checked,
  ...props
}: ToggleProps) {
  const trackChecked =
    theme === 'kiosk' ? 'peer-checked:bg-kiosk-primary' : 'peer-checked:bg-admin-primary';
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className="relative inline-block w-10 h-6">
        <input type="checkbox" className="peer sr-only" checked={checked} {...props} />
        <span
          className={`absolute inset-0 rounded-full bg-gray-300 transition-colors ${trackChecked}`}
        />
        <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span className="text-sm text-gray-600">
        {label !== undefined ? label : checked ? onLabel : offLabel}
      </span>
    </label>
  );
}
