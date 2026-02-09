/**
 * API 응답용 상품 상세 타입 (Prisma: Product + ProductOption → Option → OptionGroup)
 * - 메뉴 상세, 메뉴판 등 Product와 옵션 정보를 함께 내려줄 때 사용
 */

/** 옵션 그룹 (원두, 샷 추가, 우유, 시럽 등) */
export interface OptionGroup {
  id: string;
  name: string;
  sortOrder: number;
}

/** 옵션 한 건 (기본 추가 금액 포함) */
export interface Option {
  id: string;
  name: string;
  defaultExtraPrice: number;
  sortOrder: number;
  optionGroup: OptionGroup;
}

/** 상품-옵션 연결 정보 (상품별 추가금 오버라이드 포함) */
export interface ProductOptionDetail {
  id: string;
  productId: string;
  optionId: string;
  extraPrice: number | null;
  option: Option;
}

/** 상품 기본 필드 (옵션 제외) */
export interface ProductBase {
  id: string;
  categoryId: string;
  name: string;
  englishName: string | null;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  ingredients: string | null;
  calories: string | null;
  isAvailable: boolean;
  sortOrder: number;
  isBest: boolean;
  defaultShotCount: number | null;
}

/**
 * 상품 상세 (Product + Options)
 * - productOptions 안에 option, option.optionGroup 까지 중첩된 API 응답용
 */
export interface ProductDetail extends ProductBase {
  productOptions: ProductOptionDetail[];
}

/** 카테고리 정보만 필요한 경우 (상품 목록 응답 등) */
export interface CategoryRef {
  id: string;
  name: string;
}

/** 상품 상세 + 카테고리 참조 (단일 상품 조회 응답 등) */
export interface ProductDetailWithCategory extends ProductDetail {
  category: CategoryRef;
}
