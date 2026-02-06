import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  theme?: 'kiosk' | 'admin';
}

export function Card({ theme = 'kiosk', className = '', ...props }: CardProps) {
  const border = theme === 'kiosk' ? 'border-kiosk-border' : 'border-admin-border';
  const bg = theme === 'kiosk' ? 'bg-kiosk-bg' : 'bg-white';
  return (
    <div
      className={`rounded-xl border ${border} ${bg} shadow-sm ${className}`}
      {...props}
    />
  );
}
