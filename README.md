# 커피 키오스크 풀스택 앱

피그마 디자인 기반 키오스크(모바일) + 백오피스(웹) SPA.

## 기술 스택

- **Frontend**: React 18, Vite, React Router, Tailwind CSS, Lucide React
- **Backend**: Express, Prisma
- **DB**: Neon (PostgreSQL)

## 사전 요구사항

- Node.js 18+
- `.env` 파일을 **프로젝트 루트(step4)** 에 두고 아래 환경 변수 설정

### 환경 변수 (`.env`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Neon(PostgreSQL) 연결 문자열 |
| `JWT_SECRET` | JWT Access/Refresh 토큰 서명용 (운영 환경에서 반드시 변경) |
| `VITE_TOSSPAYMENTS_CLIENT_KEY` | 토스 결제창용 클라이언트 키 (프론트 노출). **테스트**: `test_ck_...` 사용 |
| `TOSSPAYMENTS_SECRET_KEY` | 토스 결제 승인 API용 시크릿 키 (백엔드 전용, 노출 금지). **테스트**: `test_sk_...` 사용 |

`.env.example`을 복사해 `.env`를 만들고 값을 채우면 됩니다. 토스 테스트 결제는 [토스페이먼츠 개발자센터](https://docs.tosspayments.com/)에서 발급한 테스트 키로 동작합니다.

## DB 설정 및 마이그레이션

```bash
# Prisma 클라이언트 생성
npm run db:generate

# 스키마를 Neon DB에 반영 (개발 시)
npm run db:push

# 시드 데이터 (카테고리·메뉴·옵션·관리자 계정, 젤라또 컵/콘 옵션 포함)
npm run db:seed

# 또는 마이그레이션으로 버전 관리
npm run db:migrate
```

연결 가이드: [docs/NEON_PRISMA.md](docs/NEON_PRISMA.md)

## 실행

**한 번에 프론트 + 백엔드 (권장)**

```bash
npm run dev
```

- **프론트(Vite)**: 포트 5173
- **백엔드(Express)**: 포트 3001
- **키오스크**: http://localhost:5173/
- **백오피스**: http://localhost:5173/admin
- **API 문서 (Swagger)**: http://localhost:3001/api-docs

**각각 실행**

```bash
npm run dev:client   # 프론트만 (Vite)
npm run dev:server   # 백엔드만 (Express)
```

프론트에서 `/api` 요청은 Vite 프록시로 `http://localhost:3001`로 전달됩니다. 서버는 **프로젝트 루트** 또는 **server 상위 디렉터리**의 `.env`를 자동으로 로드합니다.

## 프로젝트 구조

```
step4/
├── client/                 # 프론트엔드 (React, Vite, Tailwind)
│   ├── src/
│   │   ├── api/            # API 클라이언트 (client.ts), 메뉴보드
│   │   ├── components/     # ui (Button, Input, Card, Modal, Toggle), admin (AdminGate)
│   │   ├── contexts/       # AuthContext, KioskCartContext
│   │   ├── layouts/        # KioskLayout, AdminLayout
│   │   ├── pages/
│   │   │   ├── kiosk/      # 홈, 메뉴상세, 장바구니, 결제, 로그인/회원가입, 마이페이지
│   │   │   └── admin/      # 관리자 로그인, 주문/메뉴/카테고리 관리
│   │   ├── types/
│   │   └── ...
│   └── public/
├── server/                 # 백엔드 (Express API, Prisma)
│   ├── prisma/             # schema.prisma, seed (컵/콘 옵션·젤라또 연결 포함)
│   ├── routes/             # auth, orders, payments, menu, categories, admin, user
│   ├── middleware/        # auth, requireAdmin
│   ├── services/           # orderService, menuBoardService
│   └── repositories/       # orderRepository, menuBoardRepository
├── docs/                   # NEON_PRISMA, TOSS_PAYMENTS, 아키텍처 등
├── package.json            # workspaces (client, server)
└── .env.example
```

---

## 완료된 기능 요약

### 키오스크 (고객용)

| 구분 | 기능 | 비고 |
|------|------|------|
| **인증** | 회원가입, 로그인, 아이디 찾기(이름+이메일), 비밀번호 찾기(임시 비밀번호) | JWT Access/Refresh |
| **홈** | 카테고리/메뉴 그리드, 장바구니, 마이페이지 진입(인물 아이콘) | |
| **메뉴** | 메뉴 상세(옵션·원두·온도·샷 등), 장바구니 담기 | **젤라또**: 컵/콘 선택만. **디저트**: 옵션 없음(메뉴만 담기) |
| **결제** | 식사 방법 **매장/포장** 선택, 토스 포인트(매장 포인트), 결제수단, 포인트 10% 적립·할인 반영 | 주문 시 `orderType` 저장 |
| **토스 결제** | **카드/토스** 선택 시 → 토스 결제창 오픈, **승인 API 성공 시에만** 주문 PAID·주문 완료 페이지 이동. 현금/모바일/기타는 결제창 없이 즉시 완료 | [docs/TOSS_PAYMENTS.md](docs/TOSS_PAYMENTS.md) |
| **마이페이지** | 주문내역(매장/포장·상태·**옵션명** 표시), **상태·기간 필터**, 포인트/마일리지, 계정정보, 설정, 약관 | 본인 주문만 조회 |

### 백오피스 (관리자 전용)

| 구분 | 기능 | 비고 |
|------|------|------|
| **인증** | 관리자 로그인 | JWT + role `ADMIN` |
| **주문 현황** | 주문 목록(매장/포장·**옵션명** 표시), **상태 드롭다운**으로 한 번에 변경 | 접수대기/제조중/픽업대기/완료/취소 선택 |
| **메뉴 관리** | 메뉴 목록, **메뉴 등록**(카테고리·상품명·영문명·가격·설명·이미지 URL·원재료), 메뉴 삭제, 품절 토글 | 삭제는 주문 이력 있으면 409 |
| **카테고리** | 카테고리 CRUD | |

---

## API 개요

| 구분 | 메서드 | 경로 | 인증 | 설명 |
|------|--------|------|------|------|
| 헬스 | GET | /api/health | - | DB 연결 확인 |
| 인증 | POST | /api/auth/register, login, refresh, find-id, find-password | - | 로그인 시 JWT 발급 |
| 주문 생성 | POST | /api/orders | 선택(Bearer 시 회원 주문·포인트 적립) | body: `totalPrice`, `items`(optionIds 포함), `orderType?`, `paymentMethod?`, `usePoint?` |
| 결제 | POST | /api/payments/confirm | - | 토스 결제 승인 (paymentKey, orderId, amount) |
| 마이페이지 | GET | /api/user/me | Bearer JWT | 계정 정보 |
| 마이페이지 | GET | /api/user/orders | Bearer JWT | 본인 주문 목록. 쿼리: `status`, `from`, `to`(YYYY-MM-DD). 응답 항목에 `optionNames` 포함 |
| 마이페이지 | PATCH | /api/user/update, /api/user/settings | Bearer JWT | 계정·설정 수정 |
| 관리자 주문 | GET / PATCH | /api/admin/orders, /api/admin/orders/:id | JWT + ADMIN | 주문 목록·상태 변경. 항목별 `optionNames` 포함 |
| 관리자 메뉴 | GET / POST / PATCH / DELETE | /api/admin/products, /api/admin/products/:id | JWT + ADMIN | 메뉴 목록·등록(상세 필드)·수정·삭제 |
| 관리자 카테고리 | GET / POST / PATCH / DELETE | /api/categories, /api/categories/:id | GET 공개, 나머지 ADMIN | |
| 메뉴·메뉴판 | GET | /api/menu, /api/menu/:id, /api/menu-board | - | 키오스크용 공개 |

상세 스펙은 **http://localhost:3001/api-docs** (Swagger) 참고.


