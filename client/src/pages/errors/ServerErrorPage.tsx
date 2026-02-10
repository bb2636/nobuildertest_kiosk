import { Link } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90 transition-colors';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-white border border-kiosk-border text-kiosk-text hover:bg-kiosk-surface transition-colors';

/** 500 - 서버 오류 */
export function ServerErrorPage() {
  return (
    <ErrorPage
      statusCode={500}
      title="일시적인 오류가 발생했습니다"
      description="잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요."
      actions={
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={btnPrimary}
          >
            새로고침
          </button>
          <Link to="/" className={btnSecondary}>
            홈으로
          </Link>
        </div>
      }
    />
  );
}
