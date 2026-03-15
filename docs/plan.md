# 작업 계획 및 진행상황

이 문서는 저장소 기준 진행상황을 계속 갱신합니다.

## 현재 상태

- 날짜: 2026-03-15
- 단계: local deployment smoke 검증 완료
- 상태: 진행 중

## 작업 목록

| ID | 작업 | 상태 | 비고 |
| --- | --- | --- | --- |
| P1 | 시스템 구조 및 폴더 구조 문서화 | 완료 | commit `482adc5` |
| P2 | 프로젝트 스캐폴드 및 공용 타입 추가 | 완료 | TypeScript/Vite/Express/Vercel API |
| P3 | A2UI 스펙 로더 및 validation 구현 | 완료 | v0.8/v0.9/v0.10 |
| P4 | 자연어 -> A2UI 생성기 구현 | 완료 | fallback + provider abstraction + retry |
| P5 | CLI 구현 | 완료 | generate/validate/serve |
| P6 | API 서버 구현 | 완료 | local server + Vercel api |
| P7 | 웹 뷰어 구현 | 완료 | editor + preview + provider selector |
| P8 | 빌드/실행 검증 | 완료 | `npm run typecheck`, `npm run build` |
| P9 | 마일스톤별 커밋 정리 | 진행 중 | 이번 단계 커밋 예정 |
| P10 | live provider adapter 구현 | 완료 | openai/gemini/claude 1차 연결 |
| P11 | provider 실환경 호출 검증 | 대기 | 실제 API 키 필요 |
| P12 | Vercel 배포 설정 문서화 | 완료 | `.env.example`, deployment guide |
| P13 | 운영 체크리스트 및 smoke script 추가 | 완료 | `docs/operations.md`, `scripts/provider-smoke.ts` |
| P14 | smoke script 실행 검증 | 완료 | provider smoke + deployment smoke |
| P15 | local deployment smoke 자동화 | 완료 | `smoke:deployment` localhost 검증 |

## 최근 업데이트

### 2026-03-15

- A2UI 공식 레포를 로컬로 가져와 스펙 및 렌더러 구조를 분석함
- 문서 및 계획 파일을 추가하고 첫 마일스톤을 커밋함 (`482adc5`)
- Vercel 배포를 전제로 정적 웹 + serverless API 구조로 정리함
- provider 선택 요구를 반영해 `auto`, `fallback`, `openai`, `gemini`, `claude` 계약을 추가함
- CLI, local server, Vercel API, 웹 UI를 1차 구현함
- `npm install`, `npm run typecheck`, `npm run build` 검증을 완료함
- OpenAI, Gemini, Claude용 live provider adapter와 validation retry 루프를 추가함
- `.env.example`과 배포 가이드를 추가하고 Vercel 함수 runtime 설정을 명시함
- 운영 체크리스트와 provider/deployment smoke test 스크립트를 추가함
- Express 5 wildcard route를 `/{*path}`로 수정해 local deployment smoke를 통과시킴

## 진행 규칙

- 주요 구조 변경 후 즉시 이 문서를 갱신
- 큰 기능 단위 완료 시 커밋
- 검증이 끝나지 않은 항목은 `완료`로 바꾸지 않음
