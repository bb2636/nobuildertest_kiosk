import { useEffect, useState } from 'react';
import { api, type Order } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const STATUS_LABEL: Record<string, string> = {
  WAITING: '접수대기',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '완료',
  CANCELED: '취소',
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
                  {oi.product.name} x{oi.quantity} ({oi.lineTotalAmount.toLocaleString()}원)
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium">{order.totalAmount.toLocaleString()}원</span>
              <div className="flex gap-2">
                {order.status === 'WAITING' && (
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
                    onClick={() => updateStatus(order.id, 'PICKUP_READY')}
                  >
                    준비 완료
                  </Button>
                )}
                {order.status === 'PICKUP_READY' && (
                  <Button
                    theme="admin"
                    variant="primary"
                    onClick={() => updateStatus(order.id, 'COMPLETED')}
                  >
                    완료
                  </Button>
                )}
                {['WAITING', 'PREPARING', 'PICKUP_READY'].includes(order.status) && (
                  <Button
                    theme="admin"
                    variant="secondary"
                    onClick={() => updateStatus(order.id, 'CANCELED')}
                  >
                    취소
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
