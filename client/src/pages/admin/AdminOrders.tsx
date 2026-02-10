import { useEffect, useState, useRef } from 'react';
import { api, type AdminOrderListItem } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { ChevronDown } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'WAITING', label: '접수대기' },
  { value: 'PREPARING', label: '제조중' },
  { value: 'PICKUP_READY', label: '픽업대기' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELED', label: '취소' },
] as const;

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: '매장',
  TAKE_OUT: '포장',
};

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.admin.orders.list().then(setOrders);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setStatusError(null);
    try {
      await api.admin.orders.updateStatus(id, status);
      setOpenStatusId(null);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : '상태 변경에 실패했습니다.');
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">주문 현황</h2>
      {statusError && (
        <p className="text-admin-error text-sm mb-3" role="alert">
          {statusError}
        </p>
      )}
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} theme="admin" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">#{order.orderNo}</span>
              <span className="text-admin-textSecondary text-sm">
                {ORDER_TYPE_LABEL[order.orderType] ?? order.orderType} · {new Date(order.createdAt).toLocaleString('ko-KR')}
              </span>
            </div>
            <ul className="text-sm text-admin-textSecondary mb-3">
              {order.items.map((oi, idx) => (
                <li key={idx}>
                  {oi.productName}
                  {oi.optionNames?.length ? ` (${oi.optionNames.join(', ')})` : ''} x{oi.quantity} ({oi.lineTotalAmount.toLocaleString()}원)
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium">{order.totalAmount.toLocaleString()}원</span>
              <div className="relative flex items-center gap-2" ref={openStatusId === order.id ? dropdownRef : undefined}>
                <button
                  type="button"
                  onClick={() => setOpenStatusId((cur) => (cur === order.id ? null : order.id))}
                  className="inline-flex items-center gap-1 rounded-lg border border-admin-border bg-white px-3 py-2 text-sm font-medium text-admin-text hover:bg-admin-surface"
                >
                  {STATUS_OPTIONS.find((s) => s.value === order.status)?.label ?? order.status}
                  <ChevronDown className={`h-4 w-4 transition ${openStatusId === order.id ? 'rotate-180' : ''}`} />
                </button>
                {openStatusId === order.id && (
                  <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded-lg border border-admin-border bg-white py-1 shadow-lg">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateStatus(order.id, opt.value)}
                        className={`block w-full px-3 py-2 text-left text-sm ${
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
            </div>
          </Card>
        ))}
      </div>
      {orders.length === 0 && (
        <p className="text-admin-textSecondary text-center py-8">주문이 없습니다.</p>
      )}
    </div>
  );
}
