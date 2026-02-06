import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';

type CartLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  optionsJson?: string;
};

export function KioskCart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('cart') ?? '[]');
    } catch {
      return [];
    }
  });
  const [submitting, setSubmitting] = useState(false);

  const totalPrice = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const remove = (index: number) => {
    const next = cart.filter((_, i) => i !== index);
    setCart(next);
    sessionStorage.setItem('cart', JSON.stringify(next));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.orders.create({
        items: cart.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          optionsJson: i.optionsJson,
        })),
      });
      sessionStorage.removeItem('cart');
      setCart([]);
      navigate(`/order-done?orderNo=${order.orderNo}`, { replace: true });
    } catch (e) {
      alert('주문 실패: ' + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0 && !submitting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <p className="text-kiosk-textSecondary mb-4">장바구니가 비어 있습니다.</p>
        <Link to="/">
          <Button theme="kiosk">메뉴 보기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border">
        <Link to="/" className="text-kiosk-text">
          ← 메뉴
        </Link>
        <h1 className="text-lg font-semibold">장바구니</h1>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-auto p-4">
        <ul className="space-y-3">
          {cart.map((line, index) => (
            <li
              key={index}
              className="flex items-center justify-between rounded-xl border border-kiosk-border p-3"
            >
              <div>
                <p className="font-medium">{line.name}</p>
                <p className="text-sm text-kiosk-textSecondary">
                  {line.quantity}개 · {(line.unitPrice * line.quantity).toLocaleString()}원
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-kiosk-error text-sm"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </main>

      <footer className="sticky bottom-0 border-t border-kiosk-border bg-kiosk-bg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-kiosk-textSecondary">총 결제 금액</span>
          <span className="text-lg font-semibold">{totalPrice.toLocaleString()}원</span>
        </div>
        <Button theme="kiosk" fullWidth onClick={submitOrder} disabled={submitting}>
          {submitting ? '처리 중...' : '결제하기'}
        </Button>
      </footer>
    </div>
  );
}
