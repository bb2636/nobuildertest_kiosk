import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ErrorPage } from '../pages/errors/ErrorPage';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-kiosk-primary text-kiosk-text hover:bg-kiosk-primaryHover active:opacity-90 transition-colors';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium px-4 py-2.5 text-sm w-full bg-white border border-kiosk-border text-kiosk-text hover:bg-kiosk-surface transition-colors';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * 렌더 단계에서 발생한 예기치 않은 에러를 잡아
 * 전체 앱 크래시 대신 에러 화면을 보여줍니다.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <ErrorPage
        statusCode={500}
        title="일시적인 오류가 발생했습니다"
        description="잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요."
        actions={
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button type="button" onClick={() => window.location.reload()} className={btnPrimary}>
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
}
