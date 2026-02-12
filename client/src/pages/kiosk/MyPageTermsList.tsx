import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

const TERMS_ITEMS = [
  { to: '/mypage/terms', label: '서비스 이용약관' },
  { to: '/mypage/privacy', label: '개인정보 처리방침' },
] as const;

export function MyPageTermsList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-3 -ml-2 text-kiosk-text text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="뒤로 가기"
        >
          ‹
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">이용약관</h1>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="rounded-xl bg-white border border-kiosk-border overflow-hidden">
          {TERMS_ITEMS.map(({ to, label }, index) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center justify-between px-4 py-3.5 text-kiosk-text hover:bg-kiosk-surface active:bg-kiosk-surface transition-colors ${
                index > 0 ? 'border-t border-kiosk-border' : ''
              }`}
            >
              <span className="text-sm font-medium">{label}</span>
              <ChevronRight className="h-5 w-5 text-kiosk-textSecondary shrink-0" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
