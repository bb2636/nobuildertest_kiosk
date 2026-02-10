import { Router } from 'express';
import { createOrder } from '../services/orderService.js';
import { optionalAuth, type RequestWithAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';
import {
  saveSubscriptionForOrder,
  notifyOrderReceived,
  type PushSubscriptionInput,
} from '../services/pushService.js';

export const ordersRouter = Router();

/** POST /api/orders - 주문 생성 (키오스크)
 * Body: { totalPrice, items, orderType?, paymentMethod?, usePoint?, pushSubscription? }
 * pushSubscription: 웹 푸시 알림용 { endpoint, keys: { p256dh, auth } }. 있으면 저장 후 접수 알림 발송.
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
      pushSubscription?: PushSubscriptionInput;
    };

    if (body == null || typeof body !== 'object') {
      return res.status(400).json({ error: 'body required' });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const result = await createOrder({
      totalPrice: Number(body.totalPrice),
      items: rawItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        optionIds: Array.isArray(item.optionIds) ? item.optionIds : [],
      })),
      userId: req.userId,
      orderType: body.orderType,
      paymentMethod: body.paymentMethod,
      usePoint: body.usePoint,
    });

    const pushSub = body.pushSubscription;
    if (
      pushSub &&
      typeof pushSub === 'object' &&
      typeof pushSub.endpoint === 'string' &&
      pushSub.keys &&
      typeof pushSub.keys.p256dh === 'string' &&
      typeof pushSub.keys.auth === 'string'
    ) {
      try {
        await saveSubscriptionForOrder(result.orderId, {
          endpoint: pushSub.endpoint,
          keys: { p256dh: pushSub.keys.p256dh, auth: pushSub.keys.auth },
        });
        await notifyOrderReceived(result.orderId, result.orderNo);
      } catch {
        // 푸시 실패해도 주문 성공 응답은 그대로 반환
      }
    }

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

/** POST /api/orders/:orderId/push-subscription - 주문 알림 구독 등록 (주문 완료 페이지에서 호출)
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 * 등록 후 "주문 접수" 푸시 1회 발송
 */
ordersRouter.post('/:orderId/push-subscription', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const body = req.body as { subscription?: PushSubscriptionInput };
    const sub = body?.subscription;
    if (
      !sub ||
      typeof sub !== 'object' ||
      typeof sub.endpoint !== 'string' ||
      !sub.keys ||
      typeof sub.keys.p256dh !== 'string' ||
      typeof sub.keys.auth !== 'string'
    ) {
      return res.status(400).json({ error: 'subscription required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true },
    });
    if (!order) {
      return res.status(404).json({ error: 'order not found' });
    }

    await saveSubscriptionForOrder(orderId, {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    await notifyOrderReceived(orderId, order.orderNo);

    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'failed' });
  }
});

// 주문 목록·상태 변경은 관리자 전용: GET/PATCH /api/admin/orders
