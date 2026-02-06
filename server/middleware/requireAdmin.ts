/**
 * 관리자 전용 미들웨어 (requireAuth 이후 사용)
 * JWT로 사용자 조회 후 role === ADMIN 인지 확인
 */

import type { Response, NextFunction } from 'express';
import { prisma } from '../db.js';
import type { RequestWithAuth } from './auth.js';

export async function requireAdmin(req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    next();
  } catch {
    res.status(500).json({ error: 'failed' });
  }
}
