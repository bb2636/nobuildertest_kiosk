import { Link } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90 transition-colors';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-white border border-kiosk-border text-kiosk-text hover:bg-kiosk-surface transition-colors';

/** 401 - 로그인 필요 */
export function UnauthorizedPage() {
  return (
    <ErrorPage
      statusCode={401}
      title="로그인이 필요합니다"
      description="이 기능을 이용하려면 로그인해 주세요."
      actions={
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to="/login" className={btnPrimary}>
            로그인
          </Link>
          <Link to="/" className={btnSecondary}>
            홈으로
          </Link>
        </div>
      }
    />
  );
}
