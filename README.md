# 커피 키오스크 풀스택 앱

피그마 디자인 기반 키오스크(모바일) + 백오피스(웹) SPA.

## 기술 스택

- **Frontend**: React 18, Vite, React Router, Tailwind CSS, Lucide React, i18next / react-i18next (키오스크 다국어)
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
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | (선택) 웹 푸시 알림. 미설정 시 푸시 미발송. [docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md) |
| `VITE_VAPID_PUBLIC_KEY` | (선택) 프론트 푸시 구독용 VAPID 공개키 (서버와 동일 값) |
| `VITE_API_URL` | (선택) Capacitor 실기기 빌드 시 백엔드 주소. 예: `http://10.140.140.171:3001` (미설정 시 device 모드 기본값 사용) |

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

- **프론트(Vite)**: 포트 5173 (`.env`는 **프로젝트 루트 step4** 사용, `envDir`로 로드)
- **백엔드(Express)**: 포트 3001
- **키오스크**: http://localhost:5173/
- **백오피스**: http://localhost:5173/admin
- **API 문서 (Swagger)**: http://localhost:3001/api-docs

`.env` 수정 후에는 **클라이언트·서버를 한 번씩 재시작**해야 반영됩니다.

**각각 실행**

```bash
npm run dev:client   # 프론트만 (Vite)
npm run dev:server   # 백엔드만 (Express)
```

프론트에서 `/api` 요청은 Vite 프록시로 `http://localhost:3001`로 전달됩니다. 서버는 **프로젝트 루트** 또는 **server 상위 디렉터리**의 `.env`를 자동으로 로드합니다.

---

## 📱 Capacitor Android 앱 래핑 (실기기 테스트)

키오스크를 Android 앱으로 래핑해 실기기에서 같은 Wi-Fi의 PC 백엔드에 연결할 수 있습니다.

### 중요

- **모든 `npx cap ...` 명령어는 반드시 프론트엔드 폴더(`client`) 안에서 실행해야 합니다.**
- **Android Studio에서 Run(▶)을 눌러 앱을 구동합니다.** (빌드·설치 후 실기기/에뮬레이터에서 실행)

### 사전 준비

- Node 18+
- Android Studio (JDK 17 권장)
- 실기기: PC와 **같은 Wi-Fi** 연결
- Windows: 방화벽에서 **백엔드 포트(3001) 인바운드 허용**
- PC IP 확인: CMD에서 `ipconfig` → 해당 Wi-Fi IPv4 주소 (예: 10.140.140.171)

### 환경 변수 (실기기용)

- **VITE_API_URL**: 실기기가 접속할 백엔드 주소.  
  예: `VITE_API_URL=http://10.140.140.171:3001` (PC IP는 ipconfig로 확인 후 변경)
- 루트 `.env`에 넣거나, 빌드 시 한 번만 지정:  
  `set VITE_API_URL=http://10.140.140.171:3001` 후 `npm run build:device`
- 값을 주지 않으면 **device 모드** 빌드 시 코드에 넣어 둔 기본 PC IP가 사용됩니다. (현재 `vite.config.ts` 기본값: `http://10.140.140.171:3001`. PC IP가 다르면 루트 또는 `client/.env`에 `VITE_API_URL` 설정)

### 빌드 및 실행 순서

1. **client** 폴더로 이동:
   ```bash
   cd client
   ```
2. 의존성 설치 (최초 1회):
   ```bash
   npm install
   ```
3. Android 플랫폼 추가 (최초 1회, **반드시 client 폴더에서**):
   ```bash
   npx cap add android
   ```
4. 실기기용 웹 빌드 (PC IP 반영 후):
   ```bash
   npm run build:device
   ```
5. Capacitor 동기화 (**client 폴더에서**):
   ```bash
   npx cap sync
   ```
6. Android Studio 열기 (**client 폴더에서**):
   ```bash
   npx cap open android
   ```
