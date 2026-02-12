import { useEffect, useState, useRef } from 'react';
import { api, type AdminOrderListItem } from '../../api/client';
import { Modal } from '../../components/ui/Modal';
import { ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'WAITING', label: '접수대기' },
  { value: 'PREPARING', label: '제조중' },
  { value: 'PICKUP_READY', label: '픽업대기' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  WAITING: '접수대기',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '완료',
  CANCELED: '취소',
};

function formatDateForInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildOrderParams(status: string, from: string, to: string, updatedAfter?: string) {
  const params: { status?: string; from?: string; to?: string; updatedAfter?: string } = {};
  if (status !== 'ALL') params.status = status;
  if (from) params.from = from;
  if (to) params.to = to;
  if (updatedAfter) params.updatedAfter = updatedAfter;
  return params;
}

function mergeOrdersInto(cache: AdminOrderListItem[], delta: AdminOrderListItem[]): AdminOrderListItem[] {
  const byId = new Map(cache.map((o) => [o.id, o]));
  for (const o of delta) byId.set(o.id, o);
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return formatDateForInput(weekAgo);
  });
  const [dateTo, setDateTo] = useState(() => formatDateForInput(new Date()));
  const [detailOrder, setDetailOrder] = useState<AdminOrderListItem | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const lastFullFetchRef = useRef<string | null>(null);

  const fetchOrdersFull = () => {
    setLoading(true);
    setListError(null);
    const params = buildOrderParams(statusFilter, dateFrom, dateTo);
    api.admin.orders
      .list(params)
      .then((list) => {
        setOrders(list);
        setListError(null);
        lastFullFetchRef.current = new Date().toISOString();
      })
      .catch((e) => {
        setOrders([]);
        setListError(e instanceof Error ? e.message : '주문 목록을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  };

  const revalidateOrders = () => {
    const since = lastFullFetchRef.current;
    if (!since) return;
    const params = buildOrderParams(statusFilter, dateFrom, dateTo, since);
    api.admin.orders
      .list(params)
      .then((delta) => {
        setOrders((prev) => mergeOrdersInto(prev, delta));
        lastFullFetchRef.current = new Date().toISOString();
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchOrdersFull();
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const interval = setInterval(revalidateOrders, 30_000);
    const onFocus = () => revalidateOrders();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setOpenStatusId(null);
      if (statusFilterRef.current && !statusFilterRef.current.contains(target)) setStatusFilterOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setStatusError(null);
    try {
      await api.admin.orders.updateStatus(id, status);
      setOpenStatusId(null);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      if (detailOrder?.id === id) setDetailOrder((prev) => (prev ? { ...prev, status } : null));
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : '상태 변경에 실패했습니다.');
    }
  };

  const applyRecentWeek = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    setDateFrom(formatDateForInput(weekAgo));
    setDateTo(formatDateForInput(today));
  };

  const productSummary = (order: AdminOrderListItem) => {
    const first = order.items[0]?.productName ?? '';
    const rest = order.items.length - 1;
    return rest > 0 ? `${first} 외` : first;
  };

  return (
    <div>
      <p className="text-sm text-admin-textSecondary mb-1">주문관리 &gt; 주문 내역</p>
      <h2 className="text-lg font-semibold mb-2">주문 내역</h2>
      <p className="text-sm text-admin-textSecondary mb-4">
        총 {orders.length}개의 주문 내역이 있습니다.
      </p>

      {/* 기간 필터 */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="text-sm text-admin-textSecondary">기간</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text"
          aria-label="시작일"
        />
        <span className="text-admin-textSecondary">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text"
          aria-label="종료일"
        />
        <button
          type="button"
          onClick={applyRecentWeek}
          className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text hover:bg-admin-surface"
        >
          기간설정
        </button>
      </div>

      {/* 주문상태 드롭다운 (따로 분리해 드롭박스가 잘 보이도록) */}
      <div className="mb-4" ref={statusFilterRef}>
        <span className="text-sm text-admin-textSecondary mr-2">주문상태</span>
        <div className="relative inline-block mt-1">
          <button
            type="button"
            onClick={() => setStatusFilterOpen((o) => !o)}
            className="inline-flex items-center justify-between gap-2 min-w-[180px] rounded-lg border border-admin-border bg-white px-4 py-2.5 text-sm text-admin-text hover:bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-primary"
            aria-haspopup="listbox"
            aria-expanded={statusFilterOpen}
          >
            주문상태({STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? '전체'})
            <ChevronDown className={`h-4 w-4 text-admin-textSecondary shrink-0 transition ${statusFilterOpen ? 'rotate-180' : ''}`} />
          </button>
          {statusFilterOpen && (
            <ul
              className="absolute left-0 top-full z-[100] mt-1 min-w-[180px] max-h-60 overflow-auto rounded-lg border border-admin-border bg-white py-1 shadow-lg"
              role="listbox"
            >
              {STATUS_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={statusFilter === opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setStatusFilterOpen(false);
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-sm ${
                      statusFilter === opt.value
                        ? 'bg-admin-primary-light text-admin-primary font-medium'
                        : 'text-admin-text hover:bg-admin-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {statusError && (
        <p className="text-admin-error text-sm mb-3" role="alert">
          {statusError}
        </p>
      )}

      {listError && (
        <p className="text-admin-error text-sm mb-3" role="alert">
          {listError}
        </p>
      )}

      {loading ? (
        <p className="text-admin-textSecondary py-8">로딩 중…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-admin-border bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-admin-surface text-admin-textSecondary font-medium">
              <tr>
                <th className="px-4 py-3 w-12">번호</th>
                <th className="px-4 py-3">상품 정보</th>
                <th className="px-4 py-3">주문 시간</th>
                <th className="px-4 py-3">주문 금액</th>
                <th className="px-4 py-3">성향</th>
                <th className="px-4 py-3">주문 확인</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody className="text-admin-text divide-y divide-admin-border">
              {orders.map((order, index) => (
                <tr key={order.id} className="hover:bg-admin-surface/50">
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{productSummary(order)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const d = new Date(order.createdAt);
                      const y = d.getFullYear().toString().slice(-2);
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      const h = String(d.getHours()).padStart(2, '0');
                      const min = String(d.getMinutes()).padStart(2, '0');
                      const s = String(d.getSeconds()).padStart(2, '0');
                      return `${y}-${m}-${day} ${h}:${min}:${s}`;
                    })()}
                  </td>
                  <td className="px-4 py-3">{order.totalAmount.toLocaleString()}원</td>
                  <td className="px-4 py-3">{order.customerName ?? '(비회원)'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDetailOrder(order)}
                      className="text-admin-primary hover:underline font-medium"
                    >
                      상세 확인
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block" ref={openStatusId === order.id ? dropdownRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenStatusId((cur) => (cur === order.id ? null : order.id))}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-xs font-medium ${
                          order.status === 'CANCELED'
                            ? 'border-admin-error text-admin-error bg-red-50'
                            : order.status === 'COMPLETED'
                              ? 'border-admin-primary text-admin-primary bg-admin-primary-light'
                              : 'border-admin-border bg-white text-admin-text hover:bg-admin-surface'
                        }`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                        <ChevronDown className={`h-3.5 w-3.5 transition ${openStatusId === order.id ? 'rotate-180' : ''}`} />
                      </button>
                      {openStatusId === order.id && (
                        <div className="absolute left-0 top-full z-[100] mt-1 min-w-[100px] rounded border border-admin-border bg-white py-1 shadow-lg">
                          {STATUS_OPTIONS.filter((o) => o.value !== 'ALL').map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => updateStatus(order.id, opt.value)}
                              className={`block w-full px-3 py-2 text-left text-xs ${
                                order.status === opt.value
                                  ? 'bg-admin-surface font-medium text-admin-primary'
                                  : 'text-admin-text hover:bg-admin-surface'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <p className="text-admin-textSecondary text-center py-8">주문 내역이 없습니다.</p>
      )}

      <Modal
        theme="admin"
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        title={detailOrder ? `주문 #${detailOrder.orderNo} 상세` : ''}
      >
        {detailOrder && (
          <div className="text-sm space-y-3">
            <p className="text-admin-textSecondary">
              주문 시간: {new Date(detailOrder.createdAt).toLocaleString('ko-KR')}
            </p>
            <p className="text-admin-textSecondary">주문자: {detailOrder.customerName ?? '(비회원)'}</p>
            <p className="font-medium">총 {detailOrder.totalAmount.toLocaleString()}원</p>
            <ul className="border-t border-admin-border pt-3 space-y-2">
              {detailOrder.items.map((i, idx) => (
                <li key={idx}>
                  {i.productName}
                  {i.optionNames?.length ? ` (${i.optionNames.join(', ')})` : ''} x{i.quantity} —{' '}
                  {i.lineTotalAmount.toLocaleString()}원
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
