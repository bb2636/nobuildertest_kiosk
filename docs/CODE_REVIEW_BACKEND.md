# 백엔드 코드 점검 요약

## 적용한 수정 사항

### 1. 보안

- **주문 API**
  - `GET /api/orders`, `PATCH /api/orders/:id/status` 제거.
  - 주문 목록·상태 변경은 **관리자 전용** `GET/PATCH /api/admin/orders` 만 사용.
  - 키오스크용 `POST /api/orders`(주문 생성)만 공개 유지.

- **카테고리**
  - `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` 에 **requireAuth + requireAdmin** 적용.
  - `GET /api/categories` 는 키오스크·메뉴용으로 공개 유지.

- **메뉴(상품)**
  - `POST /api/menu`, `PATCH /api/menu/:id`, `DELETE /api/menu/:id` 에 **requireAuth + requireAdmin** 적용.
  - `GET /api/menu`, `GET /api/menu/:id` 는 공개 유지.

### 2. 에러 처리

- **404**
  - 매칭되는 라우트가 없을 때 `{ error: 'not_found' }` + 404 응답 (서버 마지막 미들웨어).

- **Prisma P2025**
  - 카테고리/메뉴의 `update`·`delete` 에서 레코드 없음(P2025) 시 404 + `category not found` / `product not found` 반환.

---

## 현재 구조 요약

| 구분 | 경로 | 인증 | 비고 |
|------|------|------|------|
| 헬스 | GET /api/health | 없음 | DB 연결 확인 |
| 인증 | POST /api/auth/register, login, find-id, find-password | 없음 | 로그인 시 JWT 발급 |
| 사용자 | GET/PATCH /api/user/* | Bearer JWT | 마이페이지 |
| 관리자 | /api/admin/* | Bearer JWT + role ADMIN | 백오피스 전용 |
| 카테고리 | GET /api/categories | 없음 | 목록만 공개 |
| 카테고리 | POST/PATCH/DELETE /api/categories | JWT + ADMIN | |
| 메뉴 | GET /api/menu, /api/menu/:id | 없음 | 공개 |
| 메뉴 | POST/PATCH/DELETE /api/menu | JWT + ADMIN | |
| 메뉴판 | GET /api/menu-board | 없음 | 키오스크용 |
| 주문 | POST /api/orders | 없음 | 키오스크 주문 생성만 |
| 주문 목록/상태 | GET/PATCH /api/admin/orders | JWT + ADMIN | |

---

## 추가 권장 사항 (선택)

1. **환경 변수**
   - 프로덕션에서 `JWT_SECRET` 없으면 서버 기동 시 에러로 종료하도록 체크.

2. **요청 검증**
   - body 스키마 검증(예: zod, express-validator)으로 타입·길이·필수값 통일.

3. **CORS**
   - 운영 환경에서는 `origin` 을 허용 도메인으로 제한.

4. **로깅**
   - 접근 로그(morgan 등), 에러 로그 구조화.

5. **주문 생성 시 회원 연동**
   - 키오스크에서 로그인한 경우 `Authorization` 으로 전달한 JWT의 `userId` 를 Order.userId 에 저장하면 회원 주문 이력 연동 가능.

6. **비밀번호 찾기**
   - 현재 임시 비밀번호를 응답에 포함하지 않음. 실제 서비스에서는 이메일 발송 등 별도 채널 필요.

---

## 디렉터리 구조

```
server/
  index.ts          # 앱 진입, 라우트 마운트, 404
  db.ts             # Prisma 클라이언트
  openapi.json      # Swagger 스펙
  middleware/
    auth.ts         # JWT 검증, req.userId
    requireAdmin.ts # role === ADMIN 확인
  routes/
    admin.ts        # /api/admin (requireAuth + requireAdmin)
    auth.ts         # /api/auth
    user.ts         # /api/user (requireAuth)
    categories.ts   # /api/categories (GET 공개, 나머지 ADMIN)
    menu.ts         # /api/menu (GET 공개, 나머지 ADMIN)
    menuBoard.ts    # /api/menu-board
    orders.ts       # /api/orders (POST 만: 주문 생성)
  services/
    orderService.ts
    menuBoardService.ts
  repositories/
    orderRepository.ts
    menuBoardRepository.ts
```
