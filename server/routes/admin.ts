/**
 * 관리자 전용 백오피스 API
 * 로그인: 기존 POST /api/auth/login (admin 계정으로 로그인 후 JWT 사용)
 * Authorization: Bearer <token> + role ADMIN 필요
 */

import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth, type RequestWithAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { OrderStatus } from '@prisma/client';

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// ========== 유저 관리 ==========

/** GET /api/admin/users - 회원 목록 (회원번호=id, 회원명, 이메일, 주문 수) */
adminRouter.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });
    const list = users.map((u) => ({
      id: u.id,
      memberNo: u.id,
      name: u.name,
      username: u.username,
      email: u.email,
      orderCount: u._count.orders,
      createdAt: u.createdAt,
    }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** DELETE /api/admin/users/:id - 유저 삭제 */
adminRouter.delete('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: 'cannot delete admin' });
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// ========== 주문 내역 ==========

/** GET /api/admin/orders - 주문 목록 (번호, 상품정보, 주문시간, 금액, 성함, 상태) */
adminRouter.get('/orders', async (req, res) => {
  try {
    const statusParam = (req.query.status as string)?.toUpperCase();
    const status = statusParam && statusParam !== 'ALL' ? (statusParam as OrderStatus) : undefined;

    const orders = await prisma.order.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    const list = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      customerName: o.user?.name ?? '(비회원)',
      items: o.items.map((i) => ({
        productName: i.product.name,
        quantity: i.quantity,
        lineTotalAmount: i.lineTotalAmount,
      })),
    }));
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** PATCH /api/admin/orders/:id - 주문 상태 변경 (주문 확인 등) */
adminRouter.patch('/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body as { status?: OrderStatus };
    const valid = Object.values(OrderStatus).includes(status);
    if (!valid) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
    res.json({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.totalAmount,
      customerName: order.user?.name ?? null,
      items: order.items.map((i) => ({ productName: i.product.name, quantity: i.quantity, lineTotalAmount: i.lineTotalAmount })),
    });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// ========== 메뉴 관리 ==========

/** GET /api/admin/products - 메뉴(상품) 리스트 (카테고리 포함) */
adminRouter.get('/products', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** POST /api/admin/products - 메뉴 등록 */
adminRouter.post('/products', async (req, res) => {
  try {
    const body = req.body as {
      categoryId: string;
      name: string;
      englishName?: string;
      description?: string;
      basePrice: number;
      imageUrl?: string;
      ingredients?: string;
      calories?: string;
      isAvailable?: boolean;
      sortOrder?: number;
      isBest?: boolean;
      defaultShotCount?: number;
    };
    if (!body.categoryId || !body.name || typeof body.basePrice !== 'number') {
      return res.status(400).json({ error: 'categoryId, name, basePrice required' });
    }
    const product = await prisma.product.create({
      data: {
        categoryId: body.categoryId,
        name: body.name.trim(),
        englishName: body.englishName?.trim() ?? null,
        description: body.description?.trim() ?? null,
        basePrice: body.basePrice,
        imageUrl: body.imageUrl?.trim() ?? null,
        ingredients: body.ingredients?.trim() ?? null,
        calories: body.calories ?? null,
        isAvailable: body.isAvailable ?? true,
        sortOrder: body.sortOrder ?? 0,
        isBest: body.isBest ?? false,
        defaultShotCount: body.defaultShotCount ?? null,
      },
    });
    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** PATCH /api/admin/products/:id - 메뉴 수정 */
adminRouter.patch('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body as {
      categoryId?: string;
      name?: string;
      englishName?: string;
      description?: string;
      basePrice?: number;
      imageUrl?: string;
      ingredients?: string;
      calories?: string;
      isAvailable?: boolean;
      sortOrder?: number;
      isBest?: boolean;
      defaultShotCount?: number;
    };
    const data: Record<string, unknown> = {};
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.englishName !== undefined) data.englishName = body.englishName?.trim() ?? null;
    if (body.description !== undefined) data.description = body.description?.trim() ?? null;
    if (typeof body.basePrice === 'number') data.basePrice = body.basePrice;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl?.trim() ?? null;
    if (body.ingredients !== undefined) data.ingredients = body.ingredients?.trim() ?? null;
    if (body.calories !== undefined) data.calories = body.calories;
    if (typeof body.isAvailable === 'boolean') data.isAvailable = body.isAvailable;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (typeof body.isBest === 'boolean') data.isBest = body.isBest;
    if (body.defaultShotCount !== undefined) data.defaultShotCount = body.defaultShotCount;
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// ========== 약관 / 개인정보처리방침 ==========

/** GET /api/admin/terms - 약관 텍스트 */
adminRouter.get('/terms', async (_req, res) => {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { key: 'terms' },
    });
    res.json({ content: row?.content ?? '' });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** PUT /api/admin/terms - 약관 수정 */
adminRouter.put('/terms', async (req, res) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    const row = await prisma.siteContent.upsert({
      where: { key: 'terms' },
      create: { key: 'terms', content },
      update: { content },
    });
    res.json({ content: row.content });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** GET /api/admin/privacy - 개인정보 처리 방침 텍스트 */
adminRouter.get('/privacy', async (_req, res) => {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { key: 'privacy' },
    });
    res.json({ content: row?.content ?? '' });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** PUT /api/admin/privacy - 개인정보 처리 방침 수정 */
adminRouter.put('/privacy', async (req, res) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    const row = await prisma.siteContent.upsert({
      where: { key: 'privacy' },
      create: { key: 'privacy', content },
      update: { content },
    });
    res.json({ content: row.content });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});
