/**
 * 메뉴판 API 응답 및 영양정보 타입
 */

/** calories JSON 파싱 결과 (1회분 기준) */
export type NutritionInfo = {
  kcal: number;
  carb: number;
  sugar: number;
  protein: number;
  fat: number;
  saturatedFat: number;
  sodium: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  sortOrder: number;
};

export type Option = {
  id: string;
  name: string;
  defaultExtraPrice: number;
  sortOrder: number;
  optionGroup: OptionGroup;
};

export type ProductOption = {
  id: string;
  extraPrice: number | null;
  option: Option;
};

export type MenuBoardProduct = {
  id: string;
  categoryId: string;
  name: string;
  englishName: string | null;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  ingredients: string | null;
  calories: string | null; // JSON 문자열 (파싱 전)
  isAvailable: boolean;
  sortOrder: number;
  isBest: boolean;
  defaultShotCount: number | null;
  productOptions: ProductOption[];
};

/** 서비스 계층에서 calories 파싱 후 노출할 때 사용 */
export type MenuBoardProductWithParsedCalories = Omit<
  MenuBoardProduct,
  'calories'
> & {
  calories: NutritionInfo | null;
};

export type MenuBoardCategory = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  products: MenuBoardProduct[];
};
