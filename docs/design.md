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

글꼴은 시스템 글꼴(`-apple-system`, `SF Pro KR`, `Apple SD Gothic Neo`, `Noto Sans KR`, `Malgun Gothic`) 순이다. 별도 웹폰트는 쓰지 않는다.

## 공통 컴포넌트 (`src/shared/components`)

| 컴포넌트 | 역할 |
| --- | --- |
| `Button` | 알약형 버튼. `variant`(`primary`/`secondary`), `size`(`md`/`sm`). `type` 기본값은 `button` |
| `TextField` | 라벨·힌트·에러가 연결된 입력. 에러는 `role="alert"` |
| `Notice` | 폼 전체 메시지. 오류는 `alert`, 성공은 `status` |
| `TextLink` | 라우터 링크의 텍스트 링크 스타일 |
| `PageShell` | 큰 제목과 설명 아래 흰 카드를 두는 화면 틀 |
| `LoadingScreen` | 세션 복구 중 표시 |

앱 공통 틀은 `src/app/AppLayout.tsx`(반투명 상단 내비게이션 `SiteHeader` + 회색 배경)다.

## 접근성

- 포커스 링은 전역 `:focus-visible`로 `accent` 색을 쓴다.
- 입력의 에러·힌트는 `aria-describedby`로 연결하고, 에러는 `aria-invalid`를 함께 쓴다.
- 운동 경험 선택은 시각적으로 알약 버튼이지만 실제로는 라디오 그룹(`fieldset`)이다.
- 흰 바탕 위 `accent`, `ink-secondary` 텍스트는 일반 텍스트 대비 기준(4.5:1)을 넘기는 값만 쓴다.

## 미정

- 다크 모드, 로고, 아이콘
- 공식 디자인 시안이 나온 뒤 토큰 값과 컴포넌트 모양 교체
