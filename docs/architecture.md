# 아키텍처

> 상태: **초안**. 프론트엔드가 담당하는 부분만 작성했다. 자세 분석 구조는 담당자가 확정한 뒤 채운다.

## 전체 구성

```
브라우저(React SPA, Vercel) ──HTTPS──▶ FastAPI(가비아 클라우드) ──▶ MySQL
                              │
                              └─ /api/chat/* ─▶ 챗봇 서비스(FastAPI) ──▶ Qdrant, LLM API
                                                   └─ 토큰 확인: 백엔드 /api/users/me
```

- 프론트엔드는 정적 SPA로 Vercel에 배포한다.
- 백엔드는 Docker로 패키징해 가비아 클라우드에 배포한다.

## 프론트엔드가 맡는 영역

| 영역 | 내용 |
| --- | --- |
| 인증 | 로그인·회원가입 화면, 토큰 보관, 보호 라우트 |
| API 통신 | 공통 API 클라이언트, 서버 상태 관리(TanStack Query) |
| 대시보드 | 운동 기록 조회, 주간·장기 차트 |
| AI 에이전트 | Q&A UI, 맞춤 정보 표시. 홈의 플로팅 챗봇 위젯은 [chatbot-api.md](chatbot-api.md) 참고 |
| 화면·라우팅 | [screens-and-routes.md](screens-and-routes.md) 참고 |

## 배포 시 주의

- 웹캠 접근은 HTTPS에서만 가능하다. Vercel은 기본 HTTPS를 제공한다.
- Vercel(HTTPS)에서 백엔드를 호출하려면 백엔드도 **HTTPS**여야 한다(mixed content 차단).
- 챗봇은 백엔드와 별도 서비스다. 브라우저는 같은 상대 경로 `/api/chat/*`로 호출하고, 개발은 Vite 프록시(`CHATBOT_PROXY_TARGET`)가 챗봇으로 보낸다. 운영의 `/api/chat/*` 라우팅(rewrites 또는 Ingress)은 아직 정하지 않았다.
- 브라우저는 항상 상대 경로 `/api/*`로 호출한다. 운영은 Vercel rewrites(`vercel.json`), 개발은 Vite proxy(`API_PROXY_TARGET`)가 백엔드로 넘겨 same-origin을 유지한다. 그래서 CORS 설정이 필요 없다.

## 인증

토큰 방식, 보관 위치, 갱신 처리, API 계약은 [auth-api.md](auth-api.md)를 따른다.

## 자세 분석 (미정)

운동 모드와 자세 코칭 모드의 구조는 담당자가 확정한 뒤 작성한다. 정해야 할 항목은 다음과 같다.

- 자세 인식이 실행되는 위치(브라우저 또는 서버)
- 프론트가 받는 입력과 내보내는 결과(점수, 피드백)의 형태
- 서버에 저장하는 운동 결과 데이터의 형태

> 개인정보 관점에서 웹캠 영상은 저장·전송하지 않는 것을 원칙으로 한다(AGENTS.md 참고).
