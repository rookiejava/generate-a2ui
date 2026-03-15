import type {A2UIVersion, VersionAnalysis} from './types.js';
const ANALYSIS: Record<A2UIVersion, VersionAnalysis> = {
  'v0.8': { version: 'v0.8', summary: ['wrapper 기반 메시지와 동적 컴포넌트 키를 사용한다.', 'beginRendering / surfaceUpdate / dataModelUpdate 수명주기를 사용한다.', '데이터 모델은 key/value adjacency list 구조다.'], rendererNotes: ['root는 beginRendering.root에서 결정된다.', 'styles를 theme로 해석하는 adapter가 필요하다.', 'modern preview로 보려면 컴포넌트 shape flattening이 필요하다.'] },
  'v0.9': { version: 'v0.9', summary: ['createSurface / updateComponents / updateDataModel 중심의 modern 메시지 구조다.', 'component discriminator string과 unified catalog를 사용한다.', 'LLM prompt-first 설계라 생성 난이도가 낮다.'], rendererNotes: ['root id가 root인 컴포넌트가 정확히 하나여야 한다.', 'preview 기준 버전으로 사용하기 가장 좋다.', 'theme와 data model이 표준 JSON 형태다.'] },
  'v0.10': { version: 'v0.10', summary: ['v0.9를 대부분 유지하면서 callFunction과 functionResponse가 추가된다.', 'CallId와 callableFrom이 공통 타입에 추가된다.', '클라이언트 에러는 surfaceId 또는 functionCallId를 포함해야 한다.'], rendererNotes: ['렌더링 계층은 대체로 v0.9와 호환된다.', '함수 호출 수명주기는 preview에서 별도 로그로 노출하는 편이 안전하다.', '공식 evolution guide는 미완성이라 schema diff 기반 해석이 필요하다.'] }
};
export function getAllVersionAnalyses(): VersionAnalysis[] { return Object.values(ANALYSIS); }
