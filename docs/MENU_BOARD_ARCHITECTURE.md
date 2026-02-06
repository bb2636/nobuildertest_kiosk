# 메뉴판 API 3티어 구조

## 백엔드 (Backend)

```
server/
├── routes/           # [1계층] API 라우트 (요청/응답)
│   └── menuBoard.ts        GET /api/menu-board
├── services/         # [2계층] 비즈니스 로직
│   └── menuBoardService.ts  메뉴판 조회 오케스트레이션
├── repositories/     # [3계층] 데이터 접근 (Prisma)
│   └── menuBoardRepository.ts  Category + Product + Option 조회
├── db.ts
└── index.ts
```

- **Repository**: Prisma로 `isActive: true` 카테고리·상품만, `sortOrder` 정렬, ProductOption → Option → OptionGroup 중첩 조회
- **Service**: Repository 결과 그대로 반환 (추가 필터/가공 시 확장)
- **Route**: Service 호출 후 JSON 응답

---

## 프론트엔드 (Frontend)

```
src/
├── api/              # [1계층] 데이터 접근 (HTTP 클라이언트)
│   └── menuBoard.ts        GET /api/menu-board 호출
├── services/         # [2계층] 비즈니스 로직 (데이터 가공)
│   └── menuBoardService.ts  API 호출 + calories 파싱
├── utils/            # 유틸리티
│   └── parseCalories.ts    calories JSON 문자열 → 객체 변환
├── types/            # 공통 타입
│   └── menuBoard.ts        메뉴판/영양정보 타입 정의
├── hooks/            # [3계층] 뷰 연동 (선택)
│   └── useMenuBoard.ts     메뉴판 조회 + 로딩/에러 상태
└── pages/            # [3계층] 뷰 (서비스/훅 소비)
    └── kiosk/ ... 등에서 useMenuBoard() 또는 menuBoardService 사용
```

- **API** (`api/menuBoard.ts`): `menuBoardApi.get()` — 서버 응답 그대로 반환
- **Service** (`services/menuBoardService.ts`): `getMenuBoard()` — API 호출 후 각 상품의 `calories` 파싱하여 객체로 치환
- **Util** (`utils/parseCalories.ts`): `parseCalories(calories)` — JSON 문자열 → `NutritionInfo | null`
- **View**: `useMenuBoard()` 또는 `menuBoardService.getMenuBoard()` 사용
