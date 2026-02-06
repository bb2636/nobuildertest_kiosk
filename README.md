# 커피 키오스크 풀스택 앱

피그마 디자인 기반 키오스크(모바일) + 백오피스(웹) SPA.

## 기술 스택

- **Frontend**: React 18, Vite, React Router, Tailwind CSS, Lucide React
- **Backend**: Express, Prisma
- **DB**: Neon (PostgreSQL)

## 사전 요구사항

- Node.js 18+
- `.env`에 `DATABASE_URL` (Neon 연결 문자열) 설정

## DB 설정 및 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 스키마를 Neon DB에 반영 (개발 시)
npm run db:push

# 또는 마이그레이션으로 버전 관리
npm run db:migrate
```

연결 가이드: [docs/NEON_PRISMA.md](docs/NEON_PRISMA.md)

## 실행

**터미널 1 – API 서버 (포트 3001)**

```bash
npm run server
```

**터미널 2 – 프론트 (Vite, 포트 5173)**

```bash
npm run dev
```

- 키오스크: http://localhost:5173/
- 백오피스: http://localhost:5173/admin

프론트에서 `/api` 요청은 Vite 프록시로 `http://localhost:3001`로 전달됩니다.

## 프로젝트 구조

- `server/` – Express API, Prisma 클라이언트 (`db.ts`)
- `src/` – React 앱 (키오스크 + admin 라우트)
- `prisma/schema.prisma` – DB 스키마
- `src/components/ui/` – 공통 컴포넌트 (Button, Input, Card, Modal, Toggle)
- 테마: 키오스크는 노란 강조, 백오피스는 녹색 강조 (Tailwind + CSS 변수)

## 주요 기능

- **키오스크**: 카테고리/메뉴 조회, 메뉴 상세, 장바구니, 주문하기
- **백오피스**: 주문 현황 및 상태 변경, 상품 품절 토글, 카테고리 CRUD
