# 디자인

> 상태: **임시**. 공식 디자인이 나오기 전까지 [apple.com/kr](https://www.apple.com/kr/)의 절제된 스타일을 레퍼런스로 삼는다. 학습용 프로젝트라 스타일 언어만 참고하며, 로고·이미지·문구 같은 자산은 사용하지 않는다.

## 방향

- 흰 바탕과 연회색 영역, 넉넉한 여백, 크고 굵은 제목
- 파란 알약형 주 버튼과 파란 테두리 보조 버튼
- 둥근 흰 카드(`rounded-3xl`)와 둥근 입력(`rounded-xl`), 그림자는 최소한으로

## 토큰

[src/index.css](../src/index.css)의 `@theme`에 정의한다. 색을 직접 쓰지 않고 아래 토큰 클래스를 쓴다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `ink` | `#1d1d1f` | 본문·제목 |
| `ink-secondary` | `#6e6e73` | 보조 설명, 힌트 |
| `surface` | `#f5f5f7` | 화면 배경 |
| `line` | `#d2d2d7` | 입력·구분 테두리 |
| `accent` / `accent-hover` | `#0071e3` / `#0077ed` | 주 버튼, 선택 상태, 포커스 |
| `link` | `#0066cc` | 텍스트 링크 |
| `danger` / `success` | `#d70015` / `#248a3d` | 오류 / 성공 메시지 |

한글은 어절 단위로 줄바꿈한다(`word-break: keep-all`). 글꼴은 시스템 글꼴(`-apple-system`, `SF Pro KR`, `Apple SD Gothic Neo`, `Noto Sans KR`, `Malgun Gothic`) 순이다. 별도 웹폰트는 쓰지 않는다.

## 공통 컴포넌트 (`src/shared/components`)

| 컴포넌트 | 역할 |
| --- | --- |
| `Button` | 알약형 버튼. `variant`(`primary`/`secondary`), `size`(`md`/`sm`). `type` 기본값은 `button` |
| `TextField` | 라벨·힌트·에러가 연결된 입력. 에러는 `role="alert"` |
| `Notice` | 폼 전체 메시지. 오류는 `alert`, 성공은 `status` |
| `ButtonLink` | 화면 이동용 링크를 `Button`과 같은 알약 모양으로 보여줌 (`button-styles.ts`에서 모양 공유) |
| `TextLink` | 라우터 링크의 텍스트 링크 스타일 |
| `ConfirmDialog` | 확인이 필요한 동작(로그아웃, 탈퇴)용 모달. 취소에 초기 포커스, Esc·배경 클릭으로 닫기, Tab 순환, 닫으면 포커스 복원, 스크롤 잠금, 나타나고 사라지는 전환 애니메이션. 요청 중(`pending`)에는 닫히지 않음. `tone="danger"`는 빨간 확인 버튼 |
| `PageShell` | 큰 제목과 설명 아래 흰 카드를 두는 화면 틀 |
| `LoadingScreen` | 세션 복구 중 표시 |

앱 공통 틀은 `src/app/AppLayout.tsx`(반투명 상단 내비게이션 `SiteHeader` + 회색 배경 + `SiteFooter`)다. `SiteFooter`는 모든 화면에 의학적 면책 문구를 보여준다.

## 랜딩 페이지

`/`의 랜딩은 `src/features/landing`의 섹션(`LandingHero`, `FeatureTiles`, `HowItWorks`, `FinalCta`)을 `pages/LandingPage.tsx`에서 조합한다. 흰색과 회색 섹션을 번갈아 배치하고, 로그인 상태는 페이지가 읽어 버튼(`actions`)만 넘긴다. 세션을 복구하는 동안에는 버튼 자리를 비워 두어 잘못된 버튼이 잠깐 보이지 않게 한다. 기능 소개 문구는 기획 기준이라 구현 상태에 맞춰 갱신해야 한다.

## 화면 폭

- 기본 화면은 **모바일 폭의 단일 컬럼**(`max-w-md` 카드)이다. 데스크톱 전용 요구사항은 없어서 대부분의 화면은 이 모양 그대로 쓴다.
- 화면별로 필요할 때만 `lg`(1024px 이상) 변형으로 넓은 레이아웃을 추가한다. 좁은 화면의 모양은 바꾸지 않는다. 지금은 `/me`가 그렇다.
  - `PageShell`의 `wide`: 컨테이너를 `max-w-5xl`로 넓히고 제목을 왼쪽에 두며, 카드는 children이 직접 만든다.
  - `/me`: 왼쪽 프로필 요약 카드(`ProfileSummary`, 좁은 화면에서는 숨김) + 오른쪽 정보·탈퇴 카드. 수정 폼은 닉네임·출산 예정일을 2열로 배치하고 버튼을 오른쪽으로 정렬한다.
- 새 화면은 데스크톱 기준으로 설계하되 단일 컬럼과 최대 폭 제한을 유지해, 좁은 창에서도 깨지지 않게 한다.

## 모션

- 모달처럼 나타나고 사라지는 요소는 `shared/lib/useTransitionState`로 마운트 시점을 조절한다. 열 때는 숨김 상태로 그린 뒤 다음 프레임에 보이게 하고, 닫을 때는 전환이 끝난 뒤에 DOM에서 제거한다. 프레임이 멈추는 환경(백그라운드 탭 등)에서도 투명한 채 남지 않도록 타이머로도 보이게 한다.
- 모달은 들어올 때 200ms `ease-out`(배경 페이드, 패널은 살짝 작은 크기와 아래 8px에서 제자리로), 나갈 때 150ms `ease-in`이다. 나가는 동안 모달은 `inert`라서 눌리거나 포커스를 받지 않는다.
- Tailwind v4의 `scale-*`, `translate-*`는 `transform`이 아니라 개별 속성이므로 전환 대상에 `scale`, `translate`를 명시해야 한다(`transition-[opacity,scale,translate]`).
- **화면 전환**: `src/app/PageTransition.tsx`가 공통 레이아웃(`AppLayout`)에서 화면 내용을 감싸, 경로가 바뀔 때 새 화면이 아래 6px에서 올라오며 220ms 동안 `ease-out`으로 나타난다. 키프레임은 `index.css`의 `--animate-page-in`이다. 경로(`pathname`)를 `key`로 쓰므로 같은 경로 안의 변화(입력, 세션 복구 후 내용 교체)에는 다시 재생되지 않는다. 헤더와 푸터는 감싸는 영역 밖이라 움직이지 않는다. 나가는 화면은 애니메이션 없이 바로 사라진다(이동이 느려지거나 겹쳐 보이지 않게 하려는 선택이다). 새 화면은 별도 설정 없이 자동 적용된다.
- OS의 "동작 줄이기"(`prefers-reduced-motion`)가 켜져 있으면 전환 없이 즉시 나타나고 사라진다.

## 입력 검증 표시

- 회원가입 폼은 **입력칸을 한 번 벗어난 뒤부터** 형식이 맞지 않으면 테두리와 안내를 `danger` 색으로 바꾸고(`aria-invalid` 포함), 고치는 즉시 사라진다. 입력하는 도중에는 보여주지 않아 빨갛게 깜빡이지 않는다.
- 값이 비어 있으면 벗어나도 보여주지 않고 **제출할 때만** 안내한다. 제출·서버 오류가 있으면 그것을 먼저 보여준다.
- 모든 입력칸에는 예시 문구(`placeholder`)를 둔다. 힌트(`hint`)는 규칙 설명으로 따로 유지한다.
- 검사 규칙은 `features/auth/validation.ts`에 있고 백엔드 규칙과 맞춘다. 서버가 최종 판단한다.

## 접근성

- 포커스 링은 전역 `:focus-visible`로 `accent` 색을 쓴다.
- 입력의 에러·힌트는 `aria-describedby`로 연결하고, 에러는 `aria-invalid`를 함께 쓴다.
- 운동 경험 선택은 시각적으로 알약 버튼이지만 실제로는 라디오 그룹(`fieldset`)이다.
- 흰 바탕 위 `accent`, `ink-secondary` 텍스트는 일반 텍스트 대비 기준(4.5:1)을 넘기는 값만 쓴다.

## 미정

- 다크 모드, 로고, 아이콘
- 공식 디자인 시안이 나온 뒤 토큰 값과 컴포넌트 모양 교체
