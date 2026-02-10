/**
 * 커피 키오스크 API 서버
 * - Prisma(Neon DB) 연결: server/db.ts
 * - 프론트는 Vite dev 시 proxy로 /api 호출
 * - Swagger UI: GET /api-docs
 * - .env: 루트(step4) 또는 server 상위에서 로드
 */

import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
const cwd = process.cwd();
const rootEnv = path.resolve(cwd, '.env');
const parentEnv = path.resolve(cwd, '..', '.env');
config({ path: fs.existsSync(rootEnv) ? rootEnv : parentEnv });

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createRequire } from 'module';
import { prisma } from './db';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { categoriesRouter } from './routes/categories';
import { menuBoardRouter } from './routes/menuBoard';
import { menuRouter } from './routes/menu';
import { ordersRouter } from './routes/orders';
import { paymentsRouter } from './routes/payments';
import { userRouter } from './routes/user';
import { siteRouter } from './routes/site';

const require = createRequire(import.meta.url);
const swaggerDocument = require('./openapi.json');

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true }));
app.use(express.json());

// Swagger UI (API 테스트용)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { customSiteTitle: '키오스크 API' }));

// 헬스체크 (Neon 연결 확인용)
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: 'connected' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'error', error: String(e) });
  }
});

app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/menu-board', menuBoardRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/site', siteRouter);

/** 매칭되지 않은 API 요청 → 404 */
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT} (API: /api/..., Swagger: http://localhost:${PORT}/api-docs)`);
});
