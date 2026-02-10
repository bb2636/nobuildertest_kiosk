/**
 * 로그인 사용자 마이페이지 API
 * GET /api/user/me, /api/user/orders, /api/user/cart
 * PATCH /api/user/update, /api/user/settings
 * Authorization: Bearer <token> 필요
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { requireAuth, optionalAuth, type RequestWithAuth } from '../middleware/auth.js';
import { OrderStatus } from '@prisma/client';

const SALT_ROUNDS = 10;

function trim(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

export const userRouter = Router();

/** GET /api/user/orders/:id - 단일 주문 조회 (비로그인 가능: 비회원 주문은 orderId만 알면 조회) */
userRouter.get('/orders/:id', optionalAuth, async (req: RequestWithAuth, res) => {
  try {
    const userId = req.userId ?? null;
    const orderId = (req.params.id as string)?.trim();
    if (!orderId) {
      return res.status(400).json({ error: 'order id required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            selectedOptions: { include: { option: { select: { name: true } } } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'order not found' });
    }
    if (order.userId != null && order.userId !== userId) {
      return res.status(404).json({ error: 'order not found' });
    }

    res.json({
      id: order.id,
      orderNo: order.orderNo,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.product.name,
        quantity: i.quantity,
        lineTotalAmount: i.lineTotalAmount,
        optionNames: i.selectedOptions.map((so) => so.option.name),
      })),
    });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

userRouter.use(requireAuth);

/** GET /api/user/me - 현재 로그인 유저 계정 정보, 포인트, 마일리지 */
userRouter.get('/me', async (req: RequestWithAuth, res) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        email: true,
        point: true,
        mileage: true,
        notificationEnabled: true,
        marketingConsent: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** 주문 상태 쿼리 → Prisma status 필터 */
const statusMap: Record<string, OrderStatus | undefined> = {
  ALL: undefined,
  CANCELED: OrderStatus.CANCELED,
  WAITING: OrderStatus.WAITING,
  PREPARING: OrderStatus.PREPARING,
  PICKUP_READY: OrderStatus.PICKUP_READY,
  COMPLETED: OrderStatus.COMPLETED,
  PENDING: OrderStatus.WAITING,
};

/** GET /api/user/orders?status=...&from=YYYY-MM-DD&to=YYYY-MM-DD - 주문 내역 (상품명, 총 결제 금액, 상태·기간 필터) */
userRouter.get('/orders', async (req: RequestWithAuth, res) => {
  try {
    const userId = req.userId!;
    const statusParam = (req.query.status as string)?.toUpperCase() ?? 'ALL';
    const status = statusMap[statusParam] ?? undefined;
    const fromParam = (req.query.from as string)?.trim();
    const toParam = (req.query.to as string)?.trim();

    const where: { userId: string; status?: OrderStatus; createdAt?: { gte?: Date; lte?: Date } } = { userId };
    if (status) where.status = status;
    if (fromParam || toParam) {
      where.createdAt = {};
      if (fromParam) {
        const from = new Date(fromParam);
        if (!Number.isNaN(from.getTime())) where.createdAt.gte = new Date(from.setHours(0, 0, 0, 0));
      }
      if (toParam) {
        const to = new Date(toParam);
        if (!Number.isNaN(to.getTime())) where.createdAt.lte = new Date(to.setHours(23, 59, 59, 999));
      }
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { name: true, imageUrl: true } },
            selectedOptions: { include: { option: { select: { name: true } } } },
          },
        },
      },
    });

    const list = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      orderNumber: o.orderNumber,
      orderType: o.orderType,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      items: o.items.map((i) => ({
        id: i.id,
        productName: i.product.name,
        imageUrl: i.product.imageUrl ?? undefined,
        quantity: i.quantity,
        lineTotalAmount: i.lineTotalAmount,
        optionNames: i.selectedOptions.map((so) => so.option.name),
      })),
    }));

    res.json(list);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** GET /api/user/cart - 장바구니 상품 리스트 */
userRouter.get('/cart', async (req: RequestWithAuth, res) => {
  try {
    const userId = req.userId!;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return res.json({ items: [] });
    }

    const items = cart.items.map((i) => {
      let optionIds: string[] = [];
      if (i.optionIds) {
        try {
          const parsed = JSON.parse(i.optionIds);
          optionIds = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
        } catch {
          optionIds = [];
        }
      }
      return {
        id: i.id,
        productId: i.productId,
        productName: i.product.name,
        basePrice: i.product.basePrice,
        imageUrl: i.product.imageUrl,
        quantity: i.quantity,
        optionIds,
      };
    });

    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** PATCH /api/user/update - 메일 주소 또는 비밀번호 변경 (비밀번호 변경 시 기존 비밀번호 확인 필수) */
userRouter.patch('/update', async (req: RequestWithAuth, res) => {
  try {
    const userId = req.userId!;
    const body = req.body as {
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    const updates: { email?: string; password?: string } = {};

    if (body.email !== undefined) {
      const email = trim(body.email);
      if (!email) {
        return res.status(400).json({ error: 'email required when updating email' });
      }
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existing) {
        return res.status(409).json({ error: 'email already in use' });
      }
      updates.email = email;
    }

    if (body.newPassword !== undefined) {
      const newPassword = body.newPassword;
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
      }
      const currentPassword = body.currentPassword;
      if (typeof currentPassword !== 'string' || currentPassword === '') {
        return res.status(400).json({ error: 'currentPassword required to change password' });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(401).json({ error: 'current password is incorrect' });
      }
      updates.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'provide email and/or newPassword with currentPassword' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** PATCH /api/user/settings - 앱 내 설정 (알림, 마케팅 수신 동의) */
userRouter.patch('/settings', async (req: RequestWithAuth, res) => {
  try {
    const userId = req.userId!;
    const body = req.body as {
      notificationEnabled?: boolean;
      marketingConsent?: boolean;
    };

    const data: { notificationEnabled?: boolean; marketingConsent?: boolean } = {};
    if (typeof body.notificationEnabled === 'boolean') {
      data.notificationEnabled = body.notificationEnabled;
    }
    if (typeof body.marketingConsent === 'boolean') {
      data.marketingConsent = body.marketingConsent;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'provide notificationEnabled and/or marketingConsent' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        notificationEnabled: true,
        marketingConsent: true,
      },
    });

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});
