import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../api/client';
import { filterValidCartLines } from '../../utils/cartValidation';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { getPushSubscription } from '../../utils/pushNotification';

/**
 * 토스페이먼츠 JS SDK (v2)
 * - 결제창(payment)도 v2 표준 SDK에서 제공됨
 * - 일부 환경에서 /v2/payment 경로는 403(S3/CloudFront)로 떨어질 수 있어 /v2/standard 를 우선 사용
 */
const TOSS_SCRIPT_URLS = [
  'https://js.tosspayments.com/v2/standard',
  'https://js.tosspayments.com/v2/payment',
] as const;

/** 스크립트 onload 후에도 전역 TossPayments가 바로 올 수 있으므로 짧게 대기 */
function waitForTossPayments(): Promise<void> {
  const win = window as Window & { TossPayments?: unknown };
  if (typeof win.TossPayments !== 'undefined') return Promise.resolve();
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const max = 30;
    const t = setInterval(() => {
      if (typeof win.TossPayments !== 'undefined') {
        clearInterval(t);
        resolve();
        return;
      }
      if (++attempts >= max) {
        clearInterval(t);
        reject(new Error('토스 결제 스크립트 로드 실패'));
      }
    }, 100);
  });
}

/** 토스 결제창을 띄우려면 스크립트를 먼저 로드해야 함 */
async function loadTossScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  // 이미 로드된 스크립트가 있으면 그대로 사용
  const anyExisting = Array.from(document.scripts).some((s) =>
    TOSS_SCRIPT_URLS.some((u) => s.src === u)
  );
  if (anyExisting) return waitForTossPayments();

  // 우선순위: v2/standard → (fallback) v2/payment
  let lastErr: unknown = null;
  for (const url of TOSS_SCRIPT_URLS) {
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`토스 결제 스크립트 로드 실패: ${url}`));
        document.head.appendChild(script);
      });
      await waitForTossPayments();
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('토스 결제 스크립트 로드 실패');
}

/** 토스 결제 선택 시에만 토스 결제창 사용. (카드/계좌이체 등 코드에 있어도 무시) */
const USE_TOSS_WINDOW: string[] = ['TOSS'];

/** v2 결제창 requestPayment 파라미터 (단일 객체) */
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (params: { customerKey: string }) => {
        requestPayment: (paymentRequest: {
          method: 'CARD';
          amount: { value: number; currency: string };
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
        }) => Promise<void>;
      };
    };
  }
}

const MEAL_OPTIONS = [
  { value: 'DINE_IN', labelKey: 'mealDineIn' as const },
  { value: 'TAKE_OUT', labelKey: 'mealTakeOut' as const },
] as const;

/** 결제 수단: 토스 결제 + 현금만 노출 (카드/계좌이체 등은 무시) */
const PAYMENT_METHOD_KEYS = [
  { value: 'TOSS', labelKey: 'paymentTOSS' as const },
  { value: 'CASH', labelKey: 'paymentCASH' as const },
] as const;

const POINT_RATE = 0.1;

