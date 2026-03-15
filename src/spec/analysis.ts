import type {A2UIVersion, VersionAnalysis} from '../shared/types.js';

const VERSION_ANALYSIS: Record<A2UIVersion, VersionAnalysis> = {
  'v0.8': {
    version: 'v0.8',
    summary: [
      '메시지는 beginRendering, surfaceUpdate, dataModelUpdate, deleteSurface 중 하나의 wrapper key를 가진다.',
      '컴포넌트 타입은 component 객체의 동적 key로 표현된다.',
      '데이터 모델은 key/valueString 계열 adjacency list 형태다.',
      '표준 카탈로그와 렌더링 스타일 정의가 분리되어 있다.',
    ],
    rendererNotes: [
      'root 컴포넌트는 beginRendering.root로 전달된다.',
      'theme 대신 styles를 사용한다.',
      'modern renderer에 연결하려면 메시지와 컴포넌트 구조를 평탄화해야 한다.',
    ],
  },
  'v0.9': {
    version: 'v0.9',
    summary: [
      '메시지는 createSurface, updateComponents, updateDataModel, deleteSurface로 개편된다.',
      '컴포넌트는 component discriminator string 기반의 flat object를 사용한다.',
      '데이터 모델과 버튼 context가 표준 JSON object로 단순화된다.',
      'basic_catalog.json과 rules 파일이 프롬프트-우선 생성 전략을 지원한다.',
    ],
    rendererNotes: [
      'ID가 root인 컴포넌트가 정확히 하나 있어야 한다.',
      'theme는 createSurface.theme에 들어간다.',
      '현재 웹 프리뷰의 기준 shape로 사용하기 가장 적합하다.',
    ],
  },
  'v0.10': {
    version: 'v0.10',
    summary: [
      'v0.9 구조를 대부분 유지하면서 version constant와 capability key가 v0.10으로 바뀐다.',
      'server-to-client에 callFunction, functionCallId, wantResponse가 추가된다.',
      'client-to-server에 functionResponse가 추가되고 error는 surfaceId 또는 functionCallId 중 하나를 포함해야 한다.',
      'common_types에 CallId와 callableFrom이 추가되고 returnType enum이 정리된다.',
    ],
    rendererNotes: [
      '렌더링 자체는 대체로 v0.9와 호환된다.',
      'callFunction 수명주기는 별도 로그나 에뮬레이션 계층이 필요하다.',
      '공식 evolution guide는 아직 미완성이어서 schema diff 기준 해석이 필요하다.',
    ],
  },
};

export function getVersionAnalysis(version: A2UIVersion): VersionAnalysis {
  return VERSION_ANALYSIS[version];
}

export function getAllVersionAnalyses(): VersionAnalysis[] {
  return Object.values(VERSION_ANALYSIS);
}
