import { Link } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90 transition-colors';

/** 404 - 잘못된 경로 */
export function NotFoundPage() {
  return (
    <ErrorPage
      statusCode={404}
      title="페이지를 찾을 수 없습니다"
      description="요청하신 주소가 없거나 변경되었을 수 있습니다."
      actions={
        <Link to="/" className={`block w-full max-w-xs ${btnPrimary}`}>
          홈으로
        </Link>
      }
    />
  );
}