7. **실기기(폰)에 앱 설치·실행** (둘 중 편한 방법):
   - **방법 A – 터미널에서 바로 실행**  
     `client` 폴더에서 **폰만 연결**한 상태(에뮬레이터 종료)로:
     ```bash
     npx cap run android
     ```
     → 폰에 `app-debug.apk` 설치 후 자동 실행.  
     (에뮬레이터와 폰이 동시에 연결되면 한 대만 골라서 설치될 수 있으므로, 폰에만 설치하려면 에뮬레이터를 끄고 실행하는 것이 좋습니다.)
   - **방법 B – Android Studio에서 기기 선택**  
     `npx cap open android`로 연 뒤, 상단 **Run(▶)** 왼쪽 **기기 드롭다운**에서 **실기기(내 폰)** 를 선택하고 **Run(▶)** 클릭.

### 백엔드

- 서버는 **0.0.0.0**으로 listen 하여 외부 기기 접속을 허용합니다. (기본 적용)
- CORS는 `origin: '*'`, `credentials: false`로 설정되어 있습니다.

### 무선 디버깅으로 폰 연결 (adb)

USB 없이 같은 Wi‑Fi에서 폰을 인식시키려면 **무선 디버깅**으로 adb 연결합니다. (Android 11 이상)

1. **adb 위치**  
   Android Studio 설치 시 함께 들어 있는 **Android SDK platform-tools**에 있습니다.  
   - 기본 경로(Windows): `C:\Users\사용자명\AppData\Local\Android\Sdk\platform-tools\adb.exe`  
   - PATH에 없으면 아래 명령에서 `adb` 대신 이 경로 전체를 넣거나, **시스템 환경 변수 Path**에 `platform-tools` 폴더를 추가한 뒤 터미널을 다시 엽니다.

2. **폰 설정**  
   - **설정 → 개발자 옵션 → 무선 디버깅** 켜기  
   - **무선 디버깅** 화면에 **기기와 페어링 코드로 연결** / **Pair device with pairing code** 와 **기기 IP 주소 및 포트** (연결용 포트)가 표시됩니다.

3. **페어링 (최초 1회)**  
   터미널에서 **페어링용 IP:포트**만 사용합니다. (`IP:` 라는 글자는 입력하지 않습니다.)
   ```bash
   adb pair 10.140.140.168:38363
   ```
   → **Enter pairing code:** 가 나오면 폰에 뜬 **6자리 코드** 입력 후 엔터.  
   → `Successfully paired to ...` 가 나오면 성공.

4. **연결**  
   무선 디버깅 화면의 **기기 IP 주소 및 포트**(연결용 포트, 페어링 포트와 다름)로 연결합니다.
   ```bash
   adb connect 10.140.140.168:5555
   ```
   → `5555`는 예시이며, 폰에 표시된 **연결 포트**로 바꿉니다.

5. **연결 확인**  
   ```bash
   adb devices
   ```
   → 목록에 `10.140.140.168:5555 device` 처럼 나오면 연결된 것입니다. 이 상태에서 `npx cap run android` 하면 해당 폰에 앱이 설치됩니다.

### 방화벽에서 3001 포트 열기

실기기(폰) 앱이 PC의 백엔드(3001)에 접속하려면, **백엔드를 실행하는 PC**에서 3001 포트 인바운드를 허용해야 합니다.

**관리자 PowerShell**에서 한 번만 실행:

```powershell
New-NetFirewallRule -DisplayName "Node 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

- PC와 폰이 **같은 Wi‑Fi**여야 하고, 앱 빌드 시 `VITE_API_URL=http://PC의IPv4:3001` 로 **PC IP**를 맞춰 빌드했는지 확인하세요.
- 폰 브라우저에서 `http://PC의IPv4:3001/api/health` 가 열리면 네트워크·방화벽은 정상입니다.

### 모바일에서 "연결이 끊겼습니다" 나올 때

