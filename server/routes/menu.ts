import { Router } from 'express';
import { prisma } from '../db.js';

export const menuRouter = Router();

/** GET /api/menu - 카테고리별 메뉴 목록 (키오스크용, 품절 포함) */
menuRouter.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const where = categoryId ? { categoryId } : {};
    const items = await prisma.item.findMany({
      where,
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** GET /api/menu/:id - 단일 메뉴 상세 */
menuRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
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
    const created = await prisma.item.create({
      data: {
        categoryId,
        name: String(name).trim(),
        description: description ? String(description) : null,
        basePrice: Number(basePrice),
        isSoldOut: !!isSoldOut,
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
    const updated = await prisma.item.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(description !== undefined && { description: description ? String(description) : null }),
        ...(typeof basePrice === 'number' && { basePrice }),
        ...(typeof isSoldOut === 'boolean' && { isSoldOut }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** DELETE /api/menu/:id */
menuRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.item.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
