# Neon DB + Prisma 연결 가이드

## 1. 환경 변수

프로젝트 루트 `.env` 파일에 Neon에서 발급한 연결 주소를 넣습니다.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
```

- Neon 대시보드 → Connection string 복사 후 그대로 붙여넣기
- Pooler 사용 권장: 호스트에 `-pooler` 포함된 URL 사용 (동시 연결 수 확보)

## 2. Prisma Client 사용 (서버 코드)

API 서버에서는 `server/db.ts`를 import해 사용합니다.

```ts
import { prisma } from '../server/db';

// 예: 카테고리 목록
const categories = await prisma.category.findMany({
  where: { isActive: true },
  orderBy: { sortOrder: 'asc' },
  include: { items: true },
});
```

- **한 번만** `prisma` 인스턴스를 쓰면 됩니다 (싱글톤).
- `db.ts`에서 이미 `DATABASE_URL`을 읽어 Prisma가 Neon에 연결합니다.

## 3. 연결 확인

```bash
npx prisma db push
npx prisma studio
```

- `db push`: 스키마를 Neon DB에 반영 (개발 시)
- `prisma studio`: 브라우저에서 테이블/데이터 확인

## 4. Cold Start (Neon 유휴 시)

Neon은 5분 비활성 후 컴퓨트가 sleep 됩니다.  
첫 요청 시 지연이 있을 수 있으므로, 필요하면 연결 문자열에 다음을 추가하세요.

```
?sslmode=require&connect_timeout=10
```

## 5. 트러블슈팅

| 현상 | 확인 사항 |
|------|-----------|
| Connection refused | DATABASE_URL 호스트/포트/DB명 확인, Neon 프로젝트가 Paused 아닌지 확인 |
| SSL required | URL에 `?sslmode=require` 포함 여부 |
| Too many connections | Pooler URL 사용 (`-pooler` 포함된 호스트) |
