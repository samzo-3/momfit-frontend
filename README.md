# MomFit Frontend


## 기술 스택

| 구분 | 기술 | 현재 사용 용도 |
| --- | --- | --- |
| UI | React 19 | 컴포넌트 기반 화면 구성 |
| 언어 | TypeScript 6 | 타입 안전한 프론트엔드 코드 작성 |
| 빌드·개발 서버 | Vite 8 | 개발 서버와 프로덕션 빌드 |
| 라우팅 | React Router 7 | 페이지 라우팅과 인증 상태별 접근 제어 |
| 서버 상태 | TanStack Query 5 | 인증 관련 조회·변경 요청의 상태 처리 |
| 클라이언트 상태 | Zustand 5 | access token과 사용자 세션 상태 관리 |
| 스타일 | Tailwind CSS 4 | 유틸리티 클래스 기반 스타일링 |
| 테스트 | Vitest 5, React Testing Library | 단위 및 컴포넌트 테스트 |
| 품질 도구 | ESLint 10, Prettier 3 | 정적 검사와 코드 포맷 |
| 런타임 | Node.js 24 | `.nvmrc` 및 `package.json`의 실행 환경 |

## 시작하기

```bash
npm install
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다. API 요청은 Vite 프록시를 통해 백엔드로 전달됩니다. 필요하면 `.env.example`을 참고해 `.env`에 아래 값을 설정합니다.

```env
API_PROXY_TARGET=http://localhost:8000
```


## 프로젝트 구조

실제 저장소에 존재하는 주요 경로만 표시했습니다. 테스트 파일은 해당 파일 옆의 `*.test.ts(x)` 형식으로 배치되어 있으며, 트리에서는 일부 생략했습니다.

```text
momfit-frontend/
├── public/
│   └── audio/
│   │   └── audio.mp3
├── docs/
│   ├── architecture.md
│   ├── auth-api.md
│   ├── directory-structure.md
│   ├── screens-and-routes.md
│   └── tech-stack.md
├── scripts/
│   └── verify.sh
├── src/
│   ├── app/
│   │   ├── AppLayout.tsx
│   │   ├── providers.tsx
│   │   ├── router.tsx
│   │   ├── routes.tsx
│   │   ├── SiteFooter.tsx
│   │   └── SiteHeader.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/auth-api.ts
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── store/auth-store.ts
│   │   │   ├── auth-session.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── home/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   ├── due-date.ts
│   │   │   └── pregnancy.ts
│   │   ├── landing/
│   │   │   └── components/
│   │   └── pose/
│   │       ├── analyzers/
│   │       │   ├── sideKick/
│   │       │   └── sideStep/
│   │       ├── api/
│   │       ├── common/
│   │       ├── components/
│   │       ├── mediapipe/
│   │       ├── modes/
│   │       ├── tracking/
│   │       └── voice-coaching/
│   ├── pages/
│   │   ├── AccountRestorePage.tsx
│   │   ├── AuthCallbackPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── MePage.tsx
│   │   ├── OnboardingPage.tsx
│   │   ├── PasswordResetPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── WorkoutsPage.tsx
│   ├── shared/
│   │   ├── api/
│   │   ├── components/
│   │   └── lib/
│   ├── test/
│   │   ├── render-app.tsx
│   │   └── setup.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── eslint.config.js
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 디렉터리 및 주요 파일 역할

