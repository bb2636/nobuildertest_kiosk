/**
 * [3계층 - 뷰에서 사용] 메뉴판 데이터 훅
 * - menuBoardService.getMenuBoard() 호출, calories 파싱된 결과 제공
 */

import { useEffect, useState } from 'react';
import { menuBoardService } from '../services/menuBoardService';
import type { MenuBoardCategoryWithParsedCalories } from '../services/menuBoardService';

export function useMenuBoard() {
  const [data, setData] = useState<MenuBoardCategoryWithParsedCalories[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    menuBoardService
      .getMenuBoard()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
