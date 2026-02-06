import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { api, type MenuItem } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function KioskHome() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    api.menu.list(selectedCategoryId ?? undefined).then(setItems);
  }, [selectedCategoryId]);

  const displayItems = items.filter((i) => !selectedCategoryId || i.categoryId === selectedCategoryId);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-kiosk-border">
        <h1 className="text-lg font-semibold">메뉴</h1>
        <Link
          to="/cart"
          className="flex items-center gap-2 rounded-lg bg-kiosk-primary px-4 py-2 text-sm font-medium text-kiosk-text"
        >
          <ShoppingCart className="h-5 w-5" />
          장바구니 {cartCount > 0 && `(${cartCount})`}
        </Link>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-kiosk-border">
        <button
          type="button"
          onClick={() => setSelectedCategoryId(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
            selectedCategoryId === null
              ? 'bg-kiosk-primary text-kiosk-text'
              : 'bg-kiosk-surface text-kiosk-textSecondary'
          }`}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategoryId(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
              selectedCategoryId === c.id
                ? 'bg-kiosk-primary text-kiosk-text'
                : 'bg-kiosk-surface text-kiosk-textSecondary'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {displayItems.map((item) => (
            <Link key={item.id} to={`/menu/${item.id}`}>
              <Card theme="kiosk" className="p-3 overflow-hidden">
                <div className="aspect-square bg-cool-gray-3 rounded-lg mb-2 flex items-center justify-center text-kiosk-textSecondary text-sm">
                  {item.images[0] ? (
                    <img
                      src={item.images[0].url}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    '이미지 없음'
                  )}
                </div>
                <p className="font-medium text-kiosk-text truncate">{item.name}</p>
                <p className="text-sm text-kiosk-textSecondary">
                  {item.basePrice.toLocaleString()}원
                </p>
                {item.isSoldOut && (
                  <span className="inline-block mt-1 text-xs bg-kiosk-error text-white px-2 py-0.5 rounded">
                    품절
                  </span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
