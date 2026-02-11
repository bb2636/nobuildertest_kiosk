/**
 * 메뉴 API (Product 기준)
 * - GET: 공개 (키오스크·메뉴판)
 * - POST/PATCH/DELETE: 관리자 전용
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export const menuRouter = Router();

/** Product → 클라이언트 MenuItem 형태로 변환 */
function toMenuItemShape(p: {
  id: string;
  categoryId: string;
  name: string;
  englishName: string | null;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  ingredients: string | null;
  calories: string | null;
  isAvailable: boolean;
  isBest: boolean;
  defaultShotCount: number | null;
  sortOrder: number;
  category: { id: string; name: string };
  productOptions?: Array<{
    id: string;
    extraPrice: number | null;
    option: {
      id: string;
      name: string;
      defaultExtraPrice: number;
      optionGroup: { name: string };
    };
  }>;
}) {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    englishName: p.englishName ?? null,
    description: p.description,
    basePrice: p.basePrice,
    ingredients: p.ingredients ?? null,
    isSoldOut: !p.isAvailable,
    isBest: p.isBest,
    defaultShotCount: p.defaultShotCount ?? null,
    sortOrder: p.sortOrder,
    category: p.category,
    calories: p.calories ?? null,
    images: p.imageUrl ? [{ id: p.id, url: p.imageUrl, sortOrder: 0 }] : [],
    options: (p.productOptions ?? []).map((po) => ({
      id: po.option.id,
      name: po.option.name,
      type: po.option.optionGroup.name,
      choices: null,
      extraPrice: po.extraPrice ?? po.option.defaultExtraPrice,
    })),
  };
}

/** GET /api/menu - 카테고리별 메뉴 목록 (키오스크/백오피스) */
menuRouter.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const where = categoryId ? { categoryId } : {};
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        productOptions: {
          include: {
            option: { include: { optionGroup: { select: { name: true } } } },
          },
        },
      },
    });
    res.json(products.map(toMenuItemShape));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** GET /api/menu/:id - 단일 메뉴 상세 */
menuRouter.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        productOptions: {
          include: {
            option: { include: { optionGroup: true } },
          },
        },
      },
    });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(toMenuItemShape(product));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** POST /api/menu - 상품 등록 (관리자 전용) */
menuRouter.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, description, basePrice, isSoldOut, sortOrder } = req.body;
    if (!categoryId || !name || typeof basePrice !== 'number') {
      return res.status(400).json({ error: 'categoryId, name, basePrice required' });
    }
    const created = await prisma.product.create({
      data: {
        categoryId,
        name: String(name).trim(),
        description: description ? String(description) : null,
        basePrice: Number(basePrice),
        isAvailable: isSoldOut === true ? false : true,
        sortOrder: Number(sortOrder) ?? 0,
      },
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** PATCH /api/menu/:id - 수정 (관리자 전용) */
menuRouter.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, basePrice, isSoldOut, sortOrder } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description ? String(description) : null;
    if (typeof basePrice === 'number') data.basePrice = basePrice;
    if (typeof isSoldOut === 'boolean') data.isAvailable = !isSoldOut;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    const id = typeof req.params.id === 'string' ? req.params.id : (req.params.id as string[])?.[0] ?? '';
    const updated = await prisma.product.update({
      where: { id },
      data,
    });
    res.json(updated);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'product not found' });
    }
    res.status(500).json({ error: String(e) });
  }
});

/** DELETE /api/menu/:id (관리자 전용) */
menuRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : (req.params.id as string[])?.[0] ?? '';
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2025') {
      return res.status(404).json({ error: 'product not found' });
    }
    res.status(500).json({ error: String(e) });
  }
});
