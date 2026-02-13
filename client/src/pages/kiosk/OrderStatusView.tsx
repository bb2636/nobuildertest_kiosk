import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type UserOrderItem } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { OrderHistoryPopover } from '../../components/kiosk/OrderHistoryPopover';

const STATUS_MESSAGE: Record<string, string> = {
  WAITING: '주문이 접수되었습니다.',
  PREPARING: '메뉴를 준비하고 있습니다.',
  PICKUP_READY: '픽업 대기 중입니다.',
  COMPLETED: '주문이 완료되었습니다.',
  CANCELED: '주문이 취소되었습니다.',
};

const POLL_INTERVAL_MS = 4000;
const LIVE_STATUSES = ['WAITING', 'PREPARING', 'PICKUP_READY'];

/** 진행 단계: 1 결제(완료/대기), 2 메뉴 준비중, 3 제조 완료. paymentStatus PENDING이면 결제 미완료 */
function getProgress(order: UserOrderItem) {
  const s = order.status;
  const paymentPending = order.paymentStatus === 'PENDING';
  if (s === 'CANCELED') {
    return { step1: false, step2: false, step3: false, currentStep: 0, paymentPending: false };
  }
  const step1 = true;
  const step2 = !paymentPending && (s === 'PREPARING' || s === 'PICKUP_READY' || s === 'COMPLETED');
  const step3 = s === 'PICKUP_READY' || s === 'COMPLETED';
  let currentStep = 1;
  if (paymentPending) currentStep = 1;
  else if (s === 'WAITING') currentStep = 2;
  else if (s === 'PREPARING') currentStep = 2;
  else if (s === 'PICKUP_READY' || s === 'COMPLETED') currentStep = 3;
  return { step1, step2, step3, currentStep, paymentPending };
}

