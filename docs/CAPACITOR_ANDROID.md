# Capacitor Android 래핑 및 실기기 연동

프론트엔드(`client`)를 Capacitor로 Android 앱 래핑하고, 실기기에서 같은 Wi-Fi의 PC 백엔드(3001)에 접속하는 방법입니다.

## 중요: cap 명령어 실행 위치

**모든 `npx cap ...` 명령어는 반드시 프론트엔드 폴더(`client`) 안에서 실행해야 합니다.**

```bash
cd client
npx cap add android
npx cap sync
npx cap open android
```

---

## 1. Capacitor 기본 설정 (이미 적용됨)

- **의존성**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (client/package.json)
- **설정**: `client/capacitor.config.ts`
  - `appId`: `com.example.app`
  - `appName`: Kiosk
  - `webDir`: `dist`
- **플랫폼 추가**: `client` 폴더에서 한 번만 실행  
  `npx cap add android`

---

## 2. 실기기 백엔드 연동

### 환경 변수 (VITE_API_URL)

- **로컬 개발**: `.env.development` 또는 루트 `.env`에서 비워 두면 Vite 프록시(`/api` → localhost:3001) 사용.
- **실기기 빌드**: API 서버 주소를 넣어야 합니다.
  - **방법 A** – 루트 `.env`에 설정 후 device 모드 빌드:
    ```bash
    # .env (프로젝트 루트)
    VITE_API_URL=http://10.140.140.171:3001
    ```
    그 다음 `client`에서:
    ```bash
    npm run build:device
    ```
  - **방법 B** – 빌드 시 한 번만 지정 (기본값은 `http://172.30.1.71:3001`):
    ```bash
    VITE_API_URL=http://10.140.140.171:3001 npm run build:device
    ```
- **PC IP 확인**: Windows CMD에서 `ipconfig`, 해당 Wi-Fi의 IPv4 주소를 사용합니다.

### 백엔드 수신 주소 (0.0.0.0)

서버는 이미 `0.0.0.0`으로 listen 하도록 설정되어 있습니다. (환경 변수 `HOST` 없으면 `0.0.0.0` 사용)

### CORS

백엔드는 `origin: '*'`, `credentials: false`로 설정되어 있어 모든 기기에서 접근 가능합니다.

---

## 3. Android 네이티브 최적화 (Java 17, HTTP, Mixed Content)

`npx cap add android` 실행 후 아래를 적용합니다.

### 3.1 Gradle – Java 17 고정

**파일**: `client/android/build.gradle` (또는 `client/android/variables.gradle`)

- **루트 `build.gradle`**의 `subprojects` 블록에 다음이 있는지 확인하고, 없으면 추가:

```gradle
subprojects { subproject ->
    afterEvaluate {
        if (subproject.hasProperty('android')) {
            subproject.android {
                compileOptions {
                    sourceCompatibility JavaVersion.VERSION_17
                    targetCompatibility JavaVersion.VERSION_17
                }
            }
        }
    }
}
```

- **앱 모듈** `client/android/app/build.gradle`의 `android { ... defaultConfig { ... } }` 블록 안 또는 `compileOptions`에:

```gradle
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}
```

### 3.2 AndroidManifest – Cleartext 허용

**파일**: `client/android/app/src/main/AndroidManifest.xml`

`<application>` 태그에 다음 추가:

```xml
android:usesCleartextTraffic="true"
```

(이미 `networkSecurityConfig`를 쓰면 아래 3.3과 함께 사용)

### 3.3 network_security_config.xml (Cleartext 허용 도메인)

1. `client/android/app/src/main/res/xml` 폴더가 없으면 생성합니다.
2. `client/android-res/xml/network_security_config.xml` 내용을  
   `client/android/app/src/main/res/xml/network_security_config.xml`로 복사합니다.
3. **PC IP가 다르면** 복사한 파일에서 `<domain>10.140.140.171</domain>`을 본인 PC IP로 수정하거나, 도메인을 추가합니다.

**AndroidManifest.xml**의 `<application>`에 다음 추가 (이미 있으면 수정):

```xml
android:networkSecurityConfig="@xml/network_security_config"
```

### 3.4 MainActivity – Mixed Content 허용

**파일**: `client/android/app/src/main/java/com/example/app/MainActivity.java`  
(패키지 경로는 `appId`에 따라 `com/example/app` 또는 `com/example/kiosk` 등일 수 있습니다.)

`BridgeActivity`를 상속한 `MainActivity`에서 WebView 설정을 오버라이드합니다.  
Capacitor 6에서는 `BridgeActivity`가 내부 WebView를 사용하므로, `onCreate`에서 다음처럼 설정합니다:

```java
import android.os.Bundle;
import android.webkit.WebSettings;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Mixed Content (HTTP 이미지 등) 허용
        getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
```

`getBridge().getWebView()`가 null일 수 있으면, `getBridge()`가 준비된 뒤(예: `runOnUiThread` 또는 리스너)에 호출하도록 합니다.

---

## 4. 이미지 로드 (이미 적용됨)

- **resolveApiImageUrl**: `client/src/utils/resolveApiImageUrl.ts`  
  - localhost, 127.0.0.1, 상대 경로(`/uploads/...`)를 현재 API 베이스 URL로 치환합니다.
- **ApiImage**: `client/src/components/ui/ApiImage.tsx`  
  - fetch → blob → `URL.createObjectURL()`로 로드해 WebView에서 이미지 로딩 문제가 있을 때 사용합니다.

---

## 5. 빌드 및 실행 순서

1. **client** 폴더로 이동:
   ```bash
   cd client
   ```
2. **실기기용 빌드** (PC IP 반영 후):
   ```bash
   # 루트 .env에 VITE_API_URL 설정했으면
   npm run build:device
   # 또는 한 번만 지정
   set VITE_API_URL=http://10.140.140.171:3001
   npm run build:device
   ```
3. **Capacitor 동기화** (반드시 client 폴더에서):
   ```bash
   npx cap sync
   ```
4. **Android Studio 열기**:
   ```bash
   npx cap open android
   ```
5. **실기기 접속 조건**:
   - PC와 모바일이 **같은 Wi-Fi**
   - Windows 방화벽에서 **백엔드 포트(3001) 인바운드 허용**
   - 백엔드 서버 실행 중: 루트에서 `npm run dev:server` 또는 `npm run dev`

---

## 6. Android Studio에서 Run으로 구동

1. `npx cap open android`로 Android Studio가 열리면, **android** 프로젝트가 로드됩니다.
2. 상단 툴바에서 **실기기** 또는 **에뮬레이터**를 선택합니다.
3. **Run (▶)** 버튼을 눌러 앱을 빌드·설치·실행합니다.
4. **빌드 실패 시**:  
   - **File → Sync Project with Gradle Files**  
   - 위 3.1~3.4 항목(Java 17, Cleartext, network_security_config, MainActivity Mixed Content) 적용 여부 확인

---

## 요약 체크리스트

- [ ] `client`에서 `npm install` 후 `npx cap add android` 실행
- [ ] `client`에서만 `npx cap sync`, `npx cap open android` 실행
- [ ] PC IP 확인 후 `VITE_API_URL` 설정하고 `npm run build:device`
- [ ] 백엔드 0.0.0.0 listen, CORS `*` 적용 확인
- [ ] Android: Java 17, usesCleartextTraffic, network_security_config, MainActivity Mixed Content 적용
- [ ] Android Studio에서 Run으로 실기기/에뮬레이터 구동
