# 코드 컨벤션

> 상태: **제안**. Git(커밋·브랜치·PR) 규칙은 [git-convention.md](git-convention.md)를 따른다.

## 네이밍

| 대상               | 규칙                        | 예시                               |
| ------------------ | --------------------------- | ---------------------------------- |
| 컴포넌트 파일·이름 | PascalCase                  | `LoginForm.tsx`                    |
| 훅                 | `use` 접두사 + camelCase    | `useAuth.ts`                       |
| 일반 함수·변수     | camelCase                   | `formatDate`                       |
| 상수               | UPPER_SNAKE_CASE            | `API_BASE_URL`                     |
| 타입·인터페이스    | PascalCase, `I` 접두사 없음 | `User`                             |
| 일반 파일·폴더     | kebab-case                  | `api-client.ts`, `workout-report/` |

## 컴포넌트

- 함수 컴포넌트만 사용한다.
- 한 파일에는 컴포넌트 하나를 둔다.
- props 타입은 컴포넌트 파일 안에서 정의한다.
- 서버 데이터는 TanStack Query로 가져오고, 컴포넌트 안에서 직접 `fetch`하지 않는다.
- API 호출 함수는 `api/` 계층에 모으고 컴포넌트에서 URL을 직접 쓰지 않는다.

## TypeScript

- `any`는 쓰지 않는다. 불가피하면 이유를 주석으로 남긴다.
- API 응답은 타입을 정의해서 사용한다.

## 환경 변수

- 비밀 값은 코드와 저장소에 넣지 않는다.
- Vite의 `VITE_` 접두사 변수는 브라우저에 그대로 노출된다. 비밀 값을 넣지 않는다.
- 필요한 변수 목록은 `.env.example`에 값 없이 적는다.

## 테스트

- 기능을 추가하거나 변경하면 테스트를 함께 작성한다.
- 테스트 파일은 대상 파일 옆에 `*.test.ts(x)`로 둔다.

## 린트·포맷

- ESLint와 Prettier 설정을 따르고, 커밋 전에 `scripts/verify.sh`로 확인한다.
