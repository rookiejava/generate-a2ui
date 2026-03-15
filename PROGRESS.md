# 진행 로그

## 2026-03-15

- 문서 및 계획 문서 작성 완료
- 첫 커밋 완료: `482adc5`
- Vercel 배포를 기준으로 웹 구조를 재조정
- provider 선택 UI/API/CLI 계약 추가
- OpenAI, Gemini, Claude provider adapter 1차 구현
- fallback generator를 현재 v0.9/v0.10 action schema에 맞게 수정
- `npm run typecheck` 통과
- `npm run build` 통과
- 실 provider 호출은 API 키 부재로 미검증 상태
