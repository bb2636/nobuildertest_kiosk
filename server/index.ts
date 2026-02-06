/**
 * 커피 키오스크 API 서버
 * - Prisma(Neon DB) 연결: server/db.ts
 * - 프론트는 Vite dev 시 proxy로 /api 호출
 */

import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { categoriesRouter } from './routes/categories';
import { menuBoardRouter } from './routes/menuBoard';
import { menuRouter } from './routes/menu';
import { ordersRouter } from './routes/orders';
import { userRouter } from './routes/user';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true }));
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT} (API: /api/...)`);
});
