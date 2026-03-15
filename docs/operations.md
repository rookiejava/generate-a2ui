# Operations Checklist

## Vercel Preflight

1. `npm run typecheck`
2. `npm run build`
3. `node dist/cli.js generate --prompt "로그인 화면 만들어줘" --version v0.10 --provider fallback`
4. Vercel env에 최소 1개 provider API 키 등록

## Provider Smoke Test

로컬에서:

```bash
npx tsx scripts/provider-smoke.ts openai v0.10 "로그인 화면 만들어줘"
```

## Deployment Smoke Test

배포 URL 기준 자동 점검:

```bash
npm run smoke:deployment -- https://your-app.vercel.app fallback v0.10 "로그인 화면 만들어줘"
```

로컬 검증 예시:

```bash
node dist/cli.js serve --port 8090
npm run smoke:deployment -- http://127.0.0.1:8090 fallback v0.10 "로그인 화면 만들어줘"
```

검사 순서:

1. `/api/analysis`
2. `/api/generate`
3. `/api/validate`
4. preview root id 확인

Vercel 배포 후 수동 확인:

1. 웹에서 provider 선택 후 generate 실행
2. validation badge가 `Schema valid`인지 확인
3. preview가 실제로 렌더링되는지 확인

## Mobile Browser Check

1. iPhone/Android 브라우저에서 페이지 접근
2. 좌우 2열이 1열로 전환되는지 확인
3. textarea 입력과 preview 스크롤이 정상인지 확인
4. 긴 JSON 붙여넣기 시 브라우저가 멈추지 않는지 확인

## Incident Notes

- provider 호출 실패 시 현재 구현은 fallback generator로 자동 강등될 수 있음
- provider가 fallback으로 내려갔는지는 응답의 `provider`와 `usedModel` 필드로 확인
- validation 실패가 반복되면 먼저 target version과 generated action shape를 확인
- Express 5 사용 시 SPA fallback route는 `*` 대신 `/{*path}` 형태를 사용해야 함
