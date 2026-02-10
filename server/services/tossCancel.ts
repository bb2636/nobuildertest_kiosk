/**
 * 토스페이먼츠 결제 취소 API (관리자/유저 주문 취소 공통)
 */

const TOSS_CANCEL_URL = 'https://api.tosspayments.com/v1/payments';

export const POINT_RATE = 0.1;

/** 토스 결제 취소 API 호출. 성공 시 undefined, 실패 시 에러 메시지 반환 */
export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string
): Promise<string | undefined> {
  const secretKey = process.env.TOSSPAYMENTS_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) return 'TOSSPAYMENTS_SECRET_KEY not configured';
  const auth = Buffer.from(secretKey + ':', 'utf8').toString('base64');
  const res = await fetch(`${TOSS_CANCEL_URL}/${encodeURIComponent(paymentKey)}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancelReason: cancelReason.slice(0, 200) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return (err as { message?: string }).message ?? res.statusText;
  }
  return undefined;
}
