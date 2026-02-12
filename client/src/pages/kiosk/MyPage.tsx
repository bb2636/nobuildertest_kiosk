import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, ShoppingCart, Star, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { OrderHistoryPopover } from '../../components/kiosk/OrderHistoryPopover';

const MENU_ITEMS = [
  { to: '/mypage/orders', icon: FileText, labelKey: 'orderHistory' as const },
  { to: '/cart', icon: ShoppingCart, labelKey: 'cart' as const },
  { to: '/mypage/point', icon: Star, labelKey: 'pointsLabel' as const },
  { to: '/mypage/terms-list', icon: FileText, labelKey: 'termsLabel' as const },
  { to: '/mypage/account', icon: User, labelKey: 'accountInfo' as const },
  { to: '/mypage/settings', icon: Settings, labelKey: 'settingsLabel' as const },
] as const;

export function MyPage() {
  const { t } = useTranslation('kiosk');
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
    <div className="flex flex-col min-h-[100dvh] w-full bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#e8c64a] shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-3 -ml-2 text-black text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={t('backAria')}
        >
          ‹
        </button>
        <h1 className="text-lg font-semibold text-black">{t('mypageTitle')}</h1>
        <OrderHistoryPopover />
      </header>

      <main className="flex-1 overflow-auto p-4 min-h-0">
        <p className="text-base font-medium text-black mb-4 sm:mb-6">
          {t('welcomeUser', { name: user.name })}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {MENU_ITEMS.map(({ to, icon: Icon, labelKey }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-white border border-gray-200 py-4 sm:py-6 px-3 sm:px-4 hover:bg-gray-50 transition-colors min-h-[72px] sm:min-h-0"
            >
              <Icon className="h-6 w-6 text-[#c9a227]" />
              <span className="text-xs sm:text-sm font-medium text-black text-center">{t(labelKey)}</span>
            </Link>
          ))}
        </div>

        {pointInfo != null && (
          <div className="rounded-xl bg-white border border-gray-200 p-4 mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">{t('ownedPoints')}</h2>
            <p className="text-lg font-semibold text-black">{pointInfo.point.toLocaleString()}P</p>
            <p className="text-xs text-gray-500 mt-1">{t('mileageLabel')} {pointInfo.mileage.toLocaleString()}</p>
          </div>
        )}

        <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-500 underline hover:text-black"
        >
            {t('logout')}
          </button>
        </div>
      </main>
    </div>
  );
}
