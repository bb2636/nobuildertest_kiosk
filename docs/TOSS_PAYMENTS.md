# 토스페이먼츠 연동 가이드

## 현재 구현

- 결제 수단: **카드 결제**, **토스 포인트**, 현금, 모바일, 기타.
- **카드 / 토스 포인트 선택 시**: 주문을 `PENDING` 으로 생성한 뒤 **토스 결제창**을 띄웁니다. 사용자가 토스 창에서 결제를 완료해야만 성공 URL(`/payment/success`) 로 리다이렉트되고, 해당 페이지에서 백엔드 `POST /api/payments/confirm` 으로 승인합니다. **승인 API가 성공한 경우에만** 주문을 `PAID` 로 변경·포인트 10% 적립 후 주문 완료 페이지로 이동합니다. (결제창에서 취소 시 `failUrl`(/checkout) 로 돌아옴.)
- **현금 / 모바일 / 기타**: 결제창 없이 주문 생성 시 바로 `PAID` + 포인트 적립 후 주문 완료 페이지로 이동합니다.
- **전액 포인트(결제 0원)**: 카드/토스 선택 상태에서도 토스 결제창을 띄우지 않고 즉시 `PAID` 처리 후 주문 완료로 이동합니다.
- **포인트 사용 상한**: 사용 포인트 합계가 주문 금액을 초과할 수 없어, 결제 금액이 0원 미만으로 내려가지 않습니다.
- **결제 취소**: **관리자**에서 주문 상태를 "취소"로 변경할 때, 또는 **유저**가 마이페이지·주문 상태 보기에서 "주문 취소"를 요청할 때, 해당 주문이 토스로 결제된 경우 **토스 결제 취소 API**를 먼저 호출합니다. 취소 성공 시에만 주문을 CANCELED로 변경하고 **paymentStatus를 REFUNDED로 갱신**한 뒤 적립 포인트를 회수합니다. 유저 취소는 **접수대기(WAITING) 상태일 때만** 가능하며, 제조중·픽업대기·완료 등 그 외 상태에서는 취소 불가. 토스 취소 실패 시 400과 메시지를 반환합니다.
- 개발·테스트 시 토스페이먼츠 **테스트 키**(`test_ck_...`, `test_sk_...`) 를 사용하면 결제창에서 테스트 카드로 결제할 수 있습니다.

## 실제 토스 결제 연동 절차

### 1. 토스페이먼츠 가입 및 키 발급

- [토스페이먼츠 개발자센터](https://docs.tosspayments.com/) 에서 가입 후 **클라이언트 키**, **시크릿 키** 발급
- 테스트용 키로 먼저 연동 후, 운영 시 라이브 키로 교체

### 2. 환경 변수

- **프론트** (`.env`): `VITE_TOSSPAYMENTS_CLIENT_KEY` — 결제창 호출 시 사용 (Vite 가 `import.meta.env.VITE_*` 로만 노출)
- **백엔드** (`.env`): `TOSSPAYMENTS_SECRET_KEY` — 결제 승인 API 호출 시 사용 (노출 금지)
- `.env.example` 에 변수 이름이 정리되어 있음

### 3. SDK 로드 (결제 화면)

```html
<!-- index.html 또는 결제 페이지에서 -->
<script src="https://js.tosspayments.com/v2/payment"></script>
```

또는 npm:

```bash
npm install @tosspayments/payment-sdk
```

### 4. 결제 요청 흐름

1. **결제하기** 클릭 시  
   - 주문 생성 전에 `orderId`(우리 주문 ID), `amount`, `customerKey`(구매자 식별자) 로 토스 결제창/위젯 호출
2. 사용자가 토스 결제창에서 **토스 포인트** 등으로 결제 완료
3. 토스가 리다이렉트 또는 콜백으로 `paymentKey`, `orderId` 등 전달
4. **백엔드** 에서 시크릿 키로 토스 **결제 승인 API** 호출
5. 승인 성공 후 우리 DB에 주문 저장 + 포인트 10% 적립

### 5. 백엔드 결제 승인 (예시)

- `POST https://api.tosspayments.com/v1/payments/confirm`  
  - Body: `paymentKey`, `orderId`, `amount`
  - Header: `Authorization: Basic <시크릿키 Base64>`
- 성공 시 우리 서버에서 주문 생성 + `userId` 있으면 포인트 적립

### 6. 포인트 적립 (가게)

- 이미 구현됨: 주문 생성 시 `userId` 가 있으면 **결제 금액의 10%** 를 `User.point` 에 적립
- 토스 연동 후에는 “토스 결제 승인 성공” 시점에 같은 로직으로 주문 생성하면 됨

## 참고

- [토스페이먼츠 결제창 연동](https://docs.tosspayments.com/guides/payment/integration)
- [JavaScript SDK v2](https://docs.tosspayments.com/sdk/v2/js)
