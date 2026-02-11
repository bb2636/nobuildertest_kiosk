/**
 * [1계층 - 데이터 접근] 메뉴판 API 클라이언트
 * - GET /api/menu-board 호출, 응답 타입 반환
 * - fetch 실패 시 네트워크 배너 노출용 이벤트 디스패치
 */

import type { MenuBoardCategory } from '../types/menuBoard';
import { isNetworkError, dispatchNetworkError } from './client';

const API = '/api';

async function request<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? 'Request failed');
    }
    return res.json();
  } catch (e) {
    if (isNetworkError(e)) dispatchNetworkError();
    throw e;
  }
}

export const menuBoardApi = {
  /** 메뉴판 전체 조회 (카테고리 + 상품 + 옵션/옵션그룹) */
  get: () => request<MenuBoardCategory[]>('/menu-board'),
};
