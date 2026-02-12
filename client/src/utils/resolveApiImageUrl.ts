import { getApiBaseUrl } from '../api/client';

/**
 * DB/API에서 오는 이미지 URL을 현재 API 베이스로 치환.
 * localhost, 127.0.0.1 또는 상대 경로(/uploads/...)를 실기기에서 접근 가능한 URL로 변환.
 */
export function resolveApiImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const base = getApiBaseUrl();
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://localhost') || trimmed.startsWith('https://localhost')) {
    return trimmed.replace(/^https?:\/\/localhost(:\d+)?/, base);
  }
  if (trimmed.startsWith('http://127.0.0.1') || trimmed.startsWith('https://127.0.0.1')) {
    return trimmed.replace(/^https?:\/\/127\.0\.0\.1(:\d+)?/, base);
  }
  if (trimmed.startsWith('/')) {
    return `${base.replace(/\/+$/, '')}${trimmed}`;
  }
  return trimmed;
}
