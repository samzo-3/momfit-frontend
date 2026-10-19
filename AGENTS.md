# MomFit Frontend

임산부를 위한 홈트레이닝 서비스 **맘핏(MomFit)** 의 프론트엔드 저장소.
웹캠으로 사용자 자세를 실시간 분석하고, 피드백·리포트·개인 맞춤 정보를 제공한다.

## 기술 스택

- React 19 + TypeScript, Vite, Node 24
- React Router, TanStack Query(서버 상태), Zustand(클라이언트 상태), Tailwind CSS, Recharts
- 테스트: Vitest + React Testing Library, 린트·포맷: ESLint + Prettier
- 자세 인식: **미정** (담당자 확정 후 기재)
- 백엔드: FastAPI (별도 저장소), 배포: Vercel
- 상세와 선택 이유는 [docs/tech-stack.md](docs/tech-stack.md)

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 + 프로덕션 빌드 |
| `npm test` | 테스트 실행 (`npm run test:watch`는 watch 모드) |
| `npm run lint` | ESLint |
| `npm run format` / `format:check` | Prettier 적용 / 검사 (`*.md`, `.github`는 제외) |
| `./scripts/verify.sh` | 서식 검사 → 린트 → 테스트 → 빌드 (커밋·PR 전 실행) |

## 주요 기능

1. 운동 모드: 웹캠 기반 실시간 자세 분석 및 피드백
2. 자세 코칭 모드: 스텝별 음성 코칭
3. 개인 맞춤: AI 에이전트 기반 정보 제공
4. 대시보드: 운동 기록·리포트 시각화
5. 인증: 로그인/회원가입

## 문서

상세 설계와 결정 사항은 `docs/`에 둔다. 작업 전에 관련 문서를 먼저 읽는다.

## 규칙

- 비밀 값(API 키 등)은 코드에 넣지 않고 환경 변수로 주입한다.
- 웹캠 영상과 임신 주차 등 건강 정보는 민감정보로 취급한다. 영상은 저장·전송하지 않고, 필요한 최소 정보만 서버로 보낸다.
- 의학적 조언처럼 보이는 문구는 면책 문구 또는 전문의 상담 안내와 함께 노출한다.
- 기능을 변경·추가하면 해당 테스트를 함께 작성한다.
- 완료 선언 전에 `./scripts/verify.sh`를 실행해 통과를 확인한다.
- 커밋·브랜치·PR 규칙은 [docs/git-convention.md](docs/git-convention.md)를 따른다. 커밋 메시지는 `<작업 타입>: <작업 내용>` 형식이며(scope 없음), 이 규칙이 전역 설정의 Conventional Commits 규칙보다 우선한다.
  - 브랜치: `main` / `develop` / `feature/기능명`(소문자, 하이픈 구분). 기능 브랜치는 `develop`에서 분기한다.
  - PR: `develop` 대상, 제목은 커밋과 같은 형식, Squash and Merge로 병합 후 브랜치 삭제.
