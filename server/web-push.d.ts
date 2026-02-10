declare module 'web-push' {
  export function setVapidDetails(
    mailto: string,
    publicKey: string,
    privateKey: string
  ): void;
  export function sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number }
  ): Promise<{ statusCode: number }>;
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
}
