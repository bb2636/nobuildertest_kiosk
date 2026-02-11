import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useKioskCart } from '../../contexts/KioskCartContext';

/** 토스 결제 성공 리다이렉트 페이지. paymentKey, orderId, amount 로 승인 후 주문 완료로 이동 */
export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clear } = useKioskCart();
  const [error, setError] = useState<string | null>(null);
  const confirmStarted = useRef(false);

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amountStr = searchParams.get('amount');
    const amount = amountStr ? parseInt(amountStr, 10) : 0;

    if (!paymentKey || !orderId || !Number.isInteger(amount) || amount < 1) {
      setError('결제 정보가 올바르지 않습니다.');
      return;
    }
    if (confirmStarted.current) return;
    confirmStarted.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.payments.confirm({ paymentKey, orderId, amount });
        if (cancelled) return;
        clear();
        const params = new URLSearchParams({ orderNo: res.orderNo });
        if (res.orderId) params.set('orderId', res.orderId);
        if (res.pointsEarned != null) params.set('points', String(res.pointsEarned));
        navigate(`/order-done?${params.toString()}`, { replace: true });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '결제 승인에 실패했습니다.');
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, navigate, clear]);

  if (error) {
    return (
      <div className="flex flex-col min-h-[100dvh] items-center justify-center p-4 sm:p-6 text-kiosk-text">
        <p className="text-kiosk-error mb-4" role="alert" aria-atomic="true">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="rounded-xl bg-kiosk-primary px-4 py-2 text-kiosk-text"
        >
          홈으로
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] items-center justify-center p-4 sm:p-6 text-kiosk-text">
      <p>결제 확인 중…</p>
    </div>
  );
}
