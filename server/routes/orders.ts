import { Router } from 'express';
import { prisma } from '../db.js';
import { OrderStatus } from '@prisma/client';
import { createOrder } from '../services/orderService.js';

export const ordersRouter = Router();

/** POST /api/orders - 주문 생성 (키오스크)
 * Body: { totalPrice: number, items: [{ productId, quantity, optionIds }] }
 * 트랜잭션으로 Order + OrderItem + OrderItemOption 생성, 실패 시 롤백.
 * 성공 시 201 + { orderNumber, orderNo, orderId }
 */
ordersRouter.post('/', async (req, res) => {
  try {
    const body = req.body as {
      totalPrice?: number;
      items?: { productId: string; quantity: number; optionIds?: string[] }[];
    };

    if (body == null || typeof body !== 'object') {
      return res.status(400).json({ error: 'body required' });
    }

    const result = await createOrder({
      totalPrice: Number(body.totalPrice),
      items: Array.isArray(body.items) ? body.items : [],
    });

    res.status(201).json({
      orderNumber: result.orderNumber,
      orderNo: result.orderNo,
      orderId: result.orderId,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = err.message;

    if (
      msg === 'INVALID_TOTAL_PRICE' ||
      msg === 'ITEMS_REQUIRED' ||
      msg === 'ITEMS_TOO_MANY' ||
      msg.startsWith('INVALID_ITEM_AT_INDEX') ||
      msg.startsWith('INVALID_PRODUCT_ID_AT_INDEX') ||
      msg.startsWith('INVALID_QUANTITY_AT_INDEX') ||
      msg.startsWith('INVALID_OPTION_IDS_AT_INDEX') ||
      msg.startsWith('OPTION_IDS_TOO_MANY_AT_INDEX') ||
      msg.startsWith('INVALID_OPTION_ID_AT_INDEX')
    ) {
      return res.status(400).json({ error: msg });
    }

    if (
      msg === 'ORDER_ITEMS_EMPTY' ||
      msg.startsWith('ORDER_PRODUCT_NOT_FOUND') ||
      msg === 'ORDER_INVALID_QUANTITY' ||
      msg === 'ORDER_TOTAL_MISMATCH'
    ) {
      return res.status(400).json({ error: msg });
    }

    res.status(500).json({ error: 'order_create_failed' });
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
        items: { include: { product: { select: { name: true } } } },
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
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
