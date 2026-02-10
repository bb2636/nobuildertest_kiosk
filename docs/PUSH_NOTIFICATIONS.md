# 주문 푸시 알림 (Web Push)

주문 접수 시점과 관리자에서 주문 상태를 변경할 때마다 브라우저 푸시 알림을 보냅니다.

## 동작

- **주문 접수**: 결제(또는 주문 생성) 시 "주문 접수" 푸시 1회
- **상태 변경**: 백오피스에서 주문 상태를 변경할 때마다 "주문 상태 변경: 접수대기/제조중/픽업대기/완료/취소" 푸시 1회

구독은 **주문 단위**로 저장됩니다. 결제 화면에서 "주문 상태 알림 받기"를 켜거나, 주문 완료 페이지에서 "주문 상태 알림 받기" 버튼을 누르면 해당 주문에 대해 위 알림을 받습니다.

## 설정

### 1. VAPID 키 생성

서버와 클라이언트가 같은 **VAPID 공개키**를 사용해야 합니다.

```bash
cd server
node -e "const w=require('web-push'); const k=w.generateVAPIDKeys(); console.log('VAPID_PUBLIC_KEY='+k.publicKey); console.log('VAPID_PRIVATE_KEY='+k.privateKey);"
```

또는 [web-push](https://www.npmjs.com/package/web-push) 문서의 `generate-vapid-keys` 스크립트 사용.

### 2. 환경 변수

**서버 (`.env`)**

- `VAPID_PUBLIC_KEY`: 위에서 생성한 공개키
- `VAPID_PRIVATE_KEY`: 위에서 생성한 비밀키 (노출 금지)
- `VAPID_MAILTO`: (선택) 연락용 메일, 예: `mailto:support@example.com`

**클라이언트 (`.env` 또는 `.env.local`)**

- `VITE_VAPID_PUBLIC_KEY`: 서버와 **동일한** 공개키

둘 다 설정하지 않으면 푸시는 요청되지 않고, 서버는 푸시 발송을 건너뜁니다.

### 3. DB

`OrderPushSubscription` 테이블이 필요합니다. 스키마 적용:

```bash
cd server
npx prisma db push
# 또는
npx prisma migrate dev --name add_push_subscriptions
```

## 흐름

1. 사용자가 결제 화면에서 "주문 상태 알림 받기" 체크 후 결제하거나, 주문 완료 페이지에서 "주문 상태 알림 받기" 클릭
2. 브라우저 알림 권한 요청 → 허용 시 Service Worker로 푸시 구독 생성
3. 구독 정보(엔드포인트 + 키)를 서버로 전송하여 해당 주문과 연결
4. 주문 생성 직후 "주문 접수" 푸시 발송
5. 관리자가 주문 상태 변경 시 해당 주문의 구독자에게 상태 변경 푸시 발송

## 참고

- 푸시는 **HTTPS** 또는 **localhost** 환경에서만 동작합니다.
- Service Worker는 `public/sw.js`에 있으며, 푸시 수신 시 알림을 띄우고 클릭 시 앱으로 포커스/이동합니다.
