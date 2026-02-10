import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type UserOrderItem } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  WAITING: '접수대기',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '픽업 완료',
  CANCELED: '취소',
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: '매장',
  TAKE_OUT: '포장',
};

const POLL_INTERVAL_MS = 4000;
const LIVE_STATUSES = ['WAITING', 'PREPARING', 'PICKUP_READY'];

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
      <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5] items-center justify-center p-6">
        <p className="text-kiosk-textSecondary">로딩 중…</p>
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5] p-6">
        <header className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-kiosk-text">
            &lt;
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

  const isLive = LIVE_STATUSES.includes(order.status);
  /** 로그인한 본인 주문일 때만 취소 가능 (접수대기 상태만) */
  const canCancel = !!user && order.status === 'WAITING';

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

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-kiosk-text">
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">주문 상태 보기</h1>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="rounded-xl bg-white border border-kiosk-border p-4 mb-4">
          <div className="flex justify-between items-start mb-2">
            <span className="font-semibold text-kiosk-text">#{order.orderNo}</span>
            <span
              className={`text-sm font-medium ${
                order.status === 'CANCELED' ? 'text-kiosk-error' : 'text-kiosk-primary'
              }`}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
          {isLive && (
            <p className="text-xs text-kiosk-textSecondary mb-2">
              상태가 자동으로 갱신됩니다.
            </p>
          )}
          <p className="text-xs text-kiosk-textSecondary mb-3">
            {ORDER_TYPE_LABEL[order.orderType] ?? order.orderType} ·{' '}
            {new Date(order.createdAt).toLocaleString('ko-KR')}
          </p>

          <ul className="text-sm text-kiosk-text space-y-1 border-t border-kiosk-border pt-3">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.productName}
                {item.optionNames?.length ? ` (${item.optionNames.join(', ')})` : ''} x{item.quantity} —{' '}
                {item.lineTotalAmount.toLocaleString()}원
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium text-kiosk-text mt-3 pt-3 border-t border-kiosk-border">
            총 {order.totalAmount.toLocaleString()}원
          </p>
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
            className="w-full py-3 rounded-xl border border-kiosk-error text-kiosk-error font-medium mb-3 disabled:opacity-50"
          >
            {canceling ? '취소 처리 중…' : '주문 취소'}
          </button>
        )}

        {(order.status === 'COMPLETED' || order.status === 'CANCELED') && (
          <p className="text-xs text-kiosk-textSecondary text-center">
            {order.status === 'CANCELED' ? '취소된 주문입니다.' : '픽업이 완료된 주문입니다.'} 주문내역만 확인할 수 있습니다.
          </p>
        )}
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-kiosk-border p-4 safe-area-pb">
        <button
          type="button"
          onClick={() => navigate('/mypage/orders')}
          className="w-full py-3 rounded-xl bg-kiosk-primary text-kiosk-text font-medium"
        >
          주문내역으로
        </button>
      </footer>
    </div>
  );
}
