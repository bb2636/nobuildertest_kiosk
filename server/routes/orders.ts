import { Router } from 'express';
import { prisma } from '../db.js';
import { OrderStatus } from '@prisma/client';

export const ordersRouter = Router();

/** 주문번호 생성 (간단 예: 날짜기반 + 시퀀스) */
async function nextOrderNo(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
  });
  return `${today}-${String(count + 1).padStart(3, '0')}`;
}

/** POST /api/orders - 주문 생성 (키오스크) */
ordersRouter.post('/', async (req, res) => {
  try {
    const { items } = req.body as { items: { itemId: string; quantity: number; unitPrice: number; optionsJson?: string }[] };
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    const totalPrice = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0);
    const orderNo = await nextOrderNo();

    const order = await prisma.order.create({
      data: {
        orderNo,
        status: OrderStatus.PENDING,
        totalPrice,
        items: {
          create: items.map((i) => ({
            itemId: i.itemId,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice),
            optionsJson: i.optionsJson ?? null,
          })),
        },
      },
      include: { items: true },
    });
    res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** GET /api/orders - 주문 목록 (백오피스: 실시간 현황) */
ordersRouter.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status: status as OrderStatus } : {};
    const list = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { item: { select: { name: true } } } },
      },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

/** PATCH /api/orders/:id/status - 주문 상태 변경 (접수/제조중/준비완료 등) */
ordersRouter.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body as { status: OrderStatus };
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: { include: { item: { select: { name: true } } } } },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
