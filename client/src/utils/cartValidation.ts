/**
 * 장바구니 유효성 검사: 현재 메뉴 기준으로 삭제·품절된 상품 제거
 */

import type { KioskCartLine } from '../contexts/KioskCartContext';

type MenuItemForValidation = { id: string; isSoldOut: boolean };

export function filterValidCartLines(
  lines: KioskCartLine[],
  menuItems: MenuItemForValidation[]
): KioskCartLine[] {
  const idSet = new Set(menuItems.filter((m) => !m.isSoldOut).map((m) => m.id));
  return lines.filter((line) => idSet.has(line.productId));
}
