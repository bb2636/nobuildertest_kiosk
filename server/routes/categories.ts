import { Router } from 'express';
import { prisma } from '../db.js';

export const categoriesRouter = Router();

/** GET /api/categories - 활성 카테고리 목록 (키오스크 메뉴용) */
categoriesRouter.get('/', async (_req, res) => {
  try {
    const list = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, sortOrder: true },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** POST /api/categories - 카테고리 등록 (백오피스) */
categoriesRouter.post('/', async (req, res) => {
  try {
    const { name, isActive = true, sortOrder = 0 } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name required' });
    }
    const created = await prisma.category.create({
      data: { name: name.trim(), isActive: !!isActive, sortOrder: Number(sortOrder) ?? 0 },
    });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** PATCH /api/categories/:id */
categoriesRouter.patch('/:id', async (req, res) => {
  try {
    const { name, isActive, sortOrder } = req.body;
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** DELETE /api/categories/:id */
categoriesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
