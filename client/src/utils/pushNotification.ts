/**
 * 웹 푸시 구독 (주문 상태 알림용)
 * - VAPID 공개키가 없으면 구독 불가
 * - Service Worker 등록 후 pushManager.subscribe() 반환값을 JSON으로 서버에 전달
 */

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** 알림 권한 요청 (granted면 true) */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** SW 등록 (한 번만 호출해도 됨) */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

/**
 * 푸시 구독 생성. 권한 요청 → SW 등록 → subscribe(vapidPublicKey) → JSON 반환.
 * vapidPublicKey 미설정 시 null 반환.
 */
export async function getPushSubscription(
  vapidPublicKey: string | undefined
): Promise<PushSubscriptionJSON | null> {
  if (!vapidPublicKey || typeof vapidPublicKey !== 'string') return null;
  const ok = await requestNotificationPermission();
  if (!ok) return null;
  const reg = await registerServiceWorker();
  if (!reg?.pushManager) return null;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = urlBase64ToUint8Array(vapidPublicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
      });
    }
    return sub.toJSON() as PushSubscriptionJSON;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}
