# Model Provider Strategy

## 목표

- 사용자가 `openai`, `gemini`, `claude` 중 원하는 provider를 선택
- CLI, 웹, API가 동일한 `provider` 파라미터를 사용
- provider별 인증 정보와 endpoint는 서버 환경변수로 관리

## 현재 구현 상태

지원 계약:

- `auto`
- `fallback`
- `openai`
- `gemini`
- `claude`

구현 상태:

- `openai`: Chat Completions + `response_format.json_schema`
- `gemini`: `generateContent` + `responseSchema`
- `claude`: Messages API + forced tool use
- 공통 validation retry 1회 적용
- 실패 시 fallback generator로 자동 강등

## 필요한 환경변수

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional
- `OPENAI_BASE_URL` optional
- `GEMINI_API_KEY`
- `GEMINI_MODEL` optional
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` optional
- `ANTHROPIC_VERSION` optional

## 주의 사항

- 현재 structured output schema는 provider 호환성을 위해 `{ messages: [...] }` wrapper 형태의 완화된 schema를 사용한다.
- 최종 정합성은 반드시 로컬 A2UI JSON schema validation으로 확인한다.
- 실제 원격 provider 호출은 API 키가 필요하며, 이 저장소에서는 아직 실환경 검증을 하지 않았다.
