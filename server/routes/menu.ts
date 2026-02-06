/**
 * 메뉴 API (Product 기준)
 * - 키오스크/백오피스: 목록·상세·등록·수정·삭제
 * - 스키마: Product (imageUrl, isAvailable), category, productOptions → option → optionGroup
 */

import { Router } from 'express';
import { prisma } from '../db.js';

export const menuRouter = Router();

/** Product → 클라이언트 MenuItem 형태로 변환 */
function toMenuItemShape(p: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
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
    description: p.description,
    basePrice: p.basePrice,
    isSoldOut: !p.isAvailable,
    sortOrder: p.sortOrder,
    category: p.category,
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

/** POST /api/menu - 상품 등록 (백오피스) */
menuRouter.post('/', async (req, res) => {
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

/** PATCH /api/menu/:id - 수정 (품절 토글 등) */
menuRouter.patch('/:id', async (req, res) => {
  try {
    const { name, description, basePrice, isSoldOut, sortOrder } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (description !== undefined) data.description = description ? String(description) : null;
    if (typeof basePrice === 'number') data.basePrice = basePrice;
    if (typeof isSoldOut === 'boolean') data.isAvailable = !isSoldOut;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** DELETE /api/menu/:id */
menuRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
