/**
 * API 요청/응답 타입 (Prisma 스키마 기준)
 * - 상품 상세: product.ts
 * - 주문 요청/응답: order.ts
 * - 메뉴판/영양: menuBoard.ts
 */

// 상품 상세 (Product + Options)
export type {
  OptionGroup,
  Option,
  ProductOptionDetail,
  ProductBase,
  ProductDetail,
  CategoryRef,
  ProductDetailWithCategory,
} from './product';

// 주문 요청/응답
export type {
  OrderRequestItem,
  OrderRequest,
  OrderCreateResponse,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  OrderItemOptionRef,
  OrderItemDetail,
  OrderDetail,
} from './order';

// 메뉴판·영양정보
export type {
  NutritionInfo,
  MenuBoardProduct,
  MenuBoardProductWithParsedCalories,
  MenuBoardCategory,
  ProductOption,
} from './menuBoard';
