/**
 * [2계층 - 비즈니스 로직] 메뉴판 서비스
 * - API 호출 후 각 상품의 calories JSON을 파싱해 객체로 변환해 반환
 */

import { menuBoardApi } from '../api/menuBoard';
import { parseCalories } from '../utils/parseCalories';
import type {
  MenuBoardCategory,
  MenuBoardProductWithParsedCalories,
} from '../types/menuBoard';

export type MenuBoardCategoryWithParsedCalories = Omit<
  MenuBoardCategory,
  'products'
> & {
  products: MenuBoardProductWithParsedCalories[];
};

function mapProductWithParsedCalories(
  product: MenuBoardCategory['products'][number]
): MenuBoardProductWithParsedCalories {
  const { calories: rawCalories, ...rest } = product;
  return {
    ...rest,
    calories: parseCalories(rawCalories),
  };
}

export const menuBoardService = {
  /**
   * 메뉴판 조회 (isActive 카테고리/상품, sortOrder 정렬, 옵션·옵션그룹 포함).
   * 각 상품의 calories는 파싱된 객체로 반환.
   */
  async getMenuBoard(): Promise<MenuBoardCategoryWithParsedCalories[]> {
    const data = await menuBoardApi.get();
    return data.map((category) => ({
      ...category,
      products: category.products.map(mapProductWithParsedCalories),
    }));
  },
};