모바일 앱은 **빌드 시점에 넣은 PC IP**로만 API를 호출합니다. 아래를 순서대로 확인하세요.

1. **PC에서 백엔드 실행 중인지**  
   step4에서 `npm run dev` 가 떠 있어야 합니다. (또는 `npm run dev:server` 로 3001 포트 실행)

2. **PC IP 확인**  
   백엔드 돌리는 PC에서 CMD/PowerShell: `ipconfig` → 사용 중인 Wi‑Fi의 **IPv4 주소** (예: 10.140.140.171).

3. **같은 Wi‑Fi**  
   폰과 PC가 **같은 Wi‑Fi**에 연결돼 있어야 합니다.

4. **방화벽**  
   위 **"방화벽에서 3001 포트 열기"** 한 번 실행했는지 확인.  
   관리자 PowerShell:  
   `New-NetFirewallRule -DisplayName "Node 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow`

5. **폰 브라우저로 연결 테스트**  
   폰에서 **크롬 등 브라우저**를 열고 주소창에 입력:  
   `http://PC의IPv4:3001/api/health`  
   (예: `http://10.140.140.171:3001/api/health`)  
   - **`{"ok":true,"db":"connected"}` 비슷한 JSON이 보이면** → 네트워크·방화벽은 정상. **6번으로 앱 재빌드.**  
   - **안 열리면** → 방화벽·Wi‑Fi·PC IP 다시 확인.

6. **앱을 현재 PC IP로 다시 빌드**  
   앱에 들어간 API 주소는 **빌드할 때** 정해지므로, PC IP가 바뀌었거나 처음부터 다르면 **다시 빌드**해야 합니다.  
   ```bash
   cd client
   set VITE_API_URL=http://10.140.140.171:3001
   npm run build:device
   npx cap sync
   npx cap run android
   ```  
   `10.140.140.171` 자리를 **2번에서 확인한 PC IPv4**로 바꿉니다.

7. **Android HTTP(cleartext) 허용**  
   [docs/CAPACITOR_ANDROID.md](docs/CAPACITOR_ANDROID.md) 의 **3.2, 3.3** 에 따라  
   `usesCleartextTraffic="true"`, `network_security_config.xml` 에 PC IP가 들어가 있는지 확인합니다.

### 모바일에서 로그인이 안 될 때

로그인·로그아웃 요청도 **위와 같은 API 주소(VITE_API_URL)** 로 나갑니다. "연결이 끊겼습니다"와 같은 원인입니다.

- **폰 브라우저**에서 `http://PC_IP:3001/api/health` 가 열리면 → 백엔드·DB·방화벽은 정상. **앱을 현재 PC IP로 다시 빌드**한 뒤 `npx cap sync` → 앱 재설치 후 로그인 시도.
- **health도 안 열리면** → PC 백엔드 실행 여부, 같은 Wi‑Fi, 방화벽 3001 포트, PC IP 확인.

DB 문제(로그인 불가의 원인)인지 확인하려면: PC 브라우저에서 `http://localhost:3001/api/health` 를 열어 `{"ok":true,"db":"connected"}` 인지 봅니다. 여기서 `db` 가 `"error"` 이면 DB 연결 문제입니다.

### 모바일에서 connection refused / 흰 화면

- **"[vite] page reload ... intermediates/assets/..."** 가 보이면  
  앱이 **개발 서버(localhost)** 를 바라보고 있을 수 있습니다. 모바일 앱은 **반드시 빌드된 파일**만 쓰세요.  
  **`npm run dev` 는 브라우저용**이고, 폰에서는 **`npm run build`(또는 `build:device`) → `npx cap sync` → `npx cap run android`** 만 사용하세요.  
  `capacitor.config.ts` 에 **server.url** 이 있으면 제거해 두세요(원격 라이브 리로드용이라 실기기에서 localhost 접속 시 connection refused 발생).

