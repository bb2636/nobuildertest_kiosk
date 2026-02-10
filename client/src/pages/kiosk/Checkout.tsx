import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Store, Check } from 'lucide-react';
import { api } from '../../api/client';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';

const TOSS_SCRIPT_URL = 'https://js.tosspayments.com/v2/payment';

/** 토스 결제창을 띄우려면 스크립트를 먼저 로드해야 함. 결제 수단이 카드/토스일 때만 사용 */
function loadTossScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  const existing = document.querySelector(`script[src="${TOSS_SCRIPT_URL}"]`);
  if (existing) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TOSS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('토스 결제 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

/** 카드/토스 선택 시 → 토스 결제창 사용. 결제 완료는 성공 URL 리다이렉트 후 confirm API 성공 시에만 처리됨 */
const USE_TOSS_WINDOW: string[] = ['CARD', 'TOSS'];

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (params: { customerKey: string }) => {
        requestPayment: (
          method: string,
          params: {
            amount: { value: number; currency: string };
            orderId: string;
            orderName: string;
            successUrl: string;
            failUrl: string;
          }
        ) => Promise<void>;
      };
    };
  }
}

const MEAL_OPTIONS = [
  { value: 'DINE_IN', label: '매장에서 먹어요' },
  { value: 'TAKE_OUT', label: '포장해요' },
] as const;

const PAYMENT_METHODS = [
  { value: 'CARD', label: '카드 결제' },
  { value: 'TOSS', label: '토스 포인트' },
  { value: 'CASH', label: '현금' },
  { value: 'MOBILE', label: '모바일 결제' },
  { value: 'ETC', label: '기타' },
] as const;

const POINT_RATE = 0.1;

