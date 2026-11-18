// 노드 종류 목록(설계 4.1)과 출구. 화면과 서버(7단계 검증, 8단계 실행)가 같이 쓴다.
// 화면 전용 정보(아이콘)는 src/editor/nodeCatalog.js 에서 덧붙인다.
// 저장 형태(설계 6.1): node.type 은 분류(trigger·condition·action), node.data.kind 는 노드 종류.
import { paramsOf } from './nodeFields.js';

// outputs: 아래쪽 연결점. id 가 null 이면 이름 없는 출구 하나.
// Switch는 사용자가 정한 갈래(params.cases) + 기본으로 바뀐다 → outputsOf() 사용.
const ONE_OUT = [{ id: null, label: '' }];

export const NODE_KIND_INFO = {
  manual: { category: 'trigger', label: '수동 실행', help: '버튼을 눌러 직접 시작', outputs: ONE_OUT },
  schedule: { category: 'trigger', label: '예약 실행', help: '정한 시각에 자동 시작', outputs: ONE_OUT },
  webhook: { category: 'trigger', label: '웹훅', help: '외부 요청이 오면 시작', outputs: ONE_OUT },
  ifElse: {
    category: 'condition',
    label: '조건 분기',
    help: '맞으면 예, 아니면 아니오로 나눔',
    outputs: [
      { id: 'yes', label: '예' },
      { id: 'no', label: '아니오' },
    ],
  },
  switch: { category: 'condition', label: '다중 분기', help: '다중 조건 분기', outputs: ONE_OUT },
  http: { category: 'action', label: 'HTTP 요청', help: '다른 서비스(API) 호출', outputs: ONE_OUT },
  gas: { category: 'action', label: '구글 앱스 스크립트', help: 'GAS 함수 실행', outputs: ONE_OUT },
  githubActions: { category: 'action', label: '깃허브 액션', help: 'GitHub 워크플로우 실행', outputs: ONE_OUT },
  transform: { category: 'action', label: '데이터 변환', help: '데이터 변환', outputs: ONE_OUT },
  delay: { category: 'action', label: '대기', help: '정한 시간만큼 기다림', outputs: ONE_OUT },
  subWorkflow: { category: 'action', label: '하위 워크플로우 실행', help: '다른 워크플로우를 하위 작업으로 실행', outputs: ONE_OUT },
};

// 이 노드의 실제 출구 목록
export function outputsOf(node) {
  if (node.data.kind === 'switch') {
    const cases = paramsOf(node).cases;
    return [...cases.map((c) => ({ id: c.id, label: c.label })), { id: 'default', label: '기본' }];
  }
  return NODE_KIND_INFO[node.data.kind]?.outputs || ONE_OUT;
}

// 출구 이름(예/아니오 등)을 연결선 글자로 쓴다.
export function outputLabel(node, handleId) {
  if (!node) return undefined;
  const out = outputsOf(node).find((o) => o.id === (handleId ?? null));
  return out?.label || undefined;
}
