# Deployment Guide

## Local Development

### 1. Install

```bash
npm install
```

### 2. Configure env

```bash
cp .env.example .env.local
```

필요한 provider API 키를 채웁니다. 키가 없으면 자동으로 `fallback` generator가 사용됩니다.

### 3. Run

```bash
npm run dev
```

- web: `http://localhost:5173`
- api: `http://localhost:8080`

## CLI Usage

```bash
a2ui-cli generate --prompt "로그인 화면 만들어줘" --version v0.10 --provider openai
```

```bash
a2ui-cli serve --port 8080
```

## Vercel Deployment

### 1. Project import

- GitHub 저장소를 Vercel에 연결
- Framework Preset은 `Vite`
- Root Directory는 저장소 루트 사용

### 2. Environment Variables

Vercel Project Settings > Environment Variables에 필요한 키를 추가합니다.

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional
- `OPENAI_BASE_URL` optional
- `GEMINI_API_KEY`
- `GEMINI_MODEL` optional
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` optional
- `ANTHROPIC_VERSION` optional
- `A2UI_SPEC_ROOT` optional

권장:

- 우선 하나의 provider만 먼저 연결해서 smoke test
- production과 preview env를 분리

### 3. Build and output

- Build Command: `npm run build`
- Output Directory: `dist`

### 4. Runtime notes

- `/api/generate`는 provider API를 서버에서 호출하므로 브라우저에 키가 노출되지 않습니다.
- API route는 `nodejs` runtime을 사용합니다.
- 응답 시간이 긴 provider를 고려해 함수 `maxDuration`을 여유 있게 잡았습니다.

## Recommended Verification

배포 후 아래 순서로 확인합니다.

1. `/api/analysis`가 provider 목록과 버전 목록을 반환하는지 확인
2. `fallback` provider로 생성/검증이 되는지 확인
3. 실제 provider 하나를 선택해 생성이 되는지 확인
4. 모바일 브라우저에서 편집기와 프리뷰 레이아웃이 깨지지 않는지 확인