function formatOrderTime(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = d.getHours();
  const ampm = hour < 12 ? '오전' : '오후';
  const h = String(hour % 12 || 12).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}${m}${day} ${ampm} ${h}:${min}`;
}

export function OrderStatusView() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<UserOrderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = () => {
    if (!orderId) return;
    setError(null);
    api.user
      .getOrder(orderId)
      .then(setOrder)
      .catch(() => setError('주문을 불러올 수 없습니다.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!orderId) {
      setError('주문 정보가 없습니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !order || !LIVE_STATUSES.includes(order.status)) return;
    pollRef.current = setInterval(fetchOrder, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [orderId, order?.status]);

  if (loading && !order) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white items-center justify-center p-6">
        <p className="text-kiosk-textSecondary">로딩 중…</p>
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white p-6">
        <header className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => navigate(-1)} className="p-3 -ml-2 text-kiosk-text text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="뒤로 가기">
            ‹
          </button>
          <h1 className="text-lg font-semibold text-kiosk-text">주문 상태</h1>
          <span className="w-8" />
        </header>
        <p className="text-kiosk-error text-center py-8">{error ?? '주문을 찾을 수 없습니다.'}</p>
        <button
          type="button"
          onClick={() => navigate('/mypage/orders')}
          className="w-full py-3 rounded-xl bg-kiosk-primary text-kiosk-text font-medium"
        >
          주문내역으로
        </button>
      </div>
    );
  }

  const canCancel = !!user && order.status === 'WAITING';
  const progress = getProgress(order);
  const isLive = LIVE_STATUSES.includes(order.status);
  const pickupNumber = order.orderNumber != null ? String(order.orderNumber).padStart(2, '0') : null;

  const handleCancel = async () => {
    if (!orderId || !canCancel || canceling) return;
    setCancelError(null);
    setCanceling(true);
    try {
      const updated = await api.user.cancelOrder(orderId);
      setOrder(updated);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : '취소에 실패했습니다.');
    } finally {
      setCanceling(false);
    }
  };

  if (order.status === 'CANCELED') {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-white">
        <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border">
          <button type="button" onClick={() => navigate(-1)} className="p-3 -ml-2 text-kiosk-text text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="뒤로 가기">
            ‹
          </button>
          <h1 className="text-lg font-semibold text-kiosk-text">주문 상태</h1>
          <OrderHistoryPopover />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <p className="text-center text-kiosk-error font-medium py-8">주문이 취소되었습니다.</p>
          <div className="rounded-xl bg-white border border-kiosk-border p-4 space-y-2 text-sm text-kiosk-textSecondary">
            <p>주문번호 {order.orderNo}</p>
            <p>{order.totalAmount.toLocaleString()}원</p>
          </div>
        </main>
        <footer className="sticky bottom-0 bg-white border-t border-kiosk-border p-4 safe-area-pb">
          <button
            type="button"
            onClick={() => navigate('/mypage/orders')}
            className="w-full py-3 rounded-xl bg-kiosk-primary text-kiosk-text font-medium"
          >
            확인
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border shrink-0">
<button type="button" onClick={() => navigate(-1)} className="p-3 -ml-2 text-kiosk-text text-xl font-medium min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="뒤로 가기">
            ‹
          </button>
          <h1 className="text-lg font-semibold text-kiosk-text">주문 상태</h1>
          <OrderHistoryPopover />
      </header>

      <main className="flex-1 overflow-auto p-4">
        {/* 결제 미완료 안내 */}
        {progress.paymentPending && (
          <div className="rounded-xl border border-kiosk-border bg-white p-4 mb-4 text-kiosk-text text-sm">
            <p className="font-medium">결제가 완료되지 않았습니다.</p>
            <p className="mt-1 text-kiosk-textSecondary">이 주문은 결제 대기 상태입니다. 주문을 취소하시거나 매장에서 현금 결제해 주세요.</p>
          </div>
        )}

        {/* 픽업 번호 + 상태 메시지 */}
        <div className="text-center mb-6">
          {pickupNumber && !progress.paymentPending && (
            <p className="text-4xl font-bold text-kiosk-primary mb-1">{pickupNumber}번</p>
          )}
          <p className="text-base font-medium text-kiosk-text mb-0.5">
            {STATUS_MESSAGE[order.status] ?? order.status}
          </p>
          {isLive && !progress.paymentPending && (
            <p className="text-sm text-kiosk-textSecondary">약 5~10분 정도 소요됩니다.</p>
          )}
        </div>

        {/* 진행 단계 바 */}
        <div className="rounded-xl bg-white border border-kiosk-border p-4 mb-4">
          <div className="flex items-start justify-between gap-0">
            <div className="flex flex-col items-center shrink-0">
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  progress.paymentPending ? 'bg-gray-400 text-white' : progress.step1 ? 'bg-kiosk-primary text-kiosk-text' : 'bg-gray-200 text-gray-500'
                }`}
              >
                1
              </span>
              <p className="text-xs text-kiosk-textSecondary mt-2 text-center whitespace-nowrap">
                {progress.paymentPending ? '결제 대기' : '결제완료'}
              </p>
              <p className="text-[10px] text-kiosk-textSecondary leading-tight">{formatOrderTime(order.createdAt)}</p>
            </div>
            <div
              className={`flex-1 h-1 mt-4 mx-1 min-w-[12px] rounded ${
                progress.step2 ? 'bg-kiosk-primary' : 'bg-gray-200'
              }`}
              style={{ maxWidth: 48 }}
            />
            <div className="flex flex-col items-center shrink-0">
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  progress.step2 ? 'bg-kiosk-primary text-kiosk-text' : 'bg-gray-200 text-gray-500'
                } ${progress.currentStep === 2 ? 'ring-2 ring-kiosk-primary ring-offset-2' : ''}`}
              >
                2
              </span>
              <p className="text-xs text-kiosk-textSecondary mt-2 text-center whitespace-nowrap">메뉴 준비중</p>
              <p className="text-[10px] text-kiosk-textSecondary leading-tight">{formatOrderTime(order.createdAt)}</p>
            </div>
            <div
              className={`flex-1 h-1 mt-4 mx-1 min-w-[12px] rounded ${
                progress.step3 ? 'bg-kiosk-primary' : 'bg-gray-200'
              }`}
              style={{ maxWidth: 48 }}
            />
            <div className="flex flex-col items-center shrink-0">
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  progress.step3 ? 'bg-kiosk-primary text-kiosk-text' : 'bg-gray-200 text-gray-500'
                } ${progress.currentStep === 3 ? 'ring-2 ring-kiosk-primary ring-offset-2' : ''}`}
              >
                3
              </span>
              <p className="text-xs text-kiosk-textSecondary mt-2 text-center whitespace-nowrap">제조 완료</p>
              <p className="text-[10px] text-kiosk-textSecondary leading-tight">
                {order.status === 'COMPLETED' || order.status === 'PICKUP_READY'
                  ? formatOrderTime(order.updatedAt ?? order.createdAt)
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* 주문 상세 카드 */}
        <div className="rounded-xl bg-white border border-kiosk-border p-4 mb-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-kiosk-textSecondary">주문 번호</dt>
              <dd className="font-medium text-kiosk-text">{order.orderNo}</dd>
            </div>
            <div>
              <dt className="text-kiosk-textSecondary">결제 금액</dt>
              <dd className="font-medium text-kiosk-text">{order.totalAmount.toLocaleString()}원</dd>
            </div>
            <div>
              <dt className="text-kiosk-textSecondary">메뉴</dt>
              <dd className="text-kiosk-text">
                <ul className="mt-0.5 space-y-0.5">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.productName}
                      {item.optionNames?.length ? ` (${item.optionNames.join(', ')})` : ''} x{item.quantity} —{' '}
                      {item.lineTotalAmount.toLocaleString()}원
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>

        {cancelError && (
          <p className="text-sm text-kiosk-error mb-3" role="alert">
            {cancelError}
          </p>
        )}

        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={canceling}
            className="w-full py-3 rounded-xl border border-kiosk-error text-kiosk-error font-medium mb-4 disabled:opacity-50"
          >
            {canceling ? '취소 처리 중…' : '주문 취소'}
          </button>
        )}
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-kiosk-border p-4 safe-area-pb">
        <button
          type="button"
          onClick={() => navigate('/mypage/orders')}
          className="w-full py-3 rounded-xl border border-kiosk-border bg-white text-kiosk-text font-medium hover:bg-gray-50"
        >
          확인
        </button>
      </footer>
    </div>
  );
}
