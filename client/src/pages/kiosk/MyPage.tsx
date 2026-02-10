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
  { to: '/mypage/terms-list', icon: FileText, label: '이용약관' },
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
    <div className="min-h-[100dvh] bg-[#363636] p-3 sm:p-4 md:p-6 flex flex-col">
      <div className="flex flex-col flex-1 w-full max-w-[430px] sm:max-w-[400px] md:max-w-lg mx-auto min-w-0 rounded-2xl bg-white shadow-lg overflow-hidden">
        <header className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[#eeeeee] shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-[#333333]"
            aria-label="뒤로 가기"
          >
            &lt;
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">마이페이지</h1>
          <span className="p-2" aria-hidden><Bell className="h-5 w-5 text-[#333333]" /></span>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
          <p className="text-base font-medium text-[#333333] mb-4 sm:mb-6">
            {user.name}님 환영합니다!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {MENU_ITEMS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-white border border-[#eeeeee] py-4 sm:py-6 px-3 sm:px-4 shadow-sm hover:bg-[#fafafa] transition-colors min-h-[72px] sm:min-h-0"
              >
                <Icon className="h-6 w-6 text-[#FFC107]" />
                <span className="text-xs sm:text-sm font-medium text-[#333333] text-center">{label}</span>
              </Link>
            ))}
          </div>

          {pointInfo != null && (
            <div className="rounded-xl bg-[#fafafa] border border-[#eeeeee] p-3 sm:p-4 mb-4 sm:mb-6">
              <h2 className="text-sm font-medium text-[#717171] mb-2">보유 포인트</h2>
              <p className="text-lg font-semibold text-[#333333]">{pointInfo.point.toLocaleString()}P</p>
              <p className="text-xs text-[#717171] mt-1">마일리지 {pointInfo.mileage.toLocaleString()}</p>
            </div>
          )}

          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-[#888888] underline hover:text-[#333333]"
            >
              로그아웃
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
