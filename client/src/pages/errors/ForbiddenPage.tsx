import { Link } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90 transition-colors';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-white border border-kiosk-border text-kiosk-text hover:bg-kiosk-surface transition-colors';

/** 403 - 접근 권한 없음 */
export function ForbiddenPage() {
  return (
    <ErrorPage
      statusCode={403}
      title="접근 권한이 없습니다"
      description="이 페이지를 볼 수 있는 권한이 없습니다. 관리자만 접근할 수 있습니다."
      actions={
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to="/admin/login" className={btnPrimary}>
            관리자 로그인
          </Link>
          <Link to="/" className={btnSecondary}>
            홈으로
          </Link>
        </div>
      }
    />
  );
}
