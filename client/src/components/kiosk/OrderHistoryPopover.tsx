import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api, type UserOrderItem } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABEL: Record<string, string> = {
  WAITING: '접수대기',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '완료',
  CANCELED: '취소',
};

export function OrderHistoryPopover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<UserOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    api.user
      .orders({})
      .then((list) => setOrders(list.slice(0, 10)))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelectOrder = (orderId: string) => {
    setOpen(false);
    navigate(`/mypage/orders/${orderId}`);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-kiosk-text hover:bg-kiosk-surface rounded-lg transition-colors"
        aria-label="주문내역"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[280px] max-h-[70vh] overflow-auto rounded-xl border border-kiosk-border bg-white shadow-lg py-1">
          <div className="px-3 py-2 border-b border-kiosk-border">
            <h3 className="text-sm font-semibold text-kiosk-text">주문내역</h3>
          </div>
          {loading ? (
            <p className="px-3 py-4 text-sm text-kiosk-textSecondary text-center">로딩 중…</p>
          ) : orders.length === 0 ? (
            <p className="px-3 py-4 text-sm text-kiosk-textSecondary text-center">주문 내역이 없습니다.</p>
          ) : (
            <ul className="py-1">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectOrder(order.id)}
                    className="w-full px-3 py-3 text-left hover:bg-kiosk-surface transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-medium text-kiosk-text truncate">
                        #{order.orderNo}
                      </span>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          order.status === 'CANCELED' ? 'text-kiosk-error' : 'text-kiosk-primary'
                        }`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-xs text-kiosk-textSecondary mt-0.5">
                      {order.items[0]?.productName ?? '주문'}
                      {order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ''} ·{' '}
                      {order.totalAmount.toLocaleString()}원
                    </p>
                    <p className="text-xs text-kiosk-textSecondary mt-0.5">
                      {new Date(order.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-kiosk-border px-3 py-2">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/mypage/orders'); }}
              className="w-full text-sm font-medium text-kiosk-primary hover:underline"
            >
              전체 주문내역 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
