/**
 * JWT 인증 미들웨어
 * Authorization: Bearer <token> 검증 후 req.userId 설정
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export type AuthPayload = { sub: string; username: string };

export type RequestWithAuth = Request & { userId?: string; authPayload?: AuthPayload };

export function requireAuth(req: RequestWithAuth, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.userId = payload.sub;
    req.authPayload = payload;
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

/** 토큰이 있으면 검증 후 req.userId 설정, 없거나 유효하지 않으면 그냥 통과 (401 안 냄) */
export function optionalAuth(req: RequestWithAuth, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.userId = payload.sub;
    req.authPayload = payload;
  } catch {
    // ignore
  }
  next();
}
