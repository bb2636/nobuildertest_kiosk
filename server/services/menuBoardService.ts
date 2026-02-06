/**
 * [2계층 - 비즈니스 로직] 메뉴판
 * - Repository 결과를 그대로 반환 (필요 시 필터/가공 확장)
 */

import { menuBoardRepository } from '../repositories/menuBoardRepository.js';

export const menuBoardService = {
  async getMenuBoard() {
    return menuBoardRepository.findActiveCategoriesWithProducts();
  },
};
