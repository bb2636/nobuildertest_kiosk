/**
 * 공개 사이트 콘텐츠 (인증 불필요)
 * 유저 마이페이지에서 약관/개인정보처리방침 조회용
 */

import { Router } from 'express';
import { prisma } from '../db.js';

export const siteRouter = Router();

/** GET /api/site/terms - 서비스 이용약관 (공개) */
siteRouter.get('/terms', async (_req, res) => {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { key: 'terms' },
    });
    res.json({
      content: row?.content ?? '',
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

/** GET /api/site/privacy - 개인정보 처리방침 (공개) */
siteRouter.get('/privacy', async (_req, res) => {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { key: 'privacy' },
    });
    res.json({
      content: row?.content ?? '',
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});
