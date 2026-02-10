import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';
import { api, type MenuItem } from '../../api/client';
import { useKioskCart } from '../../contexts/KioskCartContext';
import { useAuth } from '../../contexts/AuthContext';

export function KioskHome() {
  const { user } = useAuth();
  const { lines, clear } = useKioskCart();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const cartCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalPrice = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    api.menu.list(selectedCategoryId ?? undefined).then(setItems);
  }, [selectedCategoryId]);

  const displayItems = items.filter((i) => !selectedCategoryId || i.categoryId === selectedCategoryId);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f5]">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-kiosk-border">
        <Link to="/" className="text-lg font-semibold text-kiosk-text">
          FELN
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/cart"
            className="flex items-center gap-1.5 text-kiosk-text p-2 rounded-lg hover:bg-kiosk-surface transition-colors"
            aria-label="장바구니"
          >
            <ShoppingCart className="h-5 w-5" />
          </Link>
          {user ? (
            <Link
              to="/mypage"
              className="p-2 rounded-lg hover:bg-kiosk-surface transition-colors text-kiosk-text"
              aria-label="마이페이지"
            >
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-medium text-kiosk-primary">
              로그인
            </Link>
          )}
        </div>
      </header>

      <div className="flex gap-0 overflow-x-auto px-4 py-3 bg-white border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => setSelectedCategoryId(null)}
          className={`shrink-0 px-4 py-2.5 text-sm font-medium rounded-lg ${
            selectedCategoryId === null
              ? 'bg-kiosk-primary text-kiosk-text'
              : 'text-kiosk-textSecondary hover:bg-kiosk-surface'
          }`}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategoryId(c.id)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium rounded-lg ${
              selectedCategoryId === c.id
                ? 'bg-kiosk-primary text-kiosk-text'
                : 'text-kiosk-textSecondary hover:bg-kiosk-surface'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 gap-3">
          {displayItems.map((item) => (
            <Link
              key={item.id}
              to={`/menu/${item.id}`}
              className={`block ${item.isSoldOut ? 'opacity-75' : ''}`}
            >
              <div className="relative aspect-square bg-white rounded-md overflow-hidden">
                {item.images[0]?.url ? (
                  <img
                    src={item.images[0].url}
                    alt=""
                    className={`w-full h-full object-cover ${item.isSoldOut ? 'grayscale opacity-70' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span
                  className={`absolute inset-0 flex items-center justify-center text-kiosk-textSecondary text-sm bg-white ${item.images[0]?.url ? 'hidden' : ''}`}
                >
                  이미지 없음
                </span>
                {item.isSoldOut && (
                  <span className="absolute top-0 left-0 bg-kiosk-textSecondary text-white text-[10px] font-bold py-1 px-2 rounded-br">
                    품절
                  </span>
                )}
                {item.isBest && (
                  <span className="absolute top-0 right-0 bg-kiosk-primary text-kiosk-text text-[10px] font-bold py-1 px-2 rounded-bl">
                    Best
                  </span>
                )}
              </div>
              <p className={`font-medium text-sm truncate mt-1 ${item.isSoldOut ? 'text-kiosk-textSecondary' : 'text-kiosk-text'}`}>
                {item.name}
              </p>
              <p className="text-xs text-kiosk-textSecondary">{item.basePrice.toLocaleString()}원</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-kiosk-border p-4 safe-area-pb">
        <div className="flex items-center justify-between mb-2 text-sm text-kiosk-textSecondary">
          <span>
            장바구니 <span className="font-semibold text-kiosk-primary">{cartCount}</span>
          </span>
          <button
            type="button"
            onClick={clear}
            className="text-kiosk-textSecondary hover:text-kiosk-text flex items-center gap-1"
          >
            초기화
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-kiosk-text">총 {totalPrice.toLocaleString()}원</span>
          <Link
            to={lines.length > 0 ? '/cart' : '#'}
            className={`flex-1 max-w-[200px] ml-4 py-3 rounded-xl text-center font-semibold text-kiosk-text transition-opacity ${
              lines.length > 0 ? 'bg-kiosk-primary' : 'bg-kiosk-border cursor-not-allowed opacity-60'
            }`}
            onClick={(e) => lines.length === 0 && e.preventDefault()}
          >
            주문하기
          </Link>
        </div>
      </footer>
    </div>
  );
}
