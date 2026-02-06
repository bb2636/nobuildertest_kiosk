/**
 * [1계층 - API 라우트] 메뉴판
 * GET /api/menu-board → isActive 카테고리 + 상품 + 옵션(OptionGroup 포함)
 */

import { Router } from 'express';
import { menuBoardService } from '../services/menuBoardService.js';

export const menuBoardRouter = Router();

menuBoardRouter.get('/', async (_req, res) => {
  try {
    const data = await menuBoardService.getMenuBoard();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
