/**
 * 인증 API (Express)
 * POST /api/auth/register, login, find-id, find-password
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

const authRouter = Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

function trim(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
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
      select: { id: true, name: true, username: true, email: true, point: true, mileage: true },
    });

    res.status(201).json({ user });
  } catch (e) {
    res.status(500).json({ error: 'register_failed' });
  }
});

/** POST /api/auth/login - 로그인 (성공 시 JWT 발급) */
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

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        point: user.point,
        mileage: user.mileage,
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'login_failed' });
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

    // 임시 비밀번호 생성 (8자 영문+숫자)
    const tempPassword =
      Math.random().toString(36).slice(2, 6) +
      Math.random().toString(36).toUpperCase().slice(2, 6);
    const hashed = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // 우선 성공 여부만 반환 (실제 서비스에서는 이메일로 tempPassword 발송)
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'find_password_failed', success: false });
  }
});

export { authRouter };
