# 시스템 아키텍처

## 목표

이 저장소는 세 가지 산출물을 하나의 코드베이스에서 관리합니다.

1. 자연어를 A2UI 메시지로 변환하는 에이전트 코어
2. 개발자용 CLI
3. 생성 결과를 즉시 확인하는 웹 뷰어

## 상위 구조

예정 폴더 구조는 아래 기준으로 유지합니다.

```text
generate-a2ui/
├─ docs/
│  ├─ architecture.md
│  └─ plan.md
├─ src/
│  ├─ agent/          # 자연어 -> A2UI 생성 파이프라인
│  ├─ spec/           # 버전 라우팅, 스키마 로딩, validation
│  ├─ preview/        # 버전별 메시지 -> 뷰어용 모델 변환
│  ├─ server/         # Express API 및 static serving
│  ├─ cli/            # commander 기반 CLI 엔트리
│  └─ shared/         # 공용 타입, 직렬화, 유틸
├─ web/
│  ├─ src/
│  │  ├─ components/  # 에디터, 프리뷰, 상태 패널
│  │  ├─ lib/         # API 클라이언트, 포맷터
│  │  └─ main.tsx
│  └─ index.html
├─ .tmp-a2ui-upstream/ # 공식 A2UI 레포 로컬 참조본
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

## 컴포넌트별 역할

### 1. Agent Core

역할:

- 사용자 자연어 프롬프트 분석
- 타깃 버전별 스키마 선택
- LLM structured output 요청
- validation 실패 시 재시도
- API 키가 없을 때 휴리스틱 fallback 생성

구성 예정:

- `src/agent/generator.ts`
- `src/agent/prompts.ts`
- `src/agent/llm.ts`
- `src/agent/fallback.ts`

### 2. Spec / Validation Layer

역할:

- `v0.8`, `v0.9`, `v0.10` 스펙 경로 해석
- 공식 schema 로딩
- AJV 기반 JSON schema validation
- 버전별 차이점 메타데이터 제공

구성 예정:

- `src/spec/versions.ts`
- `src/spec/loader.ts`
- `src/spec/validator.ts`
- `src/spec/analysis.ts`

### 3. CLI

역할:

- `generate`
- `validate`
- `serve`

설계 원칙:

- 표준 입출력 우선
- 파일 출력 옵션 제공
- JSON/YAML 둘 다 지원
- 비정상 validation은 non-zero exit code

### 4. Web Viewer

역할:

- 자연어 프롬프트 입력
- 생성된 A2UI 소스 편집
- validation 결과 표시
- 실시간 프리뷰 렌더링
- 버전별 스펙 차이 참고 정보 제공

렌더링 전략:

- 공식 A2UI 메시지 구조를 최대한 유지
- 현재 upstream 웹 렌더러 버전 지원 범위를 고려해 `v0.8`, `v0.10`은 preview adapter를 둠
- `callFunction` 등 렌더링 외 수명주기는 별도 로그/패널로 표시

### 5. API Server

역할:

- `/api/generate`
- `/api/validate`
- `/api/analysis`
- 웹 앱 static asset 서빙

## 버전 지원 전략

### v0.8

- wrapper 기반 component 구조
- `beginRendering` / `surfaceUpdate` / `dataModelUpdate`
- preview 시 modern shape로 변환하는 adapter 필요

### v0.9

- modern discriminator 기반 component 구조
- unified catalog
- preview 기준 버전

### v0.10

- v0.9 기반 유지
- `callFunction`, `functionResponse`, `CallId` 추가
- 렌더링은 대부분 v0.9 호환, 함수 호출은 별도 처리

## 기술 스택

- Language: TypeScript
- Runtime: Node.js
- CLI: Commander
- Validation: AJV
- API: Express
- Web: React + Vite
- Serialization: YAML

## 커밋 정책

사용자 요청에 따라 주요 변경 단위마다 커밋합니다.

예정 커밋 단위:

1. 문서 및 초기 구조
2. 스펙 로더와 validation
3. CLI
4. API + 웹 뷰어
5. 검증 및 마무리 정리

