# 시스템 아키텍처

## 목표

이 저장소는 세 가지 산출물을 하나의 코드베이스에서 관리합니다.

1. 자연어를 A2UI 메시지로 변환하는 에이전트 코어
2. 개발자용 CLI
3. 생성 결과를 즉시 확인하는 Vercel 배포 웹 앱

## 현재 구조

```text
generate-a2ui/
├─ api/                  # Vercel serverless functions
├─ docs/
│  ├─ architecture.md
│  └─ plan.md
├─ src/
│  ├─ core/              # shared generation, validation, preview logic
│  ├─ server/            # local express server
│  └─ cli.ts             # CLI entry
├─ web/
│  ├─ src/
│  │  ├─ api.ts
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  └─ styles.css
│  └─ index.html
├─ .tmp-a2ui-upstream/   # 공식 A2UI 레포 로컬 참조본
├─ MODEL_PROVIDERS.md
├─ VERCEL.md
├─ vercel.json
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## 핵심 계층

### Shared Core

- `src/core/loader.ts`: 버전별 스펙 경로 해석
- `src/core/validator.ts`: AJV 기반 스키마 검증
- `src/core/fallback.ts`: provider 미구성 시 기본 생성기
- `src/core/providers.ts`: provider 선택 해석
- `src/core/preview.ts`: 버전별 메시지를 프리뷰 모델로 변환

### CLI

- `a2ui-cli generate --provider openai --version v0.10 ...`
- `a2ui-cli validate --version v0.9 ...`

### Web / Vercel

- `api/analysis.ts`
- `api/generate.ts`
- `api/validate.ts`
- React/Vite 프론트엔드에서 provider, version, prompt를 선택해 서버 호출

## Provider 전략

지원 계약:

- `auto`
- `fallback`
- `openai`
- `gemini`
- `claude`

현재 상태:

- provider 선택은 CLI/API/Web 전부 반영됨
- live provider adapter는 다음 단계에서 구현 예정
- 현재 빌드는 fallback generator를 통해 end-to-end 동작 보장

## 배포 전략

- 웹은 Vercel에 배포
- API 키는 Vercel Environment Variables로 주입
- 모바일/데스크탑 브라우저 모두 대응하도록 반응형 UI 유지
- 로컬 개발용으로는 `src/server/index.ts` Express 서버를 사용 가능
