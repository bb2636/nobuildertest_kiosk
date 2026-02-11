import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { getPushSubscription } from '../../utils/pushNotification';

export function OrderDone() {
  const { t } = useTranslation('kiosk');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orderNo = searchParams.get('orderNo') ?? '';
  const orderId = searchParams.get('orderId') ?? '';
  const pointsEarned = searchParams.get('points') ?? '';
  const [pushRegistered, setPushRegistered] = useState(false);
  const [pushRegistering, setPushRegistering] = useState(false);

  const handleEnablePush = async () => {
    if (!orderId || pushRegistered || pushRegistering) return;
    setPushRegistering(true);
    try {
      const sub = await getPushSubscription(import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined);
      if (sub) {
        await api.orders.registerPushSubscription(orderId, sub);
        setPushRegistered(true);
      }
    } finally {
      setPushRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl text-center overflow-hidden">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100 text-kiosk-text"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pt-12 pb-6 px-6">
          <h2 className="text-xl font-bold text-kiosk-text mb-6">
            {t('paymentCompleteTitle')}
          </h2>

          {orderNo && (
            <p className="text-sm text-kiosk-textSecondary mb-1">{t('orderNumberLabel')}</p>
          )}
          <p className="text-lg font-semibold text-kiosk-primary mb-2">{orderNo || '-'}</p>
          {pointsEarned && (
            <p className="text-sm text-kiosk-textSecondary mb-4">
              {t('pointsEarned')} <span className="font-semibold text-kiosk-primary">+{Number(pointsEarned).toLocaleString()}P</span>
            </p>
          )}
        </div>

        <div className="px-6 pb-8 space-y-3">
          {orderId && !pushRegistered && (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushRegistering}
              className="block w-full py-2.5 text-sm text-kiosk-textSecondary hover:text-kiosk-text"
            >
              {pushRegistering ? t('registeringPush') : t('registerPush')}
            </button>
          )}
          <Link to="/" className="block w-full py-2.5 text-sm text-kiosk-textSecondary hover:text-kiosk-text">
            {t('addMoreOrders')}
          </Link>
          <Link to={orderId && user ? `/mypage/orders/${orderId}` : '/mypage/orders'} className="block w-full">
            <Button theme="kiosk" fullWidth className="bg-kiosk-primary text-kiosk-text font-semibold">
              {t('viewOrderHistory')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
