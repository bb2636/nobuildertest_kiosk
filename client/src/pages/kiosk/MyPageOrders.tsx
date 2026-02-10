import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
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

function formatDateForInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(from: string, to: string) {
  if (!from || !to) return '';
  const f = from.replace(/-/g, '.');
  const t = to.replace(/-/g, '.');
  return `${f} - ${t}`;
}

export function MyPageOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<UserOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

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
    setFilterOpen(false);
  };

  const firstItem = (order: UserOrderItem) => order.items[0];
  const firstItemName = (order: UserOrderItem) => firstItem(order)?.productName ?? '주문';
  const hasMoreItems = (order: UserOrderItem) => order.items.length > 1;
  const itemCount = (order: UserOrderItem) => order.items.reduce((sum, i) => sum + i.quantity, 0);
  const firstItemImage = (order: UserOrderItem) => firstItem(order)?.imageUrl;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      <header className="px-4 pt-4 pb-3 border-b border-kiosk-border">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-kiosk-text"
            aria-label="뒤로"
          >
            &lt;
          </button>
          <button
            type="button"
            className="p-2 text-kiosk-text"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
        <p className="text-lg font-medium text-kiosk-text mt-1">
          {user.name}님
        </p>
        <p className="text-kiosk-textSecondary text-sm">환영합니다!</p>
      </header>

      <main className="flex-1 overflow-auto">
        <h2 className="px-4 pt-5 pb-3 text-base font-semibold text-kiosk-text">주문내역</h2>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className="w-full flex items-center justify-between rounded-lg border border-kiosk-border bg-white px-3 py-2.5 text-sm text-kiosk-text"
          >
            <span className="text-kiosk-textSecondary">
              주문상태({STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? '전체'})
            </span>
            <span className="text-kiosk-textSecondary">▾</span>
          </button>
          <div className="mt-2 flex items-center justify-between text-sm text-kiosk-textSecondary">
            <span>{formatDisplayDate(dateFrom, dateTo) || '기간 미설정'}</span>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="rounded-lg border border-kiosk-border bg-kiosk-surface px-3 py-1.5 text-kiosk-text"
            >
              기간설정
            </button>
          </div>

          {filterOpen && (
            <div className="mt-3 p-3 rounded-xl bg-kiosk-surface border border-kiosk-border space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 rounded border border-kiosk-border px-2 py-2 text-sm text-kiosk-text"
                />
                <span className="text-kiosk-textSecondary">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 rounded border border-kiosk-border px-2 py-2 text-sm text-kiosk-text"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded border border-kiosk-border bg-white px-3 py-2 text-sm text-kiosk-text"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyPeriod}
                  className="flex-1 py-2 rounded-lg border border-kiosk-border bg-white text-sm text-kiosk-text"
                >
                  최근 7일
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-kiosk-primary text-sm text-kiosk-text"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-kiosk-textSecondary text-center py-12">로딩 중…</p>
        ) : orders.length === 0 ? (
          <p className="text-kiosk-textSecondary text-center py-12">주문 내역이 없습니다.</p>
        ) : (
          <ul className="border-t border-kiosk-border">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center gap-4 px-4 py-4 border-b border-kiosk-border cursor-pointer hover:bg-kiosk-surface/50 transition-colors"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/mypage/orders/${order.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/mypage/orders/${order.id}`);
                  }
                }}
              >
                <div className="relative shrink-0 w-14 h-14">
                  <div className="absolute inset-0 rounded-full overflow-hidden bg-kiosk-surface">
                    {firstItemImage(order) ? (
                      <img
                        src={firstItemImage(order)!}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span
                      className={`absolute inset-0 flex items-center justify-center text-kiosk-textSecondary text-xs bg-kiosk-surface ${firstItemImage(order) ? 'hidden' : ''}`}
                    >
                      주문
                    </span>
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-kiosk-primary text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm">
                    {itemCount(order)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-kiosk-text text-sm truncate">
                    {firstItemName(order)}
                    {hasMoreItems(order) ? ' 외' : ''}
                  </p>
                  <p className="text-xs text-kiosk-textSecondary mt-0.5">
                    {(() => {
                      const d = new Date(order.createdAt);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      const h = String(d.getHours()).padStart(2, '0');
                      const min = String(d.getMinutes()).padStart(2, '0');
                      return `${y}.${m}.${day} ${h}:${min}`;
                    })()}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-kiosk-text text-sm">
                  {order.totalAmount.toLocaleString()}원
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
