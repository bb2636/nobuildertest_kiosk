import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type MenuItem } from '../../api/client';
import { Button } from '../../components/ui/Button';

export function KioskMenuDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (!itemId) return;
    api.menu.get(itemId).then(setItem).catch(() => setItem(null));
  }, [itemId]);

  if (!item) {
    return (
      <div className="p-4">
        <p className="text-kiosk-textSecondary">메뉴를 불러오는 중...</p>
      </div>
    );
  }

  const totalPrice = item.basePrice * quantity;

  const addToCart = () => {
    const cart = JSON.parse(sessionStorage.getItem('cart') ?? '[]');
    cart.push({
      itemId: item.id,
      name: item.name,
      quantity,
      unitPrice: totalPrice / quantity,
      optionsJson: JSON.stringify(options),
    });
    sessionStorage.setItem('cart', JSON.stringify(cart));
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border">
        <button type="button" onClick={() => navigate(-1)} className="text-kiosk-text">
          ← 뒤로
        </button>
        <h1 className="text-lg font-semibold">{item.name}</h1>
        <span className="w-8" />
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="aspect-square max-w-xs mx-auto bg-cool-gray-3 rounded-xl mb-4 flex items-center justify-center text-kiosk-textSecondary">
          {item.images[0] ? (
            <img src={item.images[0].url} alt="" className="w-full h-full object-cover rounded-xl" />
          ) : (
            '이미지 없음'
          )}
        </div>
        <p className="text-kiosk-textSecondary text-sm mb-4">{item.description ?? ''}</p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-kiosk-textSecondary">수량</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-kiosk-border"
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full border border-kiosk-border"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-kiosk-border bg-kiosk-bg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-semibold">
            {totalPrice.toLocaleString()}원
          </span>
        </div>
        <Button
          theme="kiosk"
          fullWidth
          onClick={item.isSoldOut ? undefined : addToCart}
          disabled={item.isSoldOut}
        >
          {item.isSoldOut ? '품절' : '장바구니 담기'}
        </Button>
      </footer>
    </div>
  );
}
