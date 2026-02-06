/**
 * [3계층 - 데이터 접근] 메뉴판 조회
 * - isActive: true인 Category / Product만
 * - sortOrder 순 정렬
 * - Product → ProductOption → Option → OptionGroup 중첩 include
 */

import { prisma } from '../db.js';

const categoryWithProductsInclude = {
  products: {
    where: { isAvailable: true },
    orderBy: { sortOrder: 'asc' as const },
    include: {
      productOptions: {
        include: {
          option: {
            include: {
              optionGroup: true,
            },
          },
        },
      },
    },
  },
} as const;

export type CategoryWithProductsResult = Awaited<
  ReturnType<typeof menuBoardRepository.findActiveCategoriesWithProducts>
>;

export const menuBoardRepository = {
  async findActiveCategoriesWithProducts() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: categoryWithProductsInclude,
    });
  },
};
