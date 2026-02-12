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
  imageUrl?: string;
  /** 커피 등: 표시용 (장바구니 옵션 요약·옵션 변경 시 초기값) */
  temperature?: 'HOT' | 'ICED';
  shotCount?: number;
};

type CartContextValue = {
  lines: KioskCartLine[];
  add: (line: Omit<KioskCartLine, 'quantity'> & { quantity?: number }) => void;
  replaceLine: (index: number, line: Omit<KioskCartLine, 'quantity'> & { quantity?: number }) => void;
  remove: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  /** 검증 후 유효한 라인만 남기고 저장 (품절·삭제된 상품 제거용) */
  setLinesFromValidation: (lines: KioskCartLine[]) => void;
  totalPrice: number;
  clear: () => void;
};

/** 직렬화 가능한 필드만 추출 (DOM/React ref 등 circular reference 방지) */
function sanitizeLine(line: KioskCartLine): KioskCartLine {
  return {
    productId: String(line.productId ?? ''),
    name: String(line.name ?? ''),
    quantity: Math.max(1, Number(line.quantity) || 1),
    optionIds: Array.isArray(line.optionIds) ? line.optionIds.filter((id): id is string => typeof id === 'string') : [],
    unitPrice: Number(line.unitPrice) || 0,
    imageUrl: typeof line.imageUrl === 'string' ? line.imageUrl : undefined,
    temperature: line.temperature === 'HOT' || line.temperature === 'ICED' ? line.temperature : undefined,
    shotCount: typeof line.shotCount === 'number' && Number.isInteger(line.shotCount) ? line.shotCount : undefined,
  };
}

function loadCart(): KioskCartLine[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((item: unknown) => sanitizeLine(item as KioskCartLine));
  } catch {
    return [];
  }
}

function saveCart(lines: KioskCartLine[]) {
  try {
    const sanitized = lines.map(sanitizeLine);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent(CART_UPDATED));
  } catch {
    // circular reference 등 직렬화 실패 시 저장 스킵 (앱은 계속 동작)
  }
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
        imageUrl: line.imageUrl,
        temperature: line.temperature,
        shotCount: line.shotCount,
      };
      setLines((prev) => {
        const next = [...prev, newLine];
        saveCart(next);
        return next;
      });
    },
    []
  );

  const replaceLine = useCallback(
    (index: number, line: Omit<KioskCartLine, 'quantity'> & { quantity?: number }) => {
      const qty = Math.max(1, line.quantity ?? 1);
      const newLine: KioskCartLine = {
        productId: line.productId,
        name: line.name,
        quantity: qty,
        optionIds: line.optionIds ?? [],
        unitPrice: line.unitPrice,
        imageUrl: line.imageUrl,
        temperature: line.temperature,
        shotCount: line.shotCount,
      };
      setLines((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const next = [...prev];
        next[index] = newLine;
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

  const setLinesFromValidation = useCallback((newLines: KioskCartLine[]) => {
    setLines(newLines);
    saveCart(newLines);
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    saveCart([]);
  }, []);

  const totalPrice = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const value: CartContextValue = {
    lines,
    add,
    replaceLine,
    remove,
    updateQuantity,
    setLinesFromValidation,
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
