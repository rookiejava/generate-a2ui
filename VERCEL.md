# Vercel Deployment Notes

## 목표

- 데스크탑 브라우저와 모바일 브라우저 모두에서 접근 가능한 웹 앱
- 정적 프론트엔드 + serverless API 구성
- CLI는 배포 대상이 아니라 별도 Node 실행물로 유지

## 권장 구조

```text
api/              # Vercel serverless functions
web/              # Vite/React frontend
src/              # shared core logic
vercel.json       # routing/build hints
```

## 아키텍처 원칙

- 프론트엔드는 Vercel static asset으로 배포
- `/api/generate`, `/api/validate`, `/api/analysis`는 serverless function으로 노출
- LLM API 키는 Vercel Environment Variables로 주입
- 모바일 대응은 프론트 CSS에서 우선 처리

## 구현 영향

- 기존 Express 단일 서버보다 API route 중심 구조가 우선
- 공유 로직은 `src/` 아래에서 CLI와 API가 같이 재사용
- 웹 앱은 브라우저에서 직접 LLM을 호출하지 않고 반드시 서버 API를 경유
