/**
 * [2계층 - 비즈니스 로직] 주문 생성
 * - 입력 검증 후 Repository 호출
 * - 성공 시 orderNumber 반환
 */

import {
  createOrderWithItems,
  type CreateOrderDto,
  type CreateOrderResult,
} from '../repositories/orderRepository.js';

export type CreateOrderInput = CreateOrderDto;

export type CreateOrderOutput = {
  orderNumber: number;
  orderNo: string;
  orderId: string;
};

const MAX_ITEMS = 50;
const MAX_OPTIONS_PER_ITEM = 20;

/**
 * 주문 생성. 트랜잭션 내에서 Order, OrderItem, OrderItemOption 생성.
 * 실패 시 전체 롤백 후 에러 throw.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
  const { totalPrice, items } = input;

  if (typeof totalPrice !== 'number' || !Number.isInteger(totalPrice) || totalPrice < 1) {
    throw new Error('INVALID_TOTAL_PRICE');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('ITEMS_REQUIRED');
  }

  if (items.length > MAX_ITEMS) {
    throw new Error('ITEMS_TOO_MANY');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      throw new Error(`INVALID_ITEM_AT_INDEX:${i}`);
    }
    if (typeof item.productId !== 'string' || item.productId.trim() === '') {
      throw new Error(`INVALID_PRODUCT_ID_AT_INDEX:${i}`);
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`INVALID_QUANTITY_AT_INDEX:${i}`);
    }
    if (!Array.isArray(item.optionIds)) {
      throw new Error(`INVALID_OPTION_IDS_AT_INDEX:${i}`);
    }
    if (item.optionIds.length > MAX_OPTIONS_PER_ITEM) {
      throw new Error(`OPTION_IDS_TOO_MANY_AT_INDEX:${i}`);
    }
    const invalidOpt = item.optionIds.some((id) => typeof id !== 'string');
    if (invalidOpt) {
      throw new Error(`INVALID_OPTION_ID_AT_INDEX:${i}`);
    }
  }

  const dto: CreateOrderDto = {
    totalPrice,
    items: items.map((i) => ({
      productId: String(i.productId).trim(),
      quantity: Math.max(1, Number(i.quantity) || 1),
      optionIds: (i.optionIds ?? []).filter((id): id is string => typeof id === 'string'),
    })),
  };

  const result: CreateOrderResult = await createOrderWithItems(dto);

  return {
    orderNumber: result.orderNumber,
    orderNo: result.orderNo,
    orderId: result.orderId,
  };
}
