/**
 * 주문 관련 웹 푸시 알림
 * - VAPID 키가 설정된 경우에만 발송 (미설정 시 무시)
 */

import webpush from 'web-push';
import { prisma } from '../db.js';
import { OrderStatus } from '@prisma/client';

/** OrderPushSubscription 모델이 포함된 Prisma 클라이언트 (generate 후 타입 반영) */
type PrismaWithPush = typeof prisma & {
  orderPushSubscription: {
    create: (args: { data: { orderId: string; subscription: string } }) => Promise<{ id: string }>;
    findMany: (args: { where: { orderId: string }; select: { id: true; subscription: true } }) => Promise<{ id: string; subscription: string }[]>;
    delete: (args: { where: { id: string } }) => Promise<unknown>;
    deleteMany: (args: { where: { orderId: { in: string[] } } }) => Promise<{ count: number }>;
  };
};
const db = prisma as PrismaWithPush;

const STATUS_LABELS: Record<OrderStatus, string> = {
  WAITING: '접수대기',
  PREPARING: '제조중',
  PICKUP_READY: '픽업대기',
  COMPLETED: '완료',
  CANCELED: '취소',
};

let vapidInitialized = false;

function initVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      process.env.VAPID_MAILTO ?? 'mailto:support@example.com',
      publicKey,
      privateKey
    );
    vapidInitialized = true;
  }
}

function isPushAvailable(): boolean {
  initVapid();
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** 주문에 연결된 구독 저장 (중복 시 기존 삭제 후 1개만 유지해도 됨) */
export async function saveSubscriptionForOrder(
  orderId: string,
  subscription: PushSubscriptionInput
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return;

  await db.orderPushSubscription.create({
    data: {
      orderId,
      subscription: JSON.stringify(subscription),
    },
  });
}

/** 해당 주문의 모든 구독에 푸시 발송 (실패한 구독은 로그만, 예외는 던지지 않음) */
export async function sendPushForOrder(
  orderId: string,
  title: string,
  body: string
): Promise<void> {
  if (!isPushAvailable()) return;

  const list = await db.orderPushSubscription.findMany({
    where: { orderId },
    select: { id: true, subscription: true },
  });

  const payload = JSON.stringify({ title, body });

  for (const row of list) {
    try {
      const sub = JSON.parse(row.subscription) as PushSubscriptionInput;
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        },
        payload,
        { TTL: 60 * 60 * 24 }
      );
    } catch (e) {
      const err = e as { statusCode?: number };
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.orderPushSubscription.delete({ where: { id: row.id } }).catch(() => {});
      }
    }
  }
}

/** 완료/취소된 지 24시간 지난 주문의 푸시 구독 삭제 (알림은 하루 뒤 사라짐) */
export async function cleanupExpiredPushSubscriptions(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [OrderStatus.COMPLETED, OrderStatus.CANCELED] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length > 0) {
    await db.orderPushSubscription.deleteMany({ where: { orderId: { in: orderIds } } });
  }
}

/** 주문 접수 시 알림 (주문 생성 직후 호출) */
export function notifyOrderReceived(orderId: string, orderNo: string): Promise<void> {
  return sendPushForOrder(
    orderId,
    '주문 접수',
    `주문번호 ${orderNo} 주문이 접수되었습니다.`
  );
}

/** 주문 상태 변경 시 알림 (관리자에서 상태 변경 직후 호출) */
export function notifyOrderStatusChanged(
  orderId: string,
  orderNo: string,
  status: OrderStatus
): Promise<void> {
  const label = STATUS_LABELS[status];
  return sendPushForOrder(
    orderId,
    '주문 상태 변경',
    `주문번호 ${orderNo} 상태: ${label}`
  );
}
