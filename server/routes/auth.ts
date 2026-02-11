/**
 * 인증 API (Express)
 * - Access 토큰 30분, Refresh 토큰 7일
 * - POST /api/auth/register, login, refresh, logout, find-id, find-password
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db.js';

const authRouter = Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const ACCESS_EXPIRES_IN = '30m';   // Access 토큰 30분
const REFRESH_EXPIRES_DAYS = 7;    // Refresh 토큰 7일

function trim(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

function createRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRES_DAYS);
  return d;
}

function userToResponse(user: { id: string; name: string; username: string; email: string; role: string; point: number; mileage: number }) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    point: user.point,
    mileage: user.mileage,
  };
}

/** POST /api/auth/register - 회원가입 */
authRouter.post('/register', async (req, res) => {
  try {
    const body = req.body as { name?: string; username?: string; email?: string; password?: string };
    const name = trim(body.name);
    const username = trim(body.username);
    const email = trim(body.email);
    const password = body.password;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'name, username, email, password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      if (existing.username === username) {
        return res.status(409).json({ error: 'username already exists' });
      }
      return res.status(409).json({ error: 'email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
      },
      select: { id: true, name: true, username: true, email: true, role: true, point: true, mileage: true },
    });

    res.status(201).json({ user });
  } catch (e) {
    res.status(500).json({ error: 'register_failed' });
  }
});

/** POST /api/auth/login - 로그인 (Access 30분 + Refresh 7일 발급) */
authRouter.post('/login', async (req, res) => {
  try {
    const body = req.body as { username?: string; password?: string };
    const username = trim(body.username);
    const password = body.password;

    if (!username || !password) {
      return res.status(400).json({ error: 'username, password required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      return res.status(401).json({ error: 'invalid username or password' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'invalid username or password' });
    }

    const accessToken = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES_IN }
    );

    const refreshTokenValue = createRefreshToken();
    const expiresAt = refreshExpiresAt();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    res.json({
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 30 * 60, // 초 단위 (30분)
      user: userToResponse(user),
    });
  } catch (e) {
    res.status(500).json({ error: 'login_failed' });
  }
});

/** POST /api/auth/refresh - Refresh 토큰으로 Access 토큰 재발급 (Refresh 로테이션) */
authRouter.post('/refresh', async (req, res) => {
  try {
    const body = req.body as { refreshToken?: string };
    const refreshToken = trim(body.refreshToken);
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }

    const row = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!row || row.expiresAt < new Date()) {
      if (row) await prisma.refreshToken.delete({ where: { id: row.id } }).catch(() => {});
      return res.status(401).json({ error: 'invalid or expired refresh token' });
    }

    const user = row.user;
    const accessToken = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: ACCESS_EXPIRES_IN }
    );

    // 로테이션: 기존 refresh 삭제 후 새로 발급 (deleteMany는 레코드 없어도 에러 안 남)
    await prisma.refreshToken.deleteMany({ where: { id: row.id } });
    const newRefreshValue = createRefreshToken();
    const expiresAt = refreshExpiresAt();
    await prisma.refreshToken.create({
      data: { userId: user.id, token: newRefreshValue, expiresAt },
    });

    res.json({
      accessToken,
      refreshToken: newRefreshValue,
      expiresIn: 30 * 60,
    });
  } catch (e) {
    res.status(500).json({ error: 'refresh_failed' });
  }
});

/** POST /api/auth/logout - Refresh 토큰 폐기 (선택) */
authRouter.post('/logout', async (req, res) => {
  try {
    const body = req.body as { refreshToken?: string };
    const refreshToken = trim(body.refreshToken);
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
});

/** POST /api/auth/find-id - 아이디 찾기 (성함 + 이메일) */
authRouter.post('/find-id', async (req, res) => {
  try {
    const body = req.body as { name?: string; email?: string };
    const name = trim(body.name);
    const email = trim(body.email);

    if (!name || !email) {
      return res.status(400).json({ error: 'name, email required' });
    }

    const user = await prisma.user.findFirst({
      where: { name, email },
      select: { username: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'no user found with given name and email' });
    }

    res.json({ username: user.username });
  } catch (e) {
    res.status(500).json({ error: 'find_id_failed' });
  }
});

/** POST /api/auth/find-password - 비밀번호 찾기 (성함+아이디+이메일 확인 후 임시 비밀번호 발급, 성공 여부만 반환) */
authRouter.post('/find-password', async (req, res) => {
  try {
    const body = req.body as { name?: string; username?: string; email?: string };
    const name = trim(body.name);
    const username = trim(body.username);
    const email = trim(body.email);

    if (!name || !username || !email) {
      return res.status(400).json({ error: 'name, username, email required' });
    }

    const user = await prisma.user.findFirst({
      where: { name, username, email },
    });

    if (!user) {
      return res.status(404).json({ error: 'no user found with given name, username and email', success: false });
    }

    const tempPassword =
      Math.random().toString(36).slice(2, 6) +
      Math.random().toString(36).toUpperCase().slice(2, 6);
    const hashed = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'find_password_failed', success: false });
  }
});

export { authRouter };