| 경로 | 역할 | 관련 기능 |
| --- | --- | --- |
| `src/main.tsx` | React 앱을 마운트하고 인증 API 설정을 초기화 | 앱 시작, 인증 |
| `src/App.tsx` | 전역 Provider와 Router를 조합 | 앱 진입 |
| `src/app/routes.tsx` | 전체 경로와 공개·보호·온보딩 전용 라우트를 정의 | 라우팅, 접근 제어 |
| `src/app/providers.tsx` | TanStack Query Provider와 인증 초기화 컴포넌트를 제공 | 서버 상태, 세션 복구 |
| `src/app/AppLayout.tsx` | 헤더·본문·푸터의 공통 레이아웃을 구성 | 공통 화면 구조 |
| `src/app/SiteHeader.tsx` | 로그인 상태에 따라 내 정보·로그인·로그아웃 메뉴를 표시 | 전역 내비게이션 |
| `src/app/SiteFooter.tsx` | 모든 화면에 의학적 면책 문구를 표시 | 공통 안내 |
| `src/pages/` | 라우트 단위 화면에서 feature 컴포넌트를 조합 | 랜딩, 인증, 홈, 내 정보 |
| `src/pages/WorkoutsPage.tsx` | 아직 준비 중인 운동 목록 안내 화면 | 운동 진입(임시) |
| `src/features/auth/` | 인증 도메인의 API, 폼, 검증, 세션, 상태를 한곳에 관리 | 로그인, 회원가입, 온보딩, 프로필 |
| `src/features/auth/api/auth-api.ts` | 인증·사용자 API 요청과 서버 응답 변환을 담당 | 인증 API 연동 |
| `src/features/auth/auth-session.ts` | refresh token으로 세션을 복구하고 로그인·로그아웃 상태를 제어 | 세션 관리 |
| `src/features/auth/store/auth-store.ts` | 메모리 기반 access token과 사용자 정보를 Zustand로 관리 | 클라이언트 상태 |
| `src/features/auth/hooks/useAuthMutations.ts` | 로그인·가입·프로필 변경 등의 TanStack Query 훅 제공 | 서버 상태 |
| `src/features/home/` | 로그인 후 홈의 히어로, 출산 예정일·임신 주차 요약을 제공 | 홈 |
| `src/features/landing/` | 랜딩 페이지의 히어로·기능 소개·시작 안내 섹션 | 서비스 소개 |
| `src/features/pose/` | 자세 분석 기능을 위한 빈 디렉터리 구조와 `.gitkeep` 보관 | 향후 자세 인식 |
| `src/shared/components/` | 여러 feature와 page에서 재사용하는 버튼·입력칸·모달·캐러셀 등 | 공통 UI |
| `src/shared/api/api-client.ts` | `/api` 요청, Bearer 토큰 첨부, 토큰 만료 시 단일 refresh 재시도를 처리 | 공통 API 통신 |
| `src/shared/lib/useTransitionState.ts` | 전환 애니메이션에 맞춰 컴포넌트 마운트 상태를 제어 | 공통 UI 동작 |
| `src/test/` | 테스트 렌더링·설정 등 공통 테스트 도구 | 테스트 |
| `vite.config.ts` | React·Tailwind 플러그인, `/api` 개발 프록시, Vitest 환경을 설정 | 개발·테스트 환경 |
| `eslint.config.js` | TypeScript·React용 ESLint 규칙을 설정 | 코드 품질 |

### 공통 컴포넌트와 기능 전용 컴포넌트

- `src/shared/components/`는 버튼, 입력칸, 모달처럼 여러 화면에서 공통으로 쓰는 UI를 둡니다. `features/`에 의존하지 않습니다.
- `src/features/*/components/`는 특정 기능에만 필요한 화면 조각을 둡니다. 예를 들어 `auth/components`는 로그인·회원가입 폼, `landing/components`는 랜딩 섹션을 담당합니다.
- `src/pages/`는 라우트 화면을 구성하는 계층입니다. feature 간 데이터를 조합할 수 있지만, 기능별 로직은 가능한 한 `features/`에 둡니다.

## 라우팅

| 경로 | 화면 | 접근 조건 | 구현 상태 |
| --- | --- | --- | --- |
| `/` | 랜딩 | 누구나 | 구현됨 |
| `/login`, `/signup` | 로그인, 회원가입 | 비로그인 사용자 | 구현됨 |
| `/password/reset` | 비밀번호 재설정 | 비로그인 사용자 | 구현됨 |
| `/auth/callback` | 카카오 로그인 콜백 처리 | 누구나 | 구현됨 |
| `/account/restore` | 탈퇴 유예 계정 복구 | 비로그인 사용자 | 구현됨 |
| `/onboarding` | 카카오 가입자 추가 정보 입력 | 로그인했지만 온보딩 미완료 | 구현됨 |
| `/home` | 홈 | 로그인 사용자 | 구현됨 |
| `/workouts` | 운동 목록 안내 | 로그인 사용자 | 임시 구현 |
| `/me` | 내 정보 | 로그인 사용자 | 구현됨 |
| 그 외 | 404 페이지 | 누구나 | 구현됨 |

## API 및 상태 관리

- 모든 브라우저 요청은 `src/shared/api/api-client.ts`를 거쳐 상대 경로 `/api`로 전송됩니다.
- 개발 환경에서는 `vite.config.ts`의 프록시가 `/api` 요청을 `API_PROXY_TARGET`으로 전달합니다.
- access token은 Zustand 상태에만 보관하며, 새로고침 시 refresh 요청으로 세션을 복구합니다.
- 인증 API 요청은 `src/features/auth/api/auth-api.ts`에 모여 있습니다. UI 컴포넌트는 TanStack Query 훅을 통해 요청 상태를 사용합니다.
- 인증 실패 또는 refresh 실패 시 세션 상태를 초기화합니다.

## 관련 문서

| 문서 | 내용 |
| --- | --- |
| `docs/architecture.md` | 프론트엔드 아키텍처 초안과 배포·인증 관련 방향 |
| `docs/auth-api.md` | 인증 및 사용자 API 계약 |
| `docs/screens-and-routes.md` | 화면·라우트 설계 및 구현 상태 |
| `docs/directory-structure.md` | feature 중심 디렉터리 구성 규칙 |
| `docs/tech-stack.md` | 팀이 정한 기술 스택과 미정 항목 |
| `docs/conventions.md` | 코드 컨벤션 |
| `docs/git-convention.md` | 브랜치·커밋·PR 규칙 |

## 테스트와 검사

```bash
npm run format:check
npm run lint
npm test
npm run build
```

프로젝트에는 위 검사를 순서대로 실행하는 `scripts/verify.sh`도 있습니다.
