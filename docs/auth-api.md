# 인증 API 계약

> 상태: **제안**. 프론트엔드와 백엔드가 함께 쓰는 계약이다. 변경하면 양쪽 담당자가 같이 갱신한다.
> 인증/인가 담당자가 프론트와 백엔드를 모두 맡으므로, 이 문서가 두 구현의 기준이다.

## 범위

- 로컬 로그인: 아이디 + 비밀번호 (이메일 인증 필수)
- 소셜 로그인: 카카오 (닉네임만 수집, 이메일 미수집)
- 네이버 등 다른 provider는 나중에 추가한다. 경로를 `/auth/{provider}/...` 형태로 일반화해 두고, 현재는 `kakao`만 허용한다.
- 로컬 계정과 카카오 계정의 자동 연동은 하지 않는다. 같은 사람이 각각 가입하면 별개 계정이다.

## 핵심 결정

| 결정 | 내용 | 이유 |
| --- | --- | --- |
| access token | JWT, 수명 15분, 프론트 **메모리**(Zustand, persist 안 함)에만 보관 | localStorage는 XSS로 탈취될 수 있다. 건강정보를 다루는 서비스라 보수적으로 간다. |
| refresh token | **httpOnly + Secure + SameSite=Lax 쿠키**, 수명 14일, 사용할 때마다 교체(rotation) | JS에서 접근할 수 없고, 탈취돼도 재사용을 탐지할 수 있다. |
| 도메인 | Vercel **rewrites**로 `/api/*`를 백엔드에 프록시해 브라우저 입장에서 same-origin으로 만든다 | CORS와 `SameSite=None` 문제를 피하고, 카카오 콜백 후 쿠키 설정도 단순해진다. 백엔드는 HTTPS여야 한다. |
| 새로고침 | 앱 시작 시 `POST /auth/refresh`로 access를 복구한다 | access를 저장하지 않기 때문이다. |
| 사용자 식별 | `users`(프로필)와 `auth_identities`(`provider`, `provider_user_id`, 로컬은 `login_id`, `password_hash`)로 분리 | provider 추가와 계정 연동 시 스키마 변경을 피한다. |
| 임신 정보 | 입력과 저장은 `due_date`(출산 예정일)만 받고, `pregnancy_week`는 서버가 계산해서 내려준다 ([계산 규칙](#임신-주차-계산-규칙)) | 주차는 매주 바뀌므로 숫자로 저장하면 틀린 값이 된다. 입력으로도 받지 않아 두 값이 어긋날 수 없다. |
| 비밀번호 | argon2 또는 bcrypt 해시 | |

## 엔드포인트

공통 prefix는 `/api`이다.

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/auth/email/send-code` | 이메일로 6자리 인증 코드 발송 | - |
| POST | `/auth/email/verify-code` | 코드 검증, `email_verification_token` 발급 | - |
| GET | `/auth/check-login-id` | 아이디 중복 확인 (`?login_id=`) | - |
| POST | `/auth/signup` | 로컬 가입 (프로필·동의 포함). 성공하면 로그인 처리 | - |
| POST | `/auth/login` | 아이디/비밀번호 로그인 | - |
| POST | `/auth/password/reset` | 이메일 인증 후 비밀번호 재설정 | - |
| GET | `/auth/kakao/login` | 카카오 인가 페이지로 302 (state 쿠키 설정) | - |
| GET | `/auth/kakao/callback` | 코드 교환, 사용자 upsert, refresh 쿠키 설정, 프론트로 302 | - |
| POST | `/auth/refresh` | access 발급, refresh 교체 | 쿠키 |
| POST | `/auth/logout` | refresh 폐기, 쿠키 삭제 | 쿠키 |
| GET | `/users/me` | 내 프로필과 온보딩 상태 | Bearer |
| PATCH | `/users/me` | 프로필 수정 | Bearer |
| POST | `/users/me/onboarding` | 카카오 가입자의 동의·초기 프로필 제출 | Bearer |
| DELETE | `/users/me` | 회원 탈퇴 (카카오 계정은 연결 해제 포함) | Bearer |

보호 API는 `Authorization: Bearer <access_token>` 헤더를 쓴다. 온보딩이 끝나지 않은 사용자가 `/users/me`, `/users/me/onboarding`, `/auth/*` 이외의 API를 호출하면 `403 ONBOARDING_REQUIRED`를 반환한다.

## 로컬 가입 흐름

이메일 인증은 가입 **전에** 끝낸다. 인증 전 상태의 계정 행은 만들지 않는다.

```
1. POST /auth/email/send-code    { email, purpose: "signup" }
2. POST /auth/email/verify-code  { email, code, purpose: "signup" }
   → { email_verification_token }          // 30분 유효 JWT, email 클레임 포함
3. GET  /auth/check-login-id?login_id=...  // 가입 폼에서 중복 확인
4. POST /auth/signup  { ..., email, email_verification_token }
   → 서버가 토큰의 email과 요청의 email이 같은지 검증하고 계정 생성
   → access 반환 + refresh 쿠키 설정 (onboarding_completed = true)
```

### 인증 코드 규칙

- 6자리 숫자, 해시로 저장, 10분 유효.
- 5회 틀리면 해당 코드를 무효화한다.
- 재발송은 60초 간격, 이메일당 하루 5회, IP당 제한도 둔다 (`429 RATE_LIMITED`).
- 이미 로컬 계정이 있는 이메일은 가입 단계에서 `409 EMAIL_EXISTS`로 거절한다. 발송 단계에서는 계정 존재 여부를 드러내지 않도록 항상 200을 반환한다.

## 카카오 로그인 흐름

백엔드가 Authorization Code 흐름을 처리한다. 프론트는 이동만 한다. client secret은 백엔드에만 둔다.

```
1. 프론트: location.href = '/api/auth/kakao/login'
2. 백엔드: state 생성(+쿠키 저장) → 카카오 인가 URL로 302
3. 사용자 동의 → 카카오가 /api/auth/kakao/callback?code&state 로 리다이렉트
4. 백엔드: state 검증 → code로 토큰 교환 → 프로필 조회 → 사용자 upsert
           → refresh 쿠키 설정 → 프론트 /auth/callback 으로 302
5. 프론트 /auth/callback: POST /auth/refresh → access 획득 → GET /users/me
           → onboarding_completed ? "/" : "/onboarding"
```

- 첫 로그인이면 계정을 만들고 `onboarding_completed=false`로 둔다. 수집하는 값은 `provider_user_id`와 닉네임뿐이다.
- 실패하면 백엔드가 `/login?error=<code>`로 보낸다. 코드는 `access_denied`(사용자 취소), `state_mismatch`, `provider_error`다.
- 카카오 콘솔의 Redirect URI는 `localhost`와 운영 도메인만 등록한다. Vercel 프리뷰 URL에서는 카카오 로그인을 테스트할 수 없다.

## 스키마

### 요청

```jsonc
// POST /auth/email/send-code
{ "email": "a@b.com", "purpose": "signup" }          // purpose: "signup" | "password_reset"

// POST /auth/email/verify-code
{ "email": "a@b.com", "code": "123456", "purpose": "signup" }

// POST /auth/signup
{
  "login_id": "momfit01",                 // 영문 소문자·숫자 4~20자, 대소문자 구분 없이 유일
  "password": "...",                      // 8자 이상, 영문+숫자
  "nickname": "맘핏",
  "email": "a@b.com",
  "email_verification_token": "...",
  "due_date": "2026-12-24",
  "exercise_level": "low",                // "low" | "medium" | "high" (화면 표시: 하/중/상)
  "consents": { "terms": true, "health_data": true }   // 둘 다 true여야 함
}

// POST /auth/login
{ "login_id": "momfit01", "password": "..." }

// POST /auth/password/reset  (purpose "password_reset"으로 받은 토큰)
{ "email": "a@b.com", "email_verification_token": "...", "new_password": "..." }

// POST /users/me/onboarding  (카카오 가입자)
{
  "nickname": "맘핏",
  "due_date": "2026-12-24",
  "exercise_level": "low",
  "consents": { "terms": true, "health_data": true }
}

// PATCH /users/me  (바꿀 필드만)
{ "nickname": "...", "due_date": "...", "exercise_level": "..." }
```

### 응답

```jsonc
// POST /auth/email/verify-code
{ "email_verification_token": "...", "expires_in": 1800 }

// GET /auth/check-login-id
{ "available": true }

// POST /auth/signup, /auth/login, /auth/refresh  (refresh 토큰은 Set-Cookie)
{ "access_token": "...", "token_type": "bearer", "expires_in": 900 }

// GET /users/me
{
  "id": 1,
  "provider": "local",                    // "local" | "kakao"
  "login_id": "momfit01",                 // 카카오는 null
  "nickname": "맘핏",
  "email": "a@b.com",                     // 카카오는 null
  "due_date": "2026-12-24",
  "pregnancy_week": 28,                   // due_date에서 계산, due_date가 없으면 null
  "exercise_level": "medium",
  "onboarding_completed": true
}
```

`/auth/email/send-code`, `/auth/password/reset`, `/auth/logout`, `DELETE /users/me`는 본문 없이 `204`를 반환한다.

## 임신 주차 계산 규칙

`pregnancy_week`는 **백엔드만** 계산한다. 프론트는 `GET /users/me`의 값을 표시만 하고 다시 계산하지 않는다.

```
임신 일수 = 280 − (due_date − 오늘)        # 40주 = 280일
pregnancy_week = 임신 일수 ÷ 7 (내림)        # "28주 3일"이면 28
```

- 오늘은 `Asia/Seoul` 기준 날짜다. UTC로 계산하면 자정 전후에 하루가 어긋난다.
- 임신 일수가 음수이면 `null`, 계산값이 42를 넘으면 `42`로 고정한다. 예정일이 지나도 앱은 계속 쓸 수 있어야 한다.
- 입력 검증: `due_date`는 오늘 이후이고 오늘 + 280일 이내여야 한다. 벗어나면 `422 VALIDATION_ERROR`.
- 경계값(0주, 39주 6일, 40주, 예정일 다음 날, 음수)은 백엔드 테스트로 고정한다.

## 에러 형식

모든 API가 같은 형식을 쓴다. 검증 오류(422)는 `fields`를 추가한다.

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "아이디 또는 비밀번호가 올바르지 않습니다." } }
```

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": { "password": "8자 이상이어야 합니다." } } }
```

| HTTP | code | 프론트 동작 |
| --- | --- | --- |
| 401 | `TOKEN_EXPIRED` | `/auth/refresh`를 1회 시도하고 원 요청을 재시도 |
| 401 | `REFRESH_INVALID` | 인증 상태를 초기화하고 `/login`으로 이동 |
| 401 | `INVALID_CREDENTIALS` | 폼에 에러 표시. 아이디가 없는 경우와 비밀번호가 틀린 경우에 같은 메시지를 쓴다 |
| 400 | `CODE_INVALID` | 인증 코드 입력 에러 표시 |
| 400 | `CODE_EXPIRED` | 코드 재발송 안내 |
| 400 | `EMAIL_TOKEN_INVALID` | 이메일 인증을 처음부터 다시 진행 |
| 403 | `ONBOARDING_REQUIRED` | `/onboarding`으로 이동 |
| 409 | `LOGIN_ID_EXISTS` | 가입 폼 에러 |
| 409 | `EMAIL_EXISTS` | 가입 폼 에러 |
| 422 | `VALIDATION_ERROR` | 필드별 에러 표시 |
| 429 | `RATE_LIMITED` | 잠시 후 다시 시도하라는 안내. 로그인 실패 횟수 제한에도 쓴다 |

## 프론트엔드 구현 메모

- `shared/api`의 fetch 클라이언트가 Bearer 헤더를 붙이고, `TOKEN_EXPIRED`를 받으면 refresh를 한 번만 시도한다. 동시에 여러 요청이 401을 받아도 refresh는 한 번만 보내고 나머지는 결과를 기다린다.
- 인증 상태는 `features/auth`의 Zustand 스토어가 가진다. 다른 feature에는 `useAuth()`와 access token getter만 공개한다.
- 보호 라우트는 [screens-and-routes.md](screens-and-routes.md)의 규칙을 따른다. 추가로 `onboarding_completed=false`이면 `/onboarding` 외 보호 경로를 막는다.
- 개발 환경에서는 Vite proxy로 `/api`를 백엔드에 연결해 운영과 같은 same-origin 구조를 유지한다.

## 백엔드 구현 메모

- 비밀 값(`JWT_SECRET`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, SMTP 설정)은 모두 환경 변수로 주입한다.
- 이메일 발송은 교체 가능한 인터페이스로 만든다. 개발과 테스트는 콘솔 출력 메일러, 운영은 SES 등 발송 서비스를 쓴다.
- 인증 코드는 MySQL 테이블(해시, 만료 시각, 시도 횟수)에 저장한다.
- refresh token은 서버에 해시로 저장해 rotation과 재사용 탐지, 비밀번호 재설정·탈퇴 시 일괄 폐기를 지원한다.
- 회원 탈퇴 시 건강정보를 포함한 사용자 데이터를 삭제하고, 카카오 계정은 연결 해제(unlink)를 호출한다.

## 미정 / 이후 범위

- 네이버 로그인
- 로컬 계정과 카카오 계정 연동 (로그인 상태에서 "카카오 연결" 방식)
- `due_date`와 `exercise_level`를 운동 담당자도 쓰는지 확인 (쓴다면 이 스키마가 공유 계약이 된다)
- 개인정보 처리방침과 약관 문구
