# 디렉터리 구조

> 상태: 확정 (운동·자세 분석 영역 제외). 운동·자세 분석 영역은 담당자가 구조를 정한 뒤 채운다.

기능(feature) 단위로 나눈다. 여러 기능에서 쓰는 코드만 공통 폴더에 둔다.

```
src/
├── app/            # 라우트 정의(routes.tsx), 라우터(router.tsx), 전역 Provider(providers.tsx)
├── pages/          # 라우트 단위 화면 (조립만 하고 로직은 features에 둔다)
├── test/           # 테스트 공통 설정 (setup.ts)
├── features/       # 기능별 코드 (컴포넌트, 훅, API, 타입)
│   ├── auth/       # 로그인, 회원가입, 인증 상태
│   ├── dashboard/  # 운동 기록, 리포트, 차트
│   ├── agent/      # AI 에이전트 Q&A, 맞춤 정보
│   └── workout/    # 운동 모드, 자세 코칭 모드 (미정)
├── shared/         # 공통 UI 컴포넌트, 훅, 유틸, 타입
│   ├── api/        # API 클라이언트 (공통 fetch 설정, 인증 헤더)
│   ├── components/
│   └── lib/
└── assets/         # 이미지, 폰트
```

## 규칙

- `features/` 안의 기능끼리는 직접 import하지 않는다. 필요하면 `shared/`로 올리거나 `pages/`에서 조합한다.
- `shared/`는 `features/`를 import하지 않는다.
- 기능 폴더의 구성은 필요할 때만 `components/`, `hooks/`, `api/`, `types.ts`로 나눈다.

## 미정

- `features/workout/` 내부 구조 (자세 인식, 피드백, 코칭, 점수 계산 영역의 분리 방식)
