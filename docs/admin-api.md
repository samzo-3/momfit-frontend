# 관리자 API

> 상태: **구현**. 백엔드 `api/admin.py`. 모든 경로는 `Authorization: Bearer` 토큰이 필요하고 `role = admin`만 통과한다.
> 에러 형식은 [auth-api.md](auth-api.md)와 같다. 화면은 [screens-and-routes.md](screens-and-routes.md)의 `/admin`, `/admin/members`.

| 상황 | 응답 |
| --- | --- |
| 토큰 없음·만료 | `401 UNAUTHORIZED` |
| 온보딩 전 | `403 ONBOARDING_REQUIRED` |
| 일반 회원 | `403 FORBIDDEN` |

관리자 계정은 `DELETE /users/me`로 탈퇴할 수 없다(`403 ADMIN_CANNOT_WITHDRAW`). 관리자는 가입·프로필 수정 API로 만들 수 없고 DB에서만 지정한다.

## 통계 (`/api/admin/stats/*`)

공통 규칙

- 날짜는 모두 **한국 시간(KST)** 기준이다. `from`·`to`는 `YYYY-MM-DD`(양 끝 포함)이고, 생략하면 오늘까지 최근 30일이다. 최대 731일.
- `period`는 `day`(기본) · `week`(월요일 시작) · `month`(1일 시작). 기록이 없는 구간도 0으로 채워 빠짐없이 내려준다.
- 주·월 단위의 **첫 구간은 기간 앞쪽 날짜까지 포함**해 구간 전체를 센다(첫 막대가 낮아 보이지 않게). `total_*`·운동별 합계·평균 점수는 선택한 기간만 센다.
- **일반 회원만** 센다(관리자 계정 제외). 개인 정보 없이 집계값만 내려준다.
- 기간 오류는 `422 INVALID_DATE_RANGE`(시작일이 더 늦음), `422 DATE_RANGE_TOO_LONG`.

| 경로 | 설명 | 응답 |
| --- | --- | --- |
| `GET /summary` | 오늘 기준 요약 카드 | `total_users`(탈퇴 유예 제외) · `new_users_today` · `withdrawn_users`(유예 중) · `exercises_today`(완료만) · `visitors_today` |
| `GET /exercises?period&from&to` | 운동별 완료 횟수 | `exercises[{exercise_id, exercise_name, total_count, average_score}]`(id 순, 기간 안에 한 번도 없는 운동도 포함) · `series[{period_start, counts[{exercise_id, count}]}]`(구간마다 모든 운동을 0 포함해 내려줌). 모든 운동을 합친 총합은 내려주지 않는다 |
| `GET /users?period&from&to` | 가입·탈퇴 추이 | `total_signups` · `total_withdrawals` · `series[{period_start, signups, withdrawals}]` |
| `GET /visits?period&from&to` | 방문자 | `unique_visitors` · `current{dau, wau, mau}`(오늘 기준, 기간과 무관) · `series[{period_start, visitors}]` |

- 탈퇴 추이는 **현재 탈퇴 유예 중인 계정**의 `withdrawn_at` 기준이다. 복구했거나 완전히 삭제된 계정은 빠진다.
- 방문자는 로그인한 일반 회원이 그 구간에 한 번이라도 `daily_visits`에 기록됐는지를 센다(일별=DAU, 주별=WAU, 월별=MAU). 로그인·가입·토큰 갱신·카카오 로그인·계정 복구 때 하루 1회 기록된다. 비로그인 방문자는 세지 않는다.

## 회원관리 (`/api/admin/members*`)

대상은 일반 회원뿐이다. 관리자 id나 없는 id는 `404 MEMBER_NOT_FOUND`.

| 경로 | 설명 |
| --- | --- |
| `GET /members?q&status&page&size` | 목록. `q`는 닉네임·이메일·아이디 부분 일치(`%`·`_`는 글자 그대로), `status`는 `active`·`withdrawn`, `size` 기본 20·최대 50. 가입 최신 순. `{items, total, page, size}` |
| `GET /members/{id}` | 상세. **조회할 때마다 이력이 남는다.** 프로필, 최근 운동 기록 10건, 처리 이력 20건 |
| `POST /members/{id}/withdraw` | 강제 탈퇴(유예 상태, 모든 기기 로그아웃, 카카오 회원은 연결 해제). 이미 탈퇴면 `409 MEMBER_ALREADY_WITHDRAWN` |
| `POST /members/{id}/restore` | 유예 중인 회원 복구. 아니거나 유예가 지났으면 `409 MEMBER_NOT_RESTORABLE`. 카카오 회원은 다음 로그인에서 다시 동의한다 |

목록 행: `id, nickname, email, login_id, provider(local|kakao), status, created_at, withdrawn_at, purge_at, last_visit_date, completed_exercises`
상세는 여기에 `onboarding_completed, exercise_level, due_date, visit_days_last_30, recent_records[], history[]`를 더한다. 시각은 UTC(ISO 8601)로 내려가고 화면에서 KST로 보여준다.

## 처리 이력 (`admin_audit_logs`)

누가(관리자) 누구에게(회원) 무엇을 했는지 `view_member` · `withdraw_member` · `restore_member`로 남긴다. 조치와 이력은 한 트랜잭션에 저장되고, 실패한 조치는 남기지 않는다. 회원이 나중에 삭제돼도 남도록 id와 닉네임 스냅샷만 저장하며(FK 없음) 추가만 하고 수정·삭제하지 않는다.

## 운영 DB

- `users.role VARCHAR(20) NOT NULL DEFAULT 'user'`는 **수동 ALTER**가 필요하다(코드 배포 전). 선행 조건: `users.id`가 BIGINT.
- `daily_visits`, `admin_audit_logs`는 서버가 시작할 때 `create_all`이 만든다. SQL은 백엔드 `scripts/sql/2026-10-22_admin_base.sql`.
