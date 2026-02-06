/**
 * Prisma Client 싱글톤 (Neon DB 연결)
 *
 * - 개발 시 Hot Reload에서 여러 인스턴스가 생기지 않도록
 *   globalThis에 캐시합니다.
 * - .env의 DATABASE_URL을 사용합니다.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
