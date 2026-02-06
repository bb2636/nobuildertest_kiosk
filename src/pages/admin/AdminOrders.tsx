import { useEffect, useState } from 'react';
import { api, type Order } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기',
  CONFIRMED: '접수',
  PREPARING: '제조 중',
  READY: '준비 완료',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.orders.list().then(setOrders);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await api.orders.updateStatus(id, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">주문 현황</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} theme="admin" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">#{order.orderNo}</span>
              <span className="text-admin-textSecondary text-sm">
                {new Date(order.createdAt).toLocaleString('ko-KR')}
              </span>
            </div>
            <ul className="text-sm text-admin-textSecondary mb-3">
              {order.items.map((oi) => (
                <li key={oi.id}>
                  {oi.item.name} x{oi.quantity} ({(oi.unitPrice * oi.quantity).toLocaleString()}원)
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium">{order.totalPrice.toLocaleString()}원</span>
              <div className="flex gap-2">
                {order.status === 'PENDING' && (
                  <Button
                    theme="admin"
                    variant="primary"
                    onClick={() => updateStatus(order.id, 'CONFIRMED')}
                  >
                    접수
                  </Button>
                )}
                {order.status === 'CONFIRMED' && (
                  <Button
                    theme="admin"
                    variant="primary"
                    onClick={() => updateStatus(order.id, 'PREPARING')}
                  >
                    제조 중
                  </Button>
                )}
                {order.status === 'PREPARING' && (
                  <Button
                    theme="admin"
                    variant="primary"
                    onClick={() => updateStatus(order.id, 'READY')}
                  >
                    준비 완료
                  </Button>
                )}
                {order.status === 'READY' && (
                  <Button
                    theme="admin"
                    variant="primary"
                    onClick={() => updateStatus(order.id, 'COMPLETED')}
                  >
                    완료
                  </Button>
                )}
                <span className="text-sm text-admin-textSecondary">
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
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