export function Checkout() {
  const { t } = useTranslation('kiosk');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { lines, totalPrice, clear, setLinesFromValidation } = useKioskCart();
  const [mealType, setMealType] = useState<'DINE_IN' | 'TAKE_OUT'>('DINE_IN');
  const [useStorePoint, setUseStorePoint] = useState(0); // 매장 포인트 사용액 (원)
  const [useTossPoint, setUseTossPoint] = useState(0); // 토스 포인트는 0으로 두고 UI만
  const [paymentMethod, setPaymentMethod] = useState<string>('TOSS');
  const [enablePush, setEnablePush] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cartChangedMessage, setCartChangedMessage] = useState<string | null>(null);
  const paymentFailFromToss = searchParams.get('payment') === 'fail';
  const [showPaymentCancelledMessage, setShowPaymentCancelledMessage] = useState(false);
  const [openSection, setOpenSection] = useState<'meal' | 'points' | 'payment' | null>('meal');

  useEffect(() => {
    if (paymentFailFromToss) {
      setShowPaymentCancelledMessage(true);
      setSearchParams({}, { replace: true });
    }
  }, [paymentFailFromToss, setSearchParams]);

  const storePoint = user?.point ?? 0;
  const tossPoint = 0; // 외부 토스 포인트는 연동 시 설정
  const discountAmount = useStorePoint + useTossPoint;
  const payAmount = Math.max(0, totalPrice - discountAmount);
  const pointsEarnedPreview = user ? Math.floor(payAmount * POINT_RATE) : 0;

  useEffect(() => {
    if (lines.length === 0) {
      navigate('/cart', { replace: true });
      return;
    }
    api.menu
      .list()
      .then((menuItems) => {
        const valid = filterValidCartLines(lines, menuItems);
        if (valid.length === 0) {
          setLinesFromValidation([]);
          navigate('/cart', {
            replace: true,
            state: {
              cartChangedMessage: '메뉴가 변경되어 담은 상품을 더 이상 주문할 수 없습니다. 메뉴를 다시 확인해 주세요.',
            },
          });
          return;
        }
        if (valid.length < lines.length) {
          setLinesFromValidation(valid);
          setCartChangedMessage('메뉴가 변경되어 일부 상품이 장바구니에서 제거되었습니다.');
        }
      })
      .catch(() => {});
  }, [lines, navigate, setLinesFromValidation]);

  useEffect(() => {
    if (useStorePoint + useTossPoint <= totalPrice) return;
    const newStore = Math.max(0, Math.min(useStorePoint, totalPrice - useTossPoint));
    const newToss = Math.max(0, Math.min(useTossPoint, totalPrice - newStore));
    setUseStorePoint(newStore);
    setUseTossPoint(newToss);
  }, [totalPrice, useStorePoint, useTossPoint]);

  const submitOrder = async () => {
    setError('');
    setSubmitting(true);
    try {
      const usePoint = Math.min(useStorePoint, totalPrice);
      if (usePoint > 0 && (!user || (user.point ?? 0) < usePoint)) {
        setError('보유 포인트가 부족합니다.');
        setSubmitting(false);
        return;
      }
      if (usePoint > totalPrice || useStorePoint + useTossPoint > totalPrice) {
        setError('사용 포인트는 결제 금액을 초과할 수 없습니다.');
        setSubmitting(false);
        return;
      }

      // 카드/토스 + 결제금액 > 0 → 토스 결제창. 결제금액 0원(전액 포인트)이면 토스 창 없이 즉시 PAID 처리
      const useTossWindow = USE_TOSS_WINDOW.includes(paymentMethod) && payAmount > 0;
      if (useTossWindow) {
        const clientKey = import.meta.env.VITE_TOSSPAYMENTS_CLIENT_KEY as string | undefined;
        if (!clientKey || typeof clientKey !== 'string') {
          setError('토스 테스트 결제 키가 없습니다. .env에 VITE_TOSSPAYMENTS_CLIENT_KEY (테스트: test_ck_...) 를 설정하세요.');
          setSubmitting(false);
          return;
        }
        try {
          await loadTossScript();
        } catch {
          try {
            await new Promise((r) => setTimeout(r, 500));
            await loadTossScript();
          } catch {
            setError(
              '토스 결제 스크립트를 불러올 수 없습니다. 네트워크를 확인하거나 광고 차단을 해제한 후 다시 시도해 주세요. ' +
              '브라우저 개발자도구 Network 탭에서 js.tosspayments.com 요청이 403이면, 토스페이먼츠 개발자센터에서 이 사이트 주소(localhost 등)를 허용 도메인으로 등록해 주세요.'
            );
            setSubmitting(false);
            return;
          }
        }
        const TossPayments = window.TossPayments;
        if (!TossPayments) {
          setError(
            '토스 결제 스크립트를 불러올 수 없습니다. 네트워크를 확인하거나 광고 차단을 해제한 후 다시 시도해 주세요. ' +
            '403 오류가 나면 개발자센터에서 허용 도메인(예: http://localhost:5173) 등록을 확인해 주세요.'
          );
          setSubmitting(false);
          return;
        }
        const pushSub = enablePush
          ? await getPushSubscription(import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)
          : null;
        let res: { orderId: string; orderNo: string; orderNumber: number; pointsEarned?: number };
        try {
          res = await api.orders.createOrder({
            totalPrice,
            items: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              optionIds: l.optionIds ?? [],
            })),
            orderType: mealType,
            paymentMethod: 'TOSS',
            usePoint: usePoint > 0 ? usePoint : undefined,
            pushSubscription: pushSub ?? undefined,
          });
        } catch (orderErr) {
          setError(orderErr instanceof Error ? orderErr.message : '주문 접수에 실패했습니다.');
          setSubmitting(false);
          return;
        }
        const origin = window.location.origin;
        try {
          const payment = TossPayments(clientKey).payment({ customerKey: user?.id ?? 'kiosk-guest' });
          await payment.requestPayment({
            method: 'CARD',
            amount: { value: payAmount, currency: 'KRW' },
            orderId: res.orderId,
            orderName: '키오스크 주문',
            successUrl: `${origin}/payment/success`,
            failUrl: `${origin}/checkout?payment=fail`,
          });
        } catch (tossErr) {
          setError(
            `결제창을 열 수 없었습니다. 주문번호 ${res.orderNo}는 미결제 상태로 접수되었습니다. ` +
              '매장에서 현금 결제하시거나, 마이페이지에서 해당 주문을 확인해 주세요.'
          );
          setSubmitting(false);
          return;
        }
        setSubmitting(false);
        return;
      }

      // 현금 → 결제창 없이 무조건 PAID 처리 (서버에서 현금 주문은 즉시 PAID)
      const paymentMethodForApi = (payAmount === 0 && USE_TOSS_WINDOW.includes(paymentMethod))
        ? 'CASH'
        : (paymentMethod as 'CASH');
      const pushSub = enablePush
        ? await getPushSubscription(import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)
        : null;
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
        pushSubscription: pushSub ?? undefined,
      });
      const params = new URLSearchParams({ orderNo: res.orderNo });
      if (res.orderId) params.set('orderId', res.orderId);
      if (res.pointsEarned != null) params.set('points', String(res.pointsEarned));
      navigate(`/order-done?${params.toString()}`, { replace: true });
      clear();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '주문 처리에 실패했습니다.';
      if (msg === 'ORDER_TOTAL_MISMATCH') {
        setError('주문 금액이 일치하지 않습니다. 장바구니를 확인한 뒤 다시 시도해 주세요.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-kiosk-text"
          aria-label="뒤로 가기"
        >
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">{t('checkoutTitle')}</h1>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-auto px-4 md:px-6 py-4 space-y-0">
        {showPaymentCancelledMessage && (
          <div
            className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
            role="status"
          >
            {t('paymentCancelled')}
          </div>
        )}
        {cartChangedMessage && (
          <div
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="alert"
          >
            {cartChangedMessage}
          </div>
        )}

        {/* 식사 방법 - 접이식 */}
        <section className="border-b border-kiosk-border">
          <button
            type="button"
            onClick={() => setOpenSection((s) => (s === 'meal' ? 'points' : 'meal'))}
            className="w-full flex items-center justify-between py-4 px-0 text-left"
          >
            <h2 className="text-sm font-medium text-kiosk-text">{t('sectionMeal')}</h2>
            <span className="text-sm text-kiosk-textSecondary">
              {mealType === 'DINE_IN' ? t('mealDineIn') : t('mealTakeOut')}
            </span>
            {openSection === 'meal' ? <ChevronUp className="h-5 w-5 text-kiosk-textSecondary" /> : <ChevronDown className="h-5 w-5 text-kiosk-textSecondary" />}
          </button>
          {openSection === 'meal' && (
            <div className="pb-4 flex gap-2">
              {MEAL_OPTIONS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setMealType(value); setOpenSection('points'); }}
                  className={`flex-1 flex items-center justify-center rounded-xl py-3 px-4 text-sm font-medium ${
                    mealType === value ? 'bg-kiosk-primary text-kiosk-text' : 'bg-kiosk-surface text-kiosk-textSecondary border border-kiosk-border'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 토스 포인트 - 접이식 */}
        <section className="border-b border-kiosk-border">
          <button
            type="button"
            onClick={() => setOpenSection((s) => (s === 'points' ? 'payment' : 'points'))}
            className="w-full flex items-center justify-between py-4 px-0 text-left"
          >
            <h2 className="text-sm font-medium text-kiosk-text">{t('sectionPoints')}</h2>
            <span className="text-sm text-kiosk-textSecondary">
              {discountAmount > 0 ? `${discountAmount.toLocaleString()}P ${t('storePoint')}` : (storePoint > 0 || tossPoint > 0) ? t('selectPointAmount') : '-'}
            </span>
            {openSection === 'points' ? <ChevronUp className="h-5 w-5 text-kiosk-textSecondary" /> : <ChevronDown className="h-5 w-5 text-kiosk-textSecondary" />}
          </button>
          {openSection === 'points' && (
            <div className="pb-4">
              <p className="text-xs text-kiosk-textSecondary mb-2">{t('selectPointAmount')}</p>
              {storePoint > 0 && (
                <button
                  type="button"
                  onClick={() => { setUseStorePoint(useStorePoint > 0 ? 0 : Math.min(storePoint, totalPrice - useTossPoint)); setOpenSection('payment'); }}
                  className={`w-full flex items-center justify-between rounded-xl py-3 px-4 text-sm font-medium mb-2 ${
                    useStorePoint > 0 ? 'bg-kiosk-primary text-kiosk-text' : 'bg-kiosk-surface text-kiosk-text border border-kiosk-border'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    {t('storePoint')} {storePoint.toLocaleString()} P
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
                  onClick={() => setUseTossPoint(useTossPoint > 0 ? 0 : Math.min(tossPoint, totalPrice - useStorePoint))}
                  className={`w-full flex items-center justify-between rounded-xl py-3 px-4 text-sm ${
                    useTossPoint > 0 ? 'bg-blue-100 text-blue-800' : 'bg-kiosk-surface text-kiosk-textSecondary border border-kiosk-border'
                  }`}
                >
                  <span className="flex items-center gap-2">{t('tossPoint')} {tossPoint.toLocaleString()} P</span>
                  {useTossPoint > 0 ? <Check className="h-5 w-5" /> : <span className="w-5 h-5 rounded-full border-2 border-kiosk-border" />}
                </button>
              )}
              {storePoint === 0 && tossPoint === 0 && (
                <p className="text-sm text-kiosk-textSecondary py-2">{t('noPointsAvailable')}</p>
              )}
              <button
                type="button"
                onClick={() => setOpenSection('payment')}
                className="mt-2 text-sm text-kiosk-textSecondary underline"
              >
                다음: 결제수단
              </button>
            </div>
          )}
        </section>

        {/* 결제수단 - 접이식 */}
        <section className="border-b border-kiosk-border">
          <button
            type="button"
            onClick={() => setOpenSection((s) => (s === 'payment' ? null : 'payment'))}
            className="w-full flex items-center justify-between py-4 px-0 text-left"
          >
            <h2 className="text-sm font-medium text-kiosk-text">{t('sectionPayment')}</h2>
            <span className="text-sm text-kiosk-textSecondary">
              {paymentMethod === 'TOSS' ? t('paymentTOSS') : t('paymentCASH')}
            </span>
            {openSection === 'payment' ? <ChevronUp className="h-5 w-5 text-kiosk-textSecondary" /> : <ChevronDown className="h-5 w-5 text-kiosk-textSecondary" />}
          </button>
          {openSection === 'payment' && (
            <div className="pb-4 grid grid-cols-2 gap-2">
              {PAYMENT_METHOD_KEYS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`rounded-xl py-3 text-sm font-medium ${
                    paymentMethod === value ? 'bg-kiosk-primary text-kiosk-text' : 'bg-kiosk-surface text-kiosk-textSecondary border border-kiosk-border'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          )}
        </section>

        {error && (
          <p className="text-sm text-kiosk-error mt-2" role="alert" aria-atomic="true">
            {error}
          </p>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-kiosk-border bg-white p-4 md:p-6 safe-area-pb">
        <p className="text-xs text-kiosk-textSecondary mb-2">{t('maxItemsPerOrder')}</p>
        <label className="flex items-center gap-2 mb-3 text-sm text-kiosk-text cursor-pointer">
          <input
            type="checkbox"
            checked={enablePush}
            onChange={(e) => setEnablePush(e.target.checked)}
            className="rounded border-kiosk-border"
          />
          {t('pushNotifyLabel')}
        </label>
        <div className="space-y-2 mb-4">
          {user && (
            <div className="flex justify-between text-sm text-kiosk-textSecondary">
              <span>{t('pointEarn')}</span>
              <span>{pointsEarnedPreview > 0 ? `${pointsEarnedPreview.toLocaleString()}P` : '-'}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-kiosk-textSecondary">{t('discountAmount')}</span>
            <span className={discountAmount > 0 ? 'text-red-600 font-medium' : 'text-kiosk-text'}>
              {discountAmount > 0 ? `-${discountAmount.toLocaleString()}${t('currencyUnit')}`.trim() : `0${t('currencyUnit')}`.trim()}
            </span>
          </div>
        </div>
        <Button
          theme="kiosk"
          fullWidth
          onClick={submitOrder}
          disabled={submitting || (paymentMethod === 'TOSS' && payAmount < 1)}
        >
          {submitting ? t('processing') : t('payButton', { amount: `${payAmount.toLocaleString()}${t('currencyUnit')}`.trim() })}
        </Button>
      </footer>
    </div>
  );
}
