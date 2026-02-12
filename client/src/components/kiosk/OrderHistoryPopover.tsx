import { useEffect, useRef, useState, useCallback } from 'react';
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

const ORDER_STATUS_SEEN_KEY = 'kiosk_order_status_seen';
const POLL_INTERVAL_MS = 20000;

function loadLastSeen(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(ORDER_STATUS_SEEN_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, string>;
    return typeof data === 'object' && data !== null ? data : {};
  } catch {
    return {};
  }
}

function saveLastSeen(orders: UserOrderItem[]) {
  const seen: Record<string, string> = {};
  orders.forEach((o) => { seen[o.id] = o.status; });
  sessionStorage.setItem(ORDER_STATUS_SEEN_KEY, JSON.stringify(seen));
}

function hasStatusChanged(list: UserOrderItem[], lastSeen: Record<string, string>): boolean {
  for (const o of list) {
    if (lastSeen[o.id] !== o.status) return true;
  }
  return false;
}

export function OrderHistoryPopover() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<UserOrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNewChanges, setHasNewChanges] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchOrders = useCallback(() => {
    if (!user) return;
    api.user
      .orders({})
      .then((list) => {
        const slice = list.slice(0, 10);
        setOrders(slice);
        if (!open && slice.length > 0) {
          const lastSeen = loadLastSeen();
          if (Object.keys(lastSeen).length === 0) {
            saveLastSeen(slice);
          } else if (hasStatusChanged(slice, lastSeen)) {
            setHasNewChanges(true);
          }
        }
      })
      .catch(() => setOrders([]));
  }, [user, open]);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    api.user
      .orders({})
      .then((list) => {
        const slice = list.slice(0, 10);
        setOrders(slice);
        saveLastSeen(slice);
        setHasNewChanges(false);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [open, user]);

  useEffect(() => {
    if (!user || open) return;
    fetchOrders();
    const t = setInterval(fetchOrders, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [user, open, fetchOrders]);

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

  const handleToggleOpen = () => {
    setOpen((o) => {
      if (!o && orders.length > 0) {
        saveLastSeen(orders);
        setHasNewChanges(false);
      }
      return !o;
    });
  };

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative p-2 text-kiosk-text hover:bg-kiosk-surface rounded-lg transition-colors"
        aria-label="주문내역"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {hasNewChanges && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
        )}
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
                          order.status === 'CANCELED' ? 'text-kiosk-error' : order.paymentStatus === 'PENDING' ? 'text-amber-600' : 'text-kiosk-primary'
                        }`}
                      >
                        {order.paymentStatus === 'PENDING' && order.status !== 'CANCELED' ? '결제 대기' : (STATUS_LABEL[order.status] ?? order.status)}
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
