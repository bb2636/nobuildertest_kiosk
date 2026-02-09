import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShoppingCart,
  Star,
  User,
  Settings,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';

const MENU_ITEMS = [
  { to: '/mypage/orders', icon: FileText, label: '주문내역' },
  { to: '/cart', icon: ShoppingCart, label: '장바구니' },
  { to: '/mypage/point', icon: Star, label: '포인트' },
  { to: '/mypage/terms', icon: FileText, label: '약관' },
  { to: '/mypage/account', icon: User, label: '계정정보' },
  { to: '/mypage/settings', icon: Settings, label: '설정' },
] as const;

export function MyPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pointInfo, setPointInfo] = useState<{ point: number; mileage: number } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    api.user.me().then((data) => setPointInfo({ point: data.point, mileage: data.mileage })).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-kiosk-text"
          aria-label="뒤로 가기"
        >
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">마이페이지</h1>
        <span className="p-2" aria-hidden><Bell className="h-5 w-5 text-kiosk-textSecondary" /></span>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <p className="text-base font-medium text-kiosk-text mb-6">
          {user.name}님 환영합니다!
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {MENU_ITEMS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white border border-kiosk-border py-6 px-4 shadow-sm hover:bg-kiosk-surface transition-colors"
            >
              <Icon className="h-6 w-6 text-kiosk-textSecondary" />
              <span className="text-sm font-medium text-kiosk-text">{label}</span>
            </Link>
          ))}
        </div>

        {pointInfo != null && (
          <div className="rounded-xl bg-white border border-kiosk-border p-4 mb-6">
            <h2 className="text-sm font-medium text-kiosk-textSecondary mb-2">보유 포인트</h2>
            <p className="text-lg font-semibold text-kiosk-text">{pointInfo.point.toLocaleString()}P</p>
            <p className="text-xs text-kiosk-textSecondary mt-1">마일리지 {pointInfo.mileage.toLocaleString()}</p>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-kiosk-textSecondary underline hover:text-kiosk-text"
          >
            로그아웃
          </button>
        </div>
      </main>
    </div>
  );
}
