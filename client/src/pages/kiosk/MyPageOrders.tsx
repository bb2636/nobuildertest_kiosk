import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type UserOrderItem } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'WAITING', label: '주문 확인 중' },
  { value: 'PREPARING', label: '제조중' },
  { value: 'PICKUP_READY', label: '픽업대기' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
];

const STATUS_LABEL: Record<string, string> = {
  WAITING: '주문 확인 중',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '완료',
  CANCELED: '취소',
  PENDING: '결제 대기',
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: '매장',
  TAKE_OUT: '포장',
};

function formatDateForInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function MyPageOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<UserOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    const params: { status?: string; from?: string; to?: string } = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    api.user.orders(params).then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, [user, navigate, statusFilter, dateFrom, dateTo]);

  if (!user) return null;

  const applyPeriod = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setDateFrom(formatDateForInput(weekAgo));
    setDateTo(formatDateForInput(today));
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 text-kiosk-text">
          &lt;
        </button>
        <h1 className="text-lg font-semibold text-kiosk-text">주문내역</h1>
        <span className="w-8" />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white border border-kiosk-border p-3">
          <p className="text-sm text-kiosk-textSecondary">
            총 {orders.length}개의 주문 내역이 있습니다.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <label className="text-xs text-kiosk-textSecondary whitespace-nowrap">기간</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded border border-kiosk-border px-2 py-1.5 text-sm text-kiosk-text"
              />
              <span className="text-kiosk-textSecondary">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded border border-kiosk-border px-2 py-1.5 text-sm text-kiosk-text"
              />
              <button
                type="button"
                onClick={applyPeriod}
                className="rounded border border-kiosk-border bg-kiosk-surface px-2 py-1.5 text-sm text-kiosk-text"
              >
                최근 7일
              </button>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-kiosk-textSecondary whitespace-nowrap">주문상태</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded border border-kiosk-border bg-white px-2 py-1.5 text-sm text-kiosk-text"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {loading ? (
          <p className="text-kiosk-textSecondary text-center py-8">로딩 중…</p>
        ) : orders.length === 0 ? (
          <p className="text-kiosk-textSecondary text-center py-8">주문 내역이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl bg-white border border-kiosk-border p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-kiosk-text">#{order.orderNo}</span>
                  <span className="text-xs text-kiosk-textSecondary">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
                <p className="text-xs text-kiosk-textSecondary mb-2">
                  {ORDER_TYPE_LABEL[order.orderType] ?? order.orderType} · {new Date(order.createdAt).toLocaleString('ko-KR')}
                </p>
                <ul className="text-sm text-kiosk-text space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.productName}
                      {item.optionNames?.length ? ` (${item.optionNames.join(', ')})` : ''} x{item.quantity} — {item.lineTotalAmount.toLocaleString()}원
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-medium text-kiosk-text mt-2">
                  총 {order.totalAmount.toLocaleString()}원
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
