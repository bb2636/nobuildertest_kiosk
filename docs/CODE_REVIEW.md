# 코드 점검 요약

## 수정 반영 사항

### 1. **server/routes/menu.ts** (중요)
- **문제**: `prisma.item` 사용 → 스키마에는 `Product`만 존재하여 런타임 에러 발생
- **조치**: `prisma.product` 기반으로 전면 수정
  - GET 목록/상세: Product + category + productOptions(option, optionGroup) 조회 후 클라이언트 `MenuItem` 형태로 변환
  - `imageUrl` → `images: [{ url }]`, `isAvailable` → `isSoldOut: !isAvailable`
  - POST/PATCH/DELETE: Product create/update/delete, `isSoldOut` → `isAvailable: !isSoldOut` 매핑

### 2. **prisma/seed.ts**
- **문제**: `(prisma as any).cartItem`, `(prisma as any).cart`, `(prisma as any).user`로 타입 회피
- **조치**: `prisma.cartItem`, `prisma.cart`, `prisma.user` 직접 사용 (Prisma generate 후 타입 존재)
- **추가**: 약관/개인정보처리방침 초기 데이터 — `SiteContent` upsert(terms, privacy)로 빈 문서 생성
- **정리**: 미사용 `type Prisma` import 제거

### 3. **src/api/client.ts** & **AdminOrders.tsx**
- **문제**: Order 타입이 예전 스키마 기준 (`totalPrice`, `item.name`, `unitPrice`)이고, 주문 상태값이 스키마와 불일치
- **조치**:
  - Order 타입: `totalAmount`, `items[].product.name`, `items[].lineTotalAmount`, `orderNumber`, `updatedAt` 반영
  - AdminOrders: `STATUS_LABEL` 및 버튼을 `WAITING` → `PREPARING` → `PICKUP_READY` → `COMPLETED`, `CANCELED`로 통일
  - 주문 취소 버튼 추가 (WAITING/PREPARING/PICKUP_READY 시 CANCELED로 변경)

---

## 추가로 권장할 작업

1. **vite.config.ts proxy**: 개발 시 `/api` → 백엔드 서버로 프록시 설정 여부 확인
2. **환경 변수**: `.env.example`에 `DATABASE_URL`, `JWT_SECRET` 등 문서화
3. **GET /api/orders 인증**: 백오피스 주문 목록은 관리자만 접근하도록 시큐어할지 검토 (현재는 인증 없음)
4. **이미지 경로**: 키오스크/관리자에서 `item.images[0].url` 사용 시 상대 경로(`/images/...`)가 올바르게 동작하는지 확인

---

## 현재 구조 요약

| 영역 | 설명 |
|------|------|
| **인증** | POST /api/auth/login (JWT), 관리자 role: ADMIN |
| **메뉴** | GET/POST/PATCH/DELETE /api/menu (Product 기준), GET /api/menu-board (카테고리별 상품+옵션) |
| **주문** | POST /api/orders (트랜잭션), GET/PATCH /api/orders (목록·상태) |
| **관리자** | /api/admin/* (users, orders, products, terms, privacy) — JWT + ADMIN 필요 |
| **사용자** | /api/user/* (me, orders, cart, update, settings) — JWT 필요 |
