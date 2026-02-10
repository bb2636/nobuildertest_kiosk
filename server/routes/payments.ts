/**
 * 토스페이먼츠 결제 승인
 * - 성공 URL에서 paymentKey, orderId, amount 로 호출 후 주문 PAID 처리 및 포인트 적립
 */

import { Router } from 'express';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../db.js';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const POINT_RATE = 0.1;

export const paymentsRouter = Router();

/** POST /api/payments/confirm - 토스 결제 승인 후 주문 PAID + 포인트 적립 */
paymentsRouter.post('/confirm', async (req, res) => {
  try {
    const secretKey = process.env.TOSSPAYMENTS_SECRET_KEY;
    if (!secretKey || secretKey.trim() === '') {
      return res.status(503).json({ error: 'TOSSPAYMENTS_SECRET_KEY not configured' });
    }

    const body = req.body as { paymentKey?: string; orderId?: string; amount?: number };
    const paymentKey = typeof body.paymentKey === 'string' ? body.paymentKey.trim() : '';
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);

    if (!paymentKey || !orderId || !Number.isInteger(amount) || amount < 1) {
      return res.status(400).json({ error: 'paymentKey, orderId, amount required' });
    }

    const auth = Buffer.from(secretKey + ':', 'utf8').toString('base64');
    const tossRes = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!tossRes.ok) {
      const errBody = await tossRes.json().catch(() => ({}));
      return res.status(400).json({
        error: 'toss_confirm_failed',
        message: (errBody as { message?: string }).message ?? tossRes.statusText,
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNo: true, paymentStatus: true, totalAmount: true, userId: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'order_not_found' });
    }
    if (order.paymentStatus !== PaymentStatus.PENDING) {
      return res.status(409).json({ error: 'order_already_paid_or_invalid' });
    }
    if (order.totalAmount !== amount) {
      return res.status(400).json({ error: 'amount_mismatch' });
    }

    let pointsEarned = 0;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      if (order.userId && amount > 0) {
        pointsEarned = Math.floor(amount * POINT_RATE);
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: order.userId },
            data: { point: { increment: pointsEarned } },
          });
        }
      }
    });

    res.status(200).json({
      orderNo: order.orderNo,
      orderId: order.id,
      pointsEarned: pointsEarned > 0 ? pointsEarned : undefined,
    });
  } catch (e) {
    console.error('[payments/confirm]', e);
    res.status(500).json({ error: 'payment_confirm_failed' });
  }
});
