import { Link, useNavigate } from 'react-router-dom';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { Button } from '../../components/ui/Button';

export function KioskCart() {
  const navigate = useNavigate();
  const { lines, remove, updateQuantity, totalPrice } = useKioskCart();

  if (lines.length === 0) {
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
          {lines.map((line, index) => (
            <li
              key={`${line.productId}-${index}`}
              className="flex items-center justify-between rounded-xl border border-kiosk-border p-3 bg-white"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-kiosk-text truncate">{line.name}</p>
                <p className="text-sm text-kiosk-textSecondary">
                  {(line.unitPrice * line.quantity).toLocaleString()}원
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-full border border-kiosk-border">
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, line.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-kiosk-text"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(index, line.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-kiosk-text"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-kiosk-error text-sm font-medium"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="sticky bottom-0 border-t border-kiosk-border bg-kiosk-bg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-kiosk-textSecondary">총 결제 금액</span>
          <span className="text-lg font-semibold text-kiosk-text">{totalPrice.toLocaleString()}원</span>
        </div>
        <Button theme="kiosk" fullWidth onClick={() => navigate('/checkout')}>
          결제하기
        </Button>
      </footer>
    </div>
  );
}
