/**
 * 키오스크 메뉴/카테고리 캐시
 * - 최초 1회만 API 호출 후 메모리 캐시에 저장
 * - 화면 이동 시 캐시에서 즉시 표시 (깜빡임 없음)
 * - 홈 진입 시 배경에서만 재검증, 변경된 경우에만 캐시 갱신
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, type MenuItem } from '../api/client';

type CategoryItem = { id: string; name: string; sortOrder?: number };

type MenuCacheState = {
  categories: CategoryItem[];
  items: MenuItem[];
  isInitialized: boolean;
};

type MenuCacheValue = MenuCacheState & {
  /** 배경 재검증 (변경된 경우에만 캐시 갱신) */
  revalidate: () => void;
  /** 캐시 무효화 후 재요청 */
  invalidate: () => void;
};

const initialState: MenuCacheState = {
  categories: [],
  items: [],
  isInitialized: false,
};

const MenuCacheContext = createContext<MenuCacheValue | null>(null);

function cacheKey(categories: CategoryItem[], items: MenuItem[]): string {
  const catKey = categories.map((c) => c.id).join(',');
  const itemKey = items.map((i) => `${i.id}:${i.isSoldOut}`).join(',');
  return `${catKey}|${itemKey}`;
}

export function MenuCacheProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MenuCacheState>(initialState);

  const load = useCallback(async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        api.categories.list(),
        api.menu.list(),
      ]);
      const categories = categoriesRes.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
      }));
      setState({
        categories,
        items: itemsRes,
        isInitialized: true,
      });
    } catch {
      setState((prev) => ({ ...prev, isInitialized: true }));
    }
  }, []);

  /** 최초 1회 로드 */
  useEffect(() => {
    if (state.isInitialized) return;
    load();
  }, [state.isInitialized, load]);

  /** 배경 재검증: 데이터가 바뀐 경우에만 캐시 갱신 (UI 깜빡임 없음) */
  const revalidate = useCallback(async () => {
    if (!state.isInitialized) return;
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        api.categories.list(),
        api.menu.list(),
      ]);
      const categories = categoriesRes.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
      }));
      const newKey = cacheKey(categories, itemsRes);
      const prevKey = cacheKey(state.categories, state.items);
      if (newKey !== prevKey) {
        setState({
          categories,
          items: itemsRes,
          isInitialized: true,
        });
      }
    } catch {
      // 재검증 실패 시 기존 캐시 유지
    }
  }, [state.isInitialized, state.categories, state.items]);

  const invalidate = useCallback(() => {
    setState(initialState);
  }, []);

  const value: MenuCacheValue = {
    ...state,
    revalidate,
    invalidate,
  };

  return (
    <MenuCacheContext.Provider value={value}>
      {children}
    </MenuCacheContext.Provider>
  );
}

export function useMenuCache(): MenuCacheValue {
  const ctx = useContext(MenuCacheContext);
  if (!ctx) throw new Error('useMenuCache must be used within MenuCacheProvider');
  return ctx;
}