- **ERR_CONNECTION_REFUSED** 또는 **ERR_UNKNOWN_URL_SCHEME** 이 나오면  
  1. `capacitor.config.ts` 에 **server.url 이 없고**, **androidScheme: 'https'** 인지 확인.  
  2. **클린 빌드** 후 다시 시도:
     ```bash
     cd client
     rmdir /s /q android\app\build
     npm run build
     npx cap sync
     npx cap run android
     ```
     (PowerShell이면 `Remove-Item -Recurse -Force android\app\build`)  
  3. **에뮬레이터에서 확인**: Android Studio에서 **에뮬레이터**를 선택해 Run하면 대부분 정상 로드됨. 에뮬레이터에서는 되는데 **실기기에서만** connection refused 나오면 해당 기기/WebView 조합 이슈일 수 있음.

### 모바일에서 흰 화면만 뜰 때

1. **빌드·동기화 다시 하기**  
   ```bash
   cd client
   npm run build
   npx cap sync
   npx cap run android
   ```
   (모바일에서 API 쓰려면 `npm run build:device` 후 위와 같이 sync/run)

2. **로딩이 8초 넘게 걸리면**  
   화면에 "앱을 불러올 수 없습니다"와 [다시 시도] 버튼이 나옵니다. [다시 시도]로 새로고침해 보세요.

3. **Android Studio에서 실행**  
   터미널 대신 Android Studio에서 `npx cap open android` 후 Run(▶)으로 실행해 보세요. Logcat에서 `chromium` 또는 `WebView` 로그로 JS 오류 여부를 확인할 수 있습니다.

4. **캐시 삭제 후 재설치**  
   앱 정보 → 저장공간 → 캐시 삭제, 또는 앱 삭제 후 `npx cap run android` 로 다시 설치해 보세요.

### 상세 가이드

- **Java 17 고정**, **Cleartext HTTP 허용**, **network_security_config**, **MainActivity Mixed Content** 등 Android 네이티브 설정은 [docs/CAPACITOR_ANDROID.md](docs/CAPACITOR_ANDROID.md)를 참고하세요.

### 다른 프로젝트(frontend/backend 구조)와 비교

| 항목 | 이 프로젝트 (step4) | 다른 폴더 예시 (당근 클론 등) |
|------|---------------------|------------------------------|
| 프론트 폴더 | `client` | `frontend` |
| 백엔드 폴더 | `server` | `backend` |
| cap 명령 실행 위치 | **반드시 `client`** | **반드시 `frontend`** |
| API 주소 env | 루트 `.env` 또는 `client/.env`, `VITE_API_URL` | `frontend/.env`, `VITE_API_URL` |
| 기본 PC IP | `vite.config.ts` 기본값 (예: 10.140.140.171) | 172.30.1.71 등 코드/문서에 명시 |
| 폰에 설치 | `cd client` → `npx cap run android` (폰만 연결 시 폰에 설치) 또는 Android Studio에서 기기 선택 후 Run | 동일: `cd frontend` → `npx cap run android` 또는 Android Studio Run |

**공통:** `npx cap run android` / `npx cap sync` 는 **항상 프론트엔드 폴더(client 또는 frontend) 안에서** 실행합니다. 터미널에서 `npx cap run android` 시 연결된 기기가 하나(폰만)면 그 기기에 설치되고, 에뮬레이터와 폰이 둘 다 있으면 환경에 따라 한 대만 선택될 수 있어, **폰에만 설치하려면 에뮬레이터를 끄거나, Android Studio 기기 드롭다운에서 실기기를 선택한 뒤 Run** 하면 됩니다.

---

## 프로젝트 구조

