import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full max-w-xs bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90 transition-colors';

type ErrorPageProps = {
  title: string;
  description: string;
  statusCode?: number;
  actions?: ReactNode;
};

/** 예외 처리 페이지 공통 레이아웃 */
export function ErrorPage({ title, description, statusCode, actions }: ErrorPageProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-kiosk-bg text-kiosk-text text-center">
      {statusCode != null && (
        <p className="text-4xl font-bold text-kiosk-textSecondary mb-2">{statusCode}</p>
      )}
      <h1 className="text-xl font-semibold text-kiosk-text mb-2">{title}</h1>
      <p className="text-kiosk-textSecondary mb-8 max-w-sm">{description}</p>
      {actions ?? (
        <Link to="/" className={btnPrimary}>
          홈으로
        </Link>
      )}
    </div>
  );
}
