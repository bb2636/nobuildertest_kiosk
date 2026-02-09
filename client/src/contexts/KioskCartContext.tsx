/**
 * 키오스크 장바구니 (sessionStorage + 메모리)
 * 한 줄: productId, name, quantity, optionIds, unitPrice(1개당 = basePrice + 옵션 추가금)
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'kiosk_cart';
const CART_UPDATED = 'kiosk:cartUpdated';

export type KioskCartLine = {
  productId: string;
  name: string;
  quantity: number;
  optionIds: string[];
  unitPrice: number;
};

type CartContextValue = {
  lines: KioskCartLine[];
  add: (line: Omit<KioskCartLine, 'quantity'> & { quantity?: number }) => void;
  remove: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  totalPrice: number;
  clear: () => void;
};

function loadCart(): KioskCartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveCart(lines: KioskCartLine[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(CART_UPDATED));
}

const CartContext = createContext<CartContextValue | null>(null);

export function KioskCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<KioskCartLine[]>(loadCart);

  useEffect(() => {
    const handler = () => setLines(loadCart());
    window.addEventListener(CART_UPDATED, handler);
    return () => window.removeEventListener(CART_UPDATED, handler);
  }, []);

  const add = useCallback(
    (line: Omit<KioskCartLine, 'quantity'> & { quantity?: number }) => {
      const qty = Math.max(1, line.quantity ?? 1);
      const newLine: KioskCartLine = {
        productId: line.productId,
        name: line.name,
        quantity: qty,
        optionIds: line.optionIds ?? [],
        unitPrice: line.unitPrice,
      };
      setLines((prev) => {
        const next = [...prev, newLine];
        saveCart(next);
        return next;
      });
    },
    []
  );

  const remove = useCallback((index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    const qty = Math.max(1, quantity);
    setLines((prev) => {
      const next = prev.map((l, i) => (i === index ? { ...l, quantity: qty } : l));
      saveCart(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    saveCart([]);
  }, []);

  const totalPrice = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const value: CartContextValue = {
    lines,
    add,
    remove,
    updateQuantity,
    totalPrice,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useKioskCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useKioskCart must be used within KioskCartProvider');
  return ctx;
}
