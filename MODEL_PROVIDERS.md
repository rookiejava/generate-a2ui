# Model Provider Strategy

## 목표

- 사용자가 `openai`, `gemini`, `claude` 중 원하는 provider를 선택
- CLI, 웹, API가 동일한 `provider` 파라미터를 사용
- provider별 인증 정보와 endpoint는 서버 환경변수로 관리

## 현재 구현 방향

- `provider registry`를 공용 코어에 둔다.
- `auto`는 사용 가능한 provider를 환경변수 기준으로 선택한다.
- 설정이 없거나 provider adapter가 준비되지 않은 경우 `fallback` generator로 내려간다.
- 웹에서는 provider 선택 UI를 제공하고, 실제 호출은 항상 서버 API를 경유한다.

## 추후 확장

- OpenAI Responses/Chat API adapter
- Gemini adapter
- Claude adapter
- provider별 structured output retry 전략 분리
