/**
 * 토스페이먼츠 결제 승인
 * - 토스에 결제 승인 요청 → 200이면 DB 저장 시도, DB 실패 시 토스 결제 취소 후 500 반환
 * - 토스 응답이 200이 아니면 취소 불필요, 에러만 반환
 */

import { Router } from 'express';
import { PaymentStatus, TossPaymentStatus } from '@prisma/client';
import { prisma } from '../db.js';
import { cancelTossPayment } from '../services/tossCancel.js';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const POINT_RATE = 0.1;

/** 토스 status 문자열 → Prisma enum */
function toTossPaymentStatus(s: string | undefined): TossPaymentStatus {
  if (s && Object.values(TossPaymentStatus).includes(s as TossPaymentStatus)) {
    return s as TossPaymentStatus;
  }
  return TossPaymentStatus.DONE;
}

export const paymentsRouter = Router();

/** POST /api/payments/confirm - 토스 결제 승인 후 주문 PAID + TossPayment 생성 + 포인트 적립 */
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

    const tossData = (await tossRes.json()) as {
      paymentKey?: string;
      orderId?: string;
      method?: string;
      status?: string;
      totalAmount?: number;
      approvedAt?: string | null;
      requestedAt?: string;
    };

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

    const totalAmount = Number(tossData.totalAmount) || amount;
    const method = typeof tossData.method === 'string' ? tossData.method : '카드';
    const status = toTossPaymentStatus(tossData.status);
    const requestedAtStr = tossData.requestedAt;
    const approvedAtStr = tossData.approvedAt;
    const requestedAt = requestedAtStr ? new Date(requestedAtStr) : new Date();
    const approvedAt = approvedAtStr ? new Date(approvedAtStr) : null;

    let pointsEarned = 0;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.PAID, tossPaymentKey: paymentKey },
        });
        await tx.tossPayment.upsert({
          where: { id: paymentKey },
          create: {
            id: paymentKey,
            orderId,
            tossOrderId: orderId,
            tossPaymentMethod: method,
            tossPaymentStatus: status,
            totalAmount,
            approvedAt,
            requestedAt,
          },
          update: {
            tossPaymentStatus: status,
            totalAmount,
            approvedAt,
            requestedAt,
          },
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
    } catch (dbError) {
      console.error('[payments/confirm] DB 저장 실패, 토스 결제 취소 시도:', dbError);
      const cancelErr = await cancelTossPayment(paymentKey, '결제정보 DB 저장 실패로 인한 자동 취소');
      if (cancelErr) {
        console.error('[payments/confirm] 토스 결제 취소 실패:', cancelErr);
      }
      return res.status(500).json({
        error: 'payment_confirm_failed',
        message: '결제 정보 저장에 실패했습니다. 결제는 취소되었을 수 있습니다.',
      });
    }

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
