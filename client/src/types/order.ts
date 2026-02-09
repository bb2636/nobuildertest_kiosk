/**
 * 주문 API 요청/응답 타입 (Prisma: Order, OrderItem, OrderItemOption 기준)
 */

// ========== 주문 요청 (Create Order) ==========

/** 주문 한 라인: 상품 ID, 수량, 선택한 옵션 ID 목록 */
export interface OrderRequestItem {
  productId: string;
  quantity: number;
  optionIds: string[];
}

/**
 * 주문 생성 요청 (POST /api/orders)
 * - totalPrice: 주문 총 금액 (원)
 * - items: 상품 라인별 productId, quantity, optionIds
 */
export interface OrderRequest {
  totalPrice: number;
  items: OrderRequestItem[];
}

// ========== 주문 생성 응답 ==========

/** 주문 생성 성공 시 응답 */
export interface OrderCreateResponse {
  orderNumber: number;
  orderNo: string;
  orderId: string;
}

// ========== 주문/주문항목 응답 (목록·상세 API용) ==========

export type OrderType = 'DINE_IN' | 'TAKE_OUT';
export type PaymentMethod = 'CARD' | 'CASH' | 'MOBILE' | 'ETC';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'FAILED';
export type OrderStatus =
  | 'WAITING'
  | 'PREPARING'
  | 'PICKUP_READY'
  | 'COMPLETED'
  | 'CANCELED';

/** 선택된 옵션 한 건 (주문 항목에 연결) */
export interface OrderItemOptionRef {
  id: string;
  optionId: string;
}

/** 주문 항목 한 라인 (상품 참조 + 선택 옵션) */
export interface OrderItemDetail {
  id: string;
  productId: string;
  quantity: number;
  lineTotalAmount: number;
  selectedOptions: OrderItemOptionRef[];
  product?: { id: string; name: string };
}

/** 주문 한 건 (목록/상세 응답) */
export interface OrderDetail {
  id: string;
  orderNo: string;
  orderNumber: number | null;
  orderType: OrderType;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemDetail[];
  createdAt: string;
  updatedAt: string;
}
