/**
 * [3계층 - 데이터 접근] 주문 생성
 * - $transaction으로 Order → OrderItem → OrderItemOption 원자 처리
 * - 실패 시 전체 롤백
 */

import { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { prisma } from '../db.js';

export type CreateOrderItemDto = {
  productId: string;
  quantity: number;
  optionIds: string[];
};

export type CreateOrderDto = {
  totalPrice: number;
  items: CreateOrderItemDto[];
  userId?: string;
  /** 매장 DINE_IN | 포장 TAKE_OUT */
  orderType?: OrderType;
  paymentMethod?: 'CARD' | 'CASH' | 'MOBILE' | 'ETC';
  /** 토스 등 외부 결제 시 PENDING으로 생성 후 승인 시 PAID 처리 */
  paymentStatus?: 'PENDING' | 'PAID';
  /** 매장 포인트 사용 금액 (원). 로그인 사용자만 사용 가능, 실제 결제액 = totalPrice - usePoint */
  usePoint?: number;
};

export type CreateOrderResult = {
  orderId: string;
  orderNo: string;
  orderNumber: number;
  pointsEarned?: number;
};

/**
 * 주문 + 주문 항목 + 선택 옵션을 하나의 트랜잭션으로 생성.
 * 중간에 실패하면 모든 작업이 롤백됨.
 */
const POINT_RATE = 0.1; // 결제 금액의 10% 포인트 적립

export async function createOrderWithItems(dto: CreateOrderDto): Promise<CreateOrderResult> {
  const { totalPrice, items, userId, orderType = OrderType.DINE_IN, paymentMethod, paymentStatus = 'PAID', usePoint = 0 } = dto;
  const usePointAmount = Number(usePoint) || 0;
  // payAmount는 검증 후 서버 계산 합계(computedTotal) 기준으로 설정됨

  if (items.length === 0) {
    throw new Error('ORDER_ITEMS_EMPTY');
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const optionIds = [...new Set(items.flatMap((i) => i.optionIds))];

  return prisma.$transaction(async (tx) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await tx.order.count({
      where: { createdAt: { gte: todayStart } },
    });
    const today = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = count + 1;
    const orderNo = `${today}-${String(orderNumber).padStart(3, '0')}`;

    const [products, options, productOptions] = await Promise.all([
      tx.product.findMany({
        where: { id: { in: productIds }, isAvailable: true },
        select: { id: true, basePrice: true },
      }),
      optionIds.length > 0
        ? tx.option.findMany({
            where: { id: { in: optionIds } },
            select: { id: true, defaultExtraPrice: true },
          })
        : Promise.resolve([]),
      tx.productOption.findMany({
        where: {
          productId: { in: productIds },
          ...(optionIds.length > 0 ? { optionId: { in: optionIds } } : {}),
        },
        select: { productId: true, optionId: true, extraPrice: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const optionMap = new Map(options.map((o) => [o.id, o]));
    const productOptionMap = new Map(
      productOptions.map((po) => [`${po.productId}:${po.optionId}`, po.extraPrice])
    );

    const orderLines: { productId: string; quantity: number; optionIds: string[]; lineTotalAmount: number }[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`ORDER_PRODUCT_NOT_FOUND:${item.productId}`);
      }
      if (item.quantity < 1 || !Number.isInteger(item.quantity)) {
        throw new Error('ORDER_INVALID_QUANTITY');
      }

      let lineExtra = 0;
      for (const optId of item.optionIds) {
        const option = optionMap.get(optId);
        const key = `${item.productId}:${optId}`;
        const overridePrice = productOptionMap.get(key);
        const extra = overridePrice !== undefined && overridePrice !== null ? overridePrice : option?.defaultExtraPrice ?? 0;
        if (option) lineExtra += extra;
      }

      const lineTotalAmount = (product.basePrice + lineExtra) * item.quantity;
      orderLines.push({
        productId: item.productId,
        quantity: item.quantity,
        optionIds: item.optionIds,
        lineTotalAmount,
      });
    }

    const computedTotal = orderLines.reduce((sum, line) => sum + line.lineTotalAmount, 0);
    // 클라이언트 합계와 1원 이내 오차 허용 (옵션 가격/반올림 차이)
    if (Math.abs(computedTotal - totalPrice) > 1) {
      throw new Error('ORDER_TOTAL_MISMATCH');
    }
    const orderTotal = computedTotal;

    if (usePointAmount > 0) {
      if (!userId) throw new Error('ORDER_USE_POINT_REQUIRES_LOGIN');
      if (usePointAmount > orderTotal) throw new Error('ORDER_USE_POINT_EXCEEDS_TOTAL');
      const user = await tx.user.findUnique({ where: { id: userId }, select: { point: true } });
      if (!user || user.point < usePointAmount) throw new Error('ORDER_INSUFFICIENT_POINT');
      await tx.user.update({
        where: { id: userId },
        data: { point: { decrement: usePointAmount } },
      });
    }

    const payAmount = orderTotal - usePointAmount;
    const order = await tx.order.create({
      data: {
        orderNo,
        orderNumber,
        status: OrderStatus.WAITING,
        paymentStatus: paymentStatus === 'PENDING' ? PaymentStatus.PENDING : PaymentStatus.PAID,
        totalAmount: payAmount,
        userId: userId ?? null,
        orderType,
        paymentMethod: paymentMethod ?? null,
      },
    });

    let pointsEarned = 0;
    if (paymentStatus === 'PAID' && userId && payAmount > 0) {
      pointsEarned = Math.floor(payAmount * POINT_RATE);
      if (pointsEarned > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { point: { increment: pointsEarned } },
        });
      }
    }

    for (const line of orderLines) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          lineTotalAmount: line.lineTotalAmount,
        },
      });

      if (line.optionIds.length > 0) {
        await tx.orderItemOption.createMany({
          data: line.optionIds.map((optionId) => ({
            orderItemId: orderItem.id,
            optionId,
          })),
        });
      }
    }

    return {
      orderId: order.id,
      orderNo,
      orderNumber,
      pointsEarned: pointsEarned > 0 ? pointsEarned : undefined,
    };
  });
}
