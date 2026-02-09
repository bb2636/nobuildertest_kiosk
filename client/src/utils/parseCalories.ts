/**
 * calories 필드(JSON 문자열) → NutritionInfo 객체 변환
 * - null/빈 문자열이면 null 반환
 * - 파싱 실패 시 null 반환 (프론트에서 바로 사용 가능하도록)
 */

import type { NutritionInfo } from '../types/menuBoard';

export function parseCalories(calories: string | null | undefined): NutritionInfo | null {
  if (calories == null || calories === '') return null;
  try {
    const parsed = JSON.parse(calories) as unknown;
    if (parsed == null || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    const kcal = typeof o.kcal === 'number' ? o.kcal : 0;
    const carb = typeof o.carb === 'number' ? o.carb : 0;
    const sugar = typeof o.sugar === 'number' ? o.sugar : 0;
    const protein = typeof o.protein === 'number' ? o.protein : 0;
    const fat = typeof o.fat === 'number' ? o.fat : 0;
    const saturatedFat = typeof o.saturatedFat === 'number' ? o.saturatedFat : 0;
    const sodium = typeof o.sodium === 'number' ? o.sodium : 0;
    return { kcal, carb, sugar, protein, fat, saturatedFat, sodium };
  } catch {
    return null;
  }
}