export function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lines, totalPrice, clear } = useKioskCart();
  const [mealType, setMealType] = useState<'DINE_IN' | 'TAKE_OUT'>('DINE_IN');
  const [pointSectionOpen, setPointSectionOpen] = useState(true);
  const [paymentSectionOpen, setPaymentSectionOpen] = useState(false);
  const [useStorePoint, setUseStorePoint] = useState(0); // 매장 포인트 사용액 (원)
  const [useTossPoint, setUseTossPoint] = useState(0); // 토스 포인트는 0으로 두고 UI만
  const [paymentMethod, setPaymentMethod] = useState<string>('CARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const storePoint = user?.point ?? 0;
  const tossPoint = 0; // 외부 토스 포인트는 연동 시 설정
  const discountAmount = useStorePoint + useTossPoint;
  const payAmount = Math.max(0, totalPrice - discountAmount);
  const pointsEarnedPreview = user ? Math.floor(payAmount * POINT_RATE) : 0;

  useEffect(() => {
    if (lines.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [lines.length, navigate]);

  const submitOrder = async () => {
    setError('');
    setSubmitting(true);
    try {
      const usePoint = useStorePoint;
      if (usePoint > 0 && (!user || (user.point ?? 0) < usePoint)) {
        setError('보유 포인트가 부족합니다.');
        setSubmitting(false);
        return;
      }
      if (usePoint > totalPrice) {
        setError('사용 포인트는 결제 금액을 초과할 수 없습니다.');
        setSubmitting(false);
        return;
      }

      // 카드/토스 → 토스 결제창 띄움. 성공 시 /payment/success 리다이렉트 → confirm API 성공 후에만 주문 완료·PAID 처리
      if (USE_TOSS_WINDOW.includes(paymentMethod)) {
        const clientKey = import.meta.env.VITE_TOSSPAYMENTS_CLIENT_KEY as string | undefined;
        if (!clientKey || typeof clientKey !== 'string') {
          setError('토스 테스트 결제 키가 없습니다. .env에 VITE_TOSSPAYMENTS_CLIENT_KEY (테스트: test_ck_...) 를 설정하세요.');
          setSubmitting(false);
          return;
        }
        // 스크립트 먼저 로드 후 주문 생성 → 결제창 호출 (창이 떠야만 토스 측에서 성공 시 successUrl로 리다이렉트)
        await loadTossScript();
        const TossPayments = window.TossPayments;
        if (!TossPayments) {
          setError('토스 결제 스크립트를 불러올 수 없습니다.');
          setSubmitting(false);
          return;
        }
        const res = await api.orders.createOrder({
          totalPrice,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            optionIds: l.optionIds ?? [],
          })),
          orderType: mealType,
          paymentMethod: 'TOSS',
          usePoint: usePoint > 0 ? usePoint : undefined,
        });
        const origin = window.location.origin;
        const payment = TossPayments(clientKey).payment({ customerKey: user?.id ?? 'kiosk-guest' });
        await payment.requestPayment('CARD', {
          amount: { value: payAmount, currency: 'KRW' },
          orderId: res.orderId,
          orderName: '키오스크 주문',
          successUrl: `${origin}/payment/success`,
          failUrl: `${origin}/checkout`,
        });
        setSubmitting(false);
        return;
      }

      // 현금/모바일/기타 → 결제창 없이 즉시 PAID 처리 후 주문 완료 페이지로
      const paymentMethodForApi = paymentMethod as 'CASH' | 'MOBILE' | 'ETC';
      const res = await api.orders.createOrder({
        totalPrice,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          optionIds: l.optionIds ?? [],
        })),
        orderType: mealType,
        paymentMethod: paymentMethodForApi,
        usePoint: usePoint > 0 ? usePoint : undefined,
      });
      clear();
      const params = new URLSearchParams({ orderNo: res.orderNo });
      if (res.orderId) params.set('orderId', res.orderId);
      if (res.pointsEarned != null) params.set('points', String(res.pointsEarned));
      navigate(`/order-done?${params.toString()}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문 처리에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-kiosk-text"
          aria-label="뒤로 가기"
        >
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">결제하기</h1>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-auto px-4 py-4 space-y-0">
        {/* 식사 방법 */}
        <section className="border-b border-kiosk-border pb-4">
          <h2 className="text-sm font-medium text-kiosk-text mb-2">식사 방법</h2>
          <div className="flex gap-2">
            {MEAL_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMealType(value)}
                className={`flex-1 flex items-center justify-center rounded-xl py-3 px-4 text-sm font-medium ${
                  mealType === value
                    ? 'bg-kiosk-primary text-kiosk-text'
                    : 'bg-kiosk-surface text-kiosk-textSecondary border border-kiosk-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* 토스 포인트 (매장 포인트 / 토스 포인트) */}
        <section className="border-b border-kiosk-border py-4">
          <button
            type="button"
            onClick={() => setPointSectionOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-sm font-medium text-kiosk-text">
              토스 포인트
              {(storePoint > 0 || tossPoint > 0) && (
                <span className="ml-1 text-kiosk-textSecondary font-normal">
                  매장 {storePoint.toLocaleString()}P {tossPoint > 0 ? `· 토스 ${tossPoint.toLocaleString()}P` : ''}
                </span>
              )}
            </h2>
            {pointSectionOpen ? (
              <ChevronUp className="h-5 w-5 text-kiosk-textSecondary" />
            ) : (
              <ChevronDown className="h-5 w-5 text-kiosk-textSecondary" />
            )}
          </button>
          {pointSectionOpen && (
            <div className="mt-3">
              <p className="text-xs text-kiosk-textSecondary mb-2">쓸 금액을 선택하세요</p>
              {storePoint > 0 && (
                <button
                  type="button"
                  onClick={() => setUseStorePoint(useStorePoint > 0 ? 0 : Math.min(storePoint, totalPrice))}
                  className={`w-full flex items-center justify-between rounded-xl py-3 px-4 text-sm font-medium mb-2 ${
                    useStorePoint > 0
                      ? 'bg-kiosk-primary text-kiosk-text'
                      : 'bg-kiosk-surface text-kiosk-text border border-kiosk-border'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    매장 포인트 {storePoint.toLocaleString()} P
                  </span>
                  {useStorePoint > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <Check className="h-3 w-3 text-kiosk-primary" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full border-2 border-kiosk-border" />
                  )}
                </button>
              )}
              {tossPoint > 0 && (
                <button
                  type="button"
                  onClick={() => setUseTossPoint(useTossPoint > 0 ? 0 : Math.min(tossPoint, totalPrice))}
                  className={`w-full flex items-center justify-between rounded-xl py-3 px-4 text-sm ${
                    useTossPoint > 0 ? 'bg-blue-100 text-blue-800' : 'bg-kiosk-surface text-kiosk-textSecondary border border-kiosk-border'
                  }`}
                >
                  <span className="flex items-center gap-2">토스 포인트 {tossPoint.toLocaleString()} P</span>
                  {useTossPoint > 0 ? <Check className="h-5 w-5" /> : <span className="w-5 h-5 rounded-full border-2 border-kiosk-border" />}
                </button>
              )}
              {storePoint === 0 && tossPoint === 0 && (
                <p className="text-sm text-kiosk-textSecondary py-2">사용 가능한 포인트가 없습니다.</p>
              )}
            </div>
          )}
        </section>

        {/* 결제수단 */}
        <section className="py-4">
          <button
            type="button"
            onClick={() => setPaymentSectionOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-sm font-medium text-kiosk-text">결제수단</h2>
            {paymentSectionOpen ? (
              <ChevronDown className="h-5 w-5 text-kiosk-textSecondary" />
            ) : (
              <ChevronUp className="h-5 w-5 text-kiosk-textSecondary" />
            )}
          </button>
          {paymentSectionOpen && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`rounded-xl py-3 text-sm font-medium ${
                    paymentMethod === value
                      ? 'bg-kiosk-primary text-kiosk-text'
                      : 'bg-kiosk-surface text-kiosk-textSecondary border border-kiosk-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </section>

        {error && (
          <p className="text-sm text-kiosk-error mt-2" role="alert">
            {error}
          </p>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-kiosk-border bg-white p-4 safe-area-pb">
        <div className="space-y-2 mb-4">
          {user && (
            <div className="flex justify-between text-sm text-kiosk-textSecondary">
              <span>포인트 적립 10%</span>
              <span>{pointsEarnedPreview > 0 ? `${pointsEarnedPreview.toLocaleString()}P` : '-'}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-kiosk-textSecondary">할인된 금액</span>
            <span className={discountAmount > 0 ? 'text-red-600 font-medium' : 'text-kiosk-text'}>
              {discountAmount > 0 ? `-${discountAmount.toLocaleString()}원` : '0원'}
            </span>
          </div>
        </div>
        <Button
          theme="kiosk"
          fullWidth
          onClick={submitOrder}
          disabled={submitting || payAmount < 1}
        >
          {submitting ? '처리 중…' : `${payAmount.toLocaleString()}원 결제하기`}
        </Button>
      </footer>
    </div>
  );
}
