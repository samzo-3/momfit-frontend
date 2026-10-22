# 챗봇 API

> 상태: 구현. 챗봇은 백엔드와 **별도 서비스**(저장소 `momfit-chatbot`)다. 임신 중 운동에 대해 공식 기관 자료를 근거로 답하는 RAG 챗봇이며, 학습·데모용이다.

## 연결 방식

- 브라우저는 다른 API와 같이 상대 경로 `/api/chat/*`로 호출한다. 요청은 공통 API 클라이언트(`shared/api`)를 거치므로 Bearer 토큰, `TOKEN_EXPIRED` 재시도, `UNAUTHORIZED` 처리가 그대로 적용된다.
- 개발: Vite 프록시가 `/api/chat`을 `CHATBOT_PROXY_TARGET`(기본 `http://localhost:8100`)으로, 나머지 `/api`를 `API_PROXY_TARGET`으로 보낸다. 더 구체적인 `/api/chat`을 먼저 둔다.
- 운영(K3s, `momfit-infra`): 챗봇은 같은 클러스터(`team` 네임스페이스)에 별도 Deployment `momfit-chatbot`(포트 8100)으로 배포하고, `/api/chat/*`만 챗봇으로 보낸다.
  - 프론트 Nginx(`nginx.conf`)의 `location /api/chat/`이 챗봇 서비스로 프록시한다. 호스트를 변수와 `resolver`로 지정해, 챗봇이 아직 배포되지 않았거나 내려가 있어도 프론트 Nginx가 기동에 실패하지 않고 챗봇 요청만 502가 된다(위젯은 "지금은 답변을 만들 수 없어요"를 보여준다).
  - Traefik Ingress가 `/api`를 백엔드로 직접 보낸다면 Ingress에도 `/api/chat` → 챗봇 규칙이 필요하다(더 긴 경로가 우선). 배포 절차는 챗봇 저장소 `docs/deployment.md`를 따른다.
- 챗봇은 받은 토큰을 백엔드 `GET /api/users/me`에 물어 확인한다. 임신 주수도 거기서 가져오므로 **프론트가 주수를 보내지 않는다**.

## `POST /api/chat/messages`

요청: `{ "question": string }` (1~500자, 앞뒤 공백은 서버가 제거)

응답:

```json
{
  "kind": "answer",
  "answer": "본문...\n\n※ 일반 정보이며 의료 조언이 아닙니다. 개인 상황은 담당 의료진과 상의하세요.",
  "sources": [
    {
      "title": "Exercise in pregnancy (요약)",
      "publisher": "NHS",
      "jurisdiction": "UK",
      "url": "https://www.nhs.uk/pregnancy/keeping-well/exercise/",
      "checked_at": "2026-10-21"
    }
  ]
}
```

| kind | 의미 | 화면 처리 |
| --- | --- | --- |
| `answer` | 자료를 근거로 한 답변 | 일반 말풍선 + 출처 목록 |
| `emergency` | 위험 신호(출혈, 어지러움 등) 감지. 운동을 멈추고 산부인과에 연락, 응급이면 119 | 빨간 테두리의 `alert` 말풍선 |
| `no_answer` | 가진 자료에서 근거를 못 찾음 | 일반 말풍선 |
| `out_of_scope` | 증상·약·진단 등 범위 밖 | 일반 말풍선 |

- `answer` 끝의 `※ ...`는 서버가 붙인 면책 문구다. 본문과 나눠 작게 보여준다(`answer-format.ts`).
- 출처의 `jurisdiction`은 자료의 나라(KR, US, UK, INTL)다. 한국 지침으로 오해하지 않도록 화면에 나라를 함께 보여준다.
- 출처 `url`은 `https://`일 때만 링크로 연다.

## 에러

백엔드와 같은 형식 `{ "error": { "code", "message", "fields"? } }`이고 코드도 같다.

| HTTP | code | 처리 |
| --- | --- | --- |
| 401 | `TOKEN_EXPIRED` | 공통 클라이언트가 refresh 후 한 번 재시도 |
| 401 | `UNAUTHORIZED` | 공통 클라이언트가 인증 상태를 초기화하고 `/login`으로 이동 |
| 403 | `ONBOARDING_REQUIRED` | "온보딩을 먼저 마쳐 주세요." (보호 라우트가 이미 온보딩을 거르므로 드묾) |
| 429 | `RATE_LIMITED` | 서버 문구를 말풍선으로 보여줌. 사용자당 분당 10회, 하루 100회 |
| 422 | `VALIDATION_ERROR` | "질문은 1자 이상 500자 이하로 입력해 주세요." |
| 503 | `SERVICE_UNAVAILABLE` | "지금은 답변을 만들 수 없어요..." (서버 내부 사정은 노출하지 않음) |
| - | `NETWORK_ERROR` | "네트워크 연결을 확인해 주세요." |

## 제한 사항

- 챗봇은 **이전 대화를 기억하지 않는다.** 질문마다 독립적으로 처리하므로 "그건 몇 분이에요?" 같은 꼬리 질문은 답하지 못한다. 화면에도 이 사실을 안내한다.
- 대화 내용은 화면(메모리)에만 두고 저장하지 않는다. 새로고침하거나 다른 화면으로 가면 사라진다.
- 근거 문서는 외국 자료를 한국어로 요약한 것이라 번역·요약 오류가 있을 수 있고 의학 검토를 받지 않았다.
