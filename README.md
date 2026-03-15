# generate-a2ui

자연어 요구사항을 버전별 A2UI 메시지로 생성하고, CLI와 웹 뷰어로 검증 및 프리뷰하는 프로젝트입니다.

## 문서

- [시스템 아키텍처](./docs/architecture.md)
- [작업 계획 및 진행상황](./docs/plan.md)
- [배포 가이드](./docs/deployment.md)
- [운영 체크리스트](./docs/operations.md)
- [Vercel 메모](./VERCEL.md)
- [Provider 전략](./MODEL_PROVIDERS.md)

## 현재 방향

- 지원 버전: `v0.8`, `v0.9`, `v0.10`
- 기본 출력 버전: `v0.10`
- 핵심 구성: 공용 코어 모듈, CLI, Vercel API, 웹 뷰어
- 검증 기준: A2UI 공식 스펙 JSON schema 기반
- provider 선택: `auto`, `fallback`, `openai`, `gemini`, `claude`

## 빠른 시작

```bash
npm install
npm run dev
```

프로덕션 빌드:

```bash
npm run build
```

provider smoke test:

```bash
npm run smoke:provider -- openai v0.10 "로그인 화면 만들어줘"
```
