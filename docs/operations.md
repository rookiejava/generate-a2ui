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

Vercel 배포 후:

1. `/api/analysis` 호출
2. 웹에서 provider 선택 후 generate 실행
3. validation badge가 `Schema valid`인지 확인
4. preview가 실제로 렌더링되는지 확인

## Mobile Browser Check

1. iPhone/Android 브라우저에서 페이지 접근
2. 좌우 2열이 1열로 전환되는지 확인
3. textarea 입력과 preview 스크롤이 정상인지 확인
4. 긴 JSON 붙여넣기 시 브라우저가 멈추지 않는지 확인

## Incident Notes

- provider 호출 실패 시 현재 구현은 fallback generator로 자동 강등될 수 있음
- provider가 fallback으로 내려갔는지는 응답의 `provider`와 `usedModel` 필드로 확인
- validation 실패가 반복되면 먼저 target version과 generated action shape를 확인
