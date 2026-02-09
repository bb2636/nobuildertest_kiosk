import { Router } from 'express';
import { createOrder } from '../services/orderService.js';
import { optionalAuth, type RequestWithAuth } from '../middleware/auth.js';

export const ordersRouter = Router();

/** POST /api/orders - 주문 생성 (키오스크)
 * Body: { totalPrice, items, orderType?: DINE_IN|TAKE_OUT, paymentMethod?, usePoint? }
 * orderType: 매장(DINE_IN) / 포장(TAKE_OUT). 없으면 매장.
 * Authorization 있으면 로그인 사용자로 주문·포인트 10% 적립.
 * 성공 시 201 + { orderNumber, orderNo, orderId, pointsEarned? }
 */
ordersRouter.post('/', optionalAuth, async (req: RequestWithAuth, res) => {
  try {
    const body = req.body as {
      totalPrice?: number;
      items?: { productId: string; quantity: number; optionIds?: string[] }[];
      orderType?: 'DINE_IN' | 'TAKE_OUT';
      paymentMethod?: 'CARD' | 'CASH' | 'MOBILE' | 'ETC' | 'TOSS';
      usePoint?: number;
    };

    if (body == null || typeof body !== 'object') {
      return res.status(400).json({ error: 'body required' });
    }

    const result = await createOrder({
      totalPrice: Number(body.totalPrice),
      items: Array.isArray(body.items) ? body.items : [],
      userId: req.userId,
      orderType: body.orderType,
      paymentMethod: body.paymentMethod,
      usePoint: body.usePoint,
    });

    res.status(201).json({
      orderNumber: result.orderNumber,
      orderNo: result.orderNo,
      orderId: result.orderId,
      pointsEarned: result.pointsEarned,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = err.message;

    if (
      msg === 'INVALID_TOTAL_PRICE' ||
      msg === 'ITEMS_REQUIRED' ||
      msg === 'ITEMS_TOO_MANY' ||
      msg === 'INVALID_USE_POINT' ||
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
      msg === 'ORDER_TOTAL_MISMATCH' ||
      msg === 'ORDER_USE_POINT_REQUIRES_LOGIN' ||
      msg === 'ORDER_USE_POINT_EXCEEDS_TOTAL' ||
      msg === 'ORDER_INSUFFICIENT_POINT'
    ) {
      return res.status(400).json({ error: msg });
    }

    res.status(500).json({ error: 'order_create_failed' });
  }
});

// 주문 목록·상태 변경은 관리자 전용: GET/PATCH /api/admin/orders