```
step4/
├── client/                 # 프론트엔드 (React, Vite, Tailwind)
│   ├── src/
│   │   ├── api/            # API 클라이언트 (client.ts), 메뉴보드
│   │   ├── components/     # ui (Button, Input, Card, Modal, Toggle), admin (AdminGate)
│   │   ├── contexts/       # AuthContext, KioskCartContext, MenuCacheContext, NetworkErrorContext
│   │   ├── i18n.ts         # 키오스크 다국어(ko/en) 초기화, localStorage 저장
│   │   ├── locales/        # ko.json, en.json (키오스크 번역)
│   │   ├── layouts/        # KioskLayout, AdminLayout(좌측 네비)
│   │   ├── pages/
│   │   │   ├── kiosk/      # 홈, 메뉴상세, 장바구니, 결제, 로그인/회원가입, 마이페이지, 주문상태보기
│   │   │   ├── admin/      # 로그인, 주문/메뉴/메뉴 등록하기/카테고리/약관·개인정보처리방침 관리
│   │   │   └── errors/     # 404, 403, 500, 401 전용 페이지
│   │   ├── types/
│   │   └── ...
│   └── public/
├── server/                 # 백엔드 (Express API, Prisma)
│   ├── prisma/             # schema.prisma, seed (컵/콘 옵션·젤라또 연결 포함)
│   ├── routes/             # auth, orders, payments, menu, categories, admin, user, site
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
| **홈** | 카테고리/메뉴 그리드, **하단 주문내역 슬라이스**(가로 스크롤·수량/삭제), 장바구니에 담긴 메뉴는 **이미지에 회색 오버레이+체크** 표시, 마이페이지 진입(인물 아이콘) | |
| **메뉴** | 메뉴 상세(옵션·원두·온도·샷 등), 장바구니 담기. **담기 시 팝업**: "장바구니로 이동" / "다른 메뉴 더 보기" 선택 | **젤라또**: 컵/콘 선택만. **디저트**: 옵션 없음(메뉴만 담기) |
| **결제** | 식사 방법 **매장/포장** 선택, 토스 포인트(매장 포인트), 결제수단, 포인트 10% 적립·할인 반영. **0원 결제**: 포인트로 전액 할인 시 토스 창 없이 즉시 주문 완료(현금 처리) | 주문 시 `orderType` 저장 |
| **토스 결제** | **카드/토스** 선택 시 결제금액 > 0이면 토스 결제창 오픈, **승인 API 성공 시에만** 주문 PAID·주문 완료 페이지 이동. **0원**이면 결제창 없이 즉시 완료. 현금/모바일/기타는 결제창 없이 즉시 완료 | [docs/TOSS_PAYMENTS.md](docs/TOSS_PAYMENTS.md) |
| **마이페이지** | 주문내역(매장/포장·상태·**옵션명**·이미지 표시). **상태 표시**: 접수대기·**주문 확인 중**·**제조중**·픽업대기·완료·취소. **상태·기간 필터**, **주문 상태 보기**(접수대기/제조중/픽업대기 폴링), **주문 취소**(**접수대기 상태일 때만** 가능. 토스 결제 시 토스 취소 API 호출 후 포인트 회수), 포인트/마일리지, 계정정보, 설정, **서비스 이용약관**·**개인정보 처리방침**(관리자에서 등록한 내용 조회) | 본인 주문만 조회. 비회원은 주문번호로 단일 주문 조회 가능. 취소는 로그인 회원만 가능 |
| **푸시 알림** | 결제 시 "주문 상태 알림 받기" 체크 또는 주문 완료 페이지에서 구독 시, 접수·상태 변경 시 푸시 발송. 완료/취소 24h 지난 주문은 푸시 구독 삭제(알림만 사라짐), 상세는 계속 조회 가능 | [docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md) |
| **주문 완료·픽업** | 주문 완료 화면에 **주문번호 N 호출 시 픽업해 주세요** 안내 문구 표시 | |
| **결제 취소/실패** | 토스 결제 취소·실패 시 `failUrl` 복귀 후 **결제가 취소되었습니다. 장바구니는 유지됩니다** 배너 표시 | Checkout `?payment=fail` 처리 |
| **알레르기·원재료** | 메뉴 상세에 **알레르기 유발 원재료** 강조 영역(DB `ingredients` 노출, 안내 문구 포함) | 커피/젤라또/디저트 공통 |
| **주문 수량 한도** | 장바구니·결제 화면에 **1회 주문 최대 50종** 안내. 서버는 기존 `ITEMS_TOO_MANY` 검증 유지 | |
| **전체화면** | 키오스크 홈 헤더 **전체화면** 버튼(F11 대체). 터치·클릭으로 진입/해제 | 60초 무활동 홈 복귀는 기존 유지 |
| **다국어** | 키오스크 **KO/EN** 언어 전환(i18n). 선택 언어는 `localStorage` 저장, 홈·장바구니·메뉴상세·주문완료·결제 등 문구 번역 | `client/src/locales/ko.json`, `en.json` |
| **기타** | 품절 메뉴 뱃지·흐림 처리, 60초 무활동 시 홈 복귀(결제/주문완료 제외), 전역 네트워크 오류 배너, 반응형(모바일·웹), 404/403/500/401 전용 페이지 | |

### 백오피스 (관리자 전용)

| 구분 | 기능 | 비고 |
|------|------|------|
| **레이아웃** | **좌측 세로 네비게이션** (유저관리, 주문관리, 메뉴관리, 약관관리), 환영 문구, 로그아웃. 모바일 시 드로어. **메뉴 등록하기** 선택 시 상품 관리 탭이 함께 활성화되지 않도록 경로 정확 매칭(`end`) | 섹션 접기/펼치기 지원 |
| **인증** | 관리자 로그인 | JWT + role `ADMIN` |
| **주문 현황** | 주문 목록(매장/포장·**옵션명** 표시), **상태 드롭다운**으로 변경. **취소** 선택 시 토스 결제 건은 토스 취소 API 호출 후 주문 취소·적립 포인트 회수. 취소 실패 시 에러 메시지 표시 | [docs/TOSS_PAYMENTS.md](docs/TOSS_PAYMENTS.md) |
| **메뉴 관리** | **상품 관리**: 메뉴 목록, 품절 토글, 삭제 (상품 등록 버튼 없음). **메뉴 등록하기** 전용 페이지: 카테고리·상품명(0/30)·영문명·가격·설명·이미지 URL·원재료. **디저트/베이커리** 카테고리 시 **열량·영양정보** 테이블(열량/탄수화물/당류 등). **옵션**: 기본값 설정 체크 시 해당 카테고리 기존 옵션 목록 불러오기, 미체크 시 **옵션 추가 칸(고정)** 에서 카테고리·옵션명·추가금 입력 후 새 옵션 생성. 옵션 목록은 **체크리스트** 형태로 표시, 적용할 옵션 체크 | 삭제는 주문 이력 있으면 409 |
| **카테고리** | 카테고리 CRUD | |
| **유저관리** | 유저 목록(검색·페이지네이션), 상세(해당 유저 주문 모달), 계정 삭제(탈퇴) | |
| **약관관리** | **서비스 이용약관**·**개인정보 처리방침** 텍스트 조회/수정, 저장 시 확인 알림. 마지막 업데이트 일자 표시 | 유저 마이페이지에서 동일 내용 조회 |

---

## API 개요

| 구분 | 메서드 | 경로 | 인증 | 설명 |
|------|--------|------|------|------|
| 헬스 | GET | /api/health | - | DB 연결 확인 |
| 인증 | POST | /api/auth/register, login, refresh, find-id, find-password | - | 로그인 시 JWT 발급 |
| 주문 생성 | POST | /api/orders | 선택(Bearer 시 회원 주문·포인트 적립) | body: `totalPrice`, `items`(optionIds 포함), `orderType?`, `paymentMethod?`, `usePoint?`, `pushSubscription?` |
| 푸시 구독 | POST | /api/orders/:orderId/push-subscription | - | body: `subscription`. 주문 알림 구독 등록 |
| 결제 | POST | /api/payments/confirm | - | 토스 결제 승인 (paymentKey, orderId, amount) |
| 마이페이지 | GET | /api/user/me | Bearer JWT | 계정 정보 |
| 마이페이지 | GET | /api/user/orders | Bearer JWT | 본인 주문 목록. 쿼리: `status`, `from`, `to`(YYYY-MM-DD). 응답에 `optionNames`, `imageUrl` 포함 |
| 마이페이지 | GET | /api/user/orders/:id | 선택(Bearer 또는 비로그인) | 단일 주문 조회. 비회원 주문은 orderId만 알면 조회 가능 |
| 마이페이지 | POST | /api/user/orders/:id/cancel | Bearer JWT | 본인 주문 취소. **접수대기(WAITING) 상태일 때만** 가능, 그 외 상태는 400. 토스 결제 시 토스 취소 API 호출 후 포인트 회수 |
| 마이페이지 | PATCH | /api/user/update, /api/user/settings | Bearer JWT | 계정·설정 수정 |
| 사이트 콘텐츠 | GET | /api/site/terms, /api/site/privacy | - | 서비스 이용약관·개인정보 처리방침 (공개, 마이페이지 조회용) |
| 관리자 유저 | GET / DELETE | /api/admin/users, /api/admin/users/:id, /api/admin/users/:id/orders | JWT + ADMIN | 유저 목록·계정 삭제·해당 유저 주문 목록 |
| 관리자 주문 | GET / PATCH | /api/admin/orders, /api/admin/orders/:id | JWT + ADMIN | 주문 목록(기간·상태 필터)·상태 변경·상세. 취소 시 토스 취소 API·포인트 회수 |
| 관리자 메뉴 | GET / POST / PATCH / DELETE | /api/admin/products, /api/admin/products/:id | JWT + ADMIN | 메뉴 목록·등록(상세 필드)·수정·삭제 |
| 관리자 메뉴 옵션 | POST | /api/admin/products/:id/options | JWT + ADMIN | body: `optionIds`. 상품에 연결할 옵션 일괄 설정 (기존 연결 삭제 후 생성) |
| 관리자 옵션 그룹 | GET / POST | /api/admin/option-groups, /api/admin/option-groups/:id/options | JWT + ADMIN | 옵션 그룹·옵션 목록 조회, 옵션 그룹에 새 옵션 추가 (name, defaultExtraPrice) |
| 관리자 기본 옵션 | GET | /api/admin/categories/:categoryId/default-options | JWT + ADMIN | 해당 카테고리 상품들이 사용 중인 옵션 ID 목록 (메뉴 등록 시 기본값 불러오기) |
| 관리자 카테고리 | GET / POST / PATCH / DELETE | /api/categories, /api/categories/:id | GET 공개, 나머지 ADMIN | |
| 관리자 약관 | GET / PUT | /api/admin/terms, /api/admin/privacy | JWT + ADMIN | 약관·개인정보처리방침 조회/수정 (content, updatedAt) |
| 메뉴·메뉴판 | GET | /api/menu, /api/menu/:id, /api/menu-board | - | 키오스크용 공개. 메뉴 상세 응답에 `ingredients` 포함 |

상세 스펙은 **http://localhost:3001/api-docs** (Swagger) 참고.

---

## 최근 보강 사항

### 키오스크

| 항목 | 구현 내용 |
|------|-----------|
| **주문 번호 픽업 안내** | `OrderDone.tsx`: 주문 완료 문구 아래 "주문번호 N 호출 시 픽업해 주세요" 표시 (다국어 대응) |
| **결제 취소/실패 안내** | `Checkout.tsx`: 토스 `failUrl` → `/checkout?payment=fail`. 복귀 시 "결제가 취소되었습니다. 장바구니는 유지됩니다" 배너 |
| **0원 결제** | `Checkout.tsx`: 포인트 전액 사용으로 결제금액 0원일 때 결제 버튼 활성화, 토스 창 없이 현금 처리로 주문 완료 후 주문 완료 페이지 이동 |
| **주문내역 상태 표시** | `MyPageOrders.tsx`: 주문 목록에 **주문 확인 중**(WAITING), **제조중**(PREPARING) 문구 표시 (픽업대기·완료·취소와 동일한 스타일) |
| **홈 하단 주문내역 슬라이스** | `KioskHome.tsx`: 장바구니 내용을 하단 고정 바에서 **가로 스크롤**로 표시. 주문내역 N, 초기화, 각 항목(이미지·이름·금액·수량 ±·삭제), 총액·주문하기 버튼 |
| **장바구니 담기 팝업** | `KioskMenuDetail.tsx`: 메뉴 담기 시 "장바구니에 추가되었어요" 모달 → "장바구니로 이동" / "다른 메뉴 더 보기" 선택. 옵션 수정 후 담기는 기존처럼 장바구니로 바로 이동 |
| **담긴 메뉴 시각 표시** | `KioskHome.tsx`: 이미 장바구니에 있는 상품은 메뉴 이미지에 **회색 오버레이 + 흰색 체크 아이콘** 표시 |
| **알레르기·원재료 강조** | `KioskMenuDetail.tsx`: `ingredients` 있을 때 "알레르기 유발 원재료" 제목·아이콘·안내 문구·원재료 텍스트를 강조 박스로 표시 |
| **주문 수량 한도** | `KioskCart.tsx`, `Checkout.tsx`: 푸터에 "1회 주문 최대 50종" 문구 (서버 `ITEMS_TOO_MANY`와 일치) |
| **전체화면** | `KioskHome.tsx`: 헤더 전체화면 버튼(Maximize2). `requestFullscreen` / `exitFullscreen` |
| **다국어(i18n)** | `i18n.ts` + `locales/ko.json`, `en.json`. 홈 헤더 KO/EN 전환, 키오스크 전역 문구 번역. 언어는 `localStorage`(`kiosk-locale`) 저장 |
| **UI 안정성** | `Modal.tsx`: 포커스 트랩 시 `focusables[0]` / `focusables[length-1]` undefined 체크 추가 (TS 빌드 오류 해결) |

### 백오피스

| 항목 | 구현 내용 |
|------|-----------|
| **메뉴 등록하기 전용 페이지** | `/admin/menu/register` 라우트 추가. 메뉴관리 하위에 "상품 관리", "메뉴 등록하기", "카테고리 설정" 구분. **상품 관리** 탭에서는 "메뉴 등록" 버튼 제거 |
| **사이드바 활성 탭 정확 매칭** | `AdminLayout.tsx`: "상품 관리"(`/admin/menu`) 링크에 `end` 적용 → "메뉴 등록하기" 페이지일 때 상품 관리 탭이 활성화되지 않음 |
| **디저트류 영양정보** | `AdminMenuRegister.tsx`: 카테고리명이 디저트/베이커리일 때 **열량 및 영양정보** 블록 노출. 열량·탄수화물·당류·단백질·지방·포화지방·나트륨 테이블 입력, JSON으로 저장 |
| **옵션 기본값/새 옵션** | **기본값 설정** 체크 시 해당 카테고리 상품이 쓰는 옵션 ID 목록 불러와 체크리스트에 반영. 미체크 시 **옵션 추가** 칸(고정)에서 카테고리·옵션명·추가금 입력 후 새 옵션 생성(POST option-groups/:id/options). 옵션 목록은 체크리스트 형태로 통일 |
| **관리자 옵션 API** | `GET /api/admin/option-groups`, `GET /api/admin/categories/:categoryId/default-options`, `POST /api/admin/option-groups/:id/options`, `POST /api/admin/products/:id/options` |


