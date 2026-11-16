// 노드 종류 목록(설계 4.1)과 출구. 화면과 서버(7단계 검증, 8단계 실행)가 같이 쓴다.
// 화면 전용 정보(아이콘)는 src/editor/nodeCatalog.js 에서 덧붙인다.
// 저장 형태(설계 6.1): node.type 은 분류(trigger·condition·action), node.data.kind 는 노드 종류.
import { paramsOf } from './nodeFields.js';

// outputs: 아래쪽 연결점. id 가 null 이면 이름 없는 출구 하나.
// Switch는 사용자가 정한 갈래(params.cases) + 기본으로 바뀐다 → outputsOf() 사용.
const ONE_OUT = [{ id: null, label: '' }];

export const NODE_KIND_INFO = {
  manual: { category: 'trigger', label: 'Manual', help: '수동 실행', outputs: ONE_OUT },
  schedule: { category: 'trigger', label: 'Schedule', help: '예약 실행', outputs: ONE_OUT },
  webhook: { category: 'trigger', label: 'Webhook', help: '외부 요청으로 실행', outputs: ONE_OUT },
  ifElse: {
    category: 'condition',
    label: 'If / Else',
    help: '조건 분기',
    outputs: [
      { id: 'yes', label: 'YES' },
      { id: 'no', label: 'NO' },
    ],
  },
  switch: { category: 'condition', label: 'Switch', help: '다중 조건 분기', outputs: ONE_OUT },
  http: { category: 'action', label: 'HTTP Request', help: 'REST API 호출', outputs: ONE_OUT },
  gas: { category: 'action', label: 'Google Apps Script', help: 'GAS 실행', outputs: ONE_OUT },
  githubActions: { category: 'action', label: 'GitHub Actions', help: 'GitHub Workflow 실행', outputs: ONE_OUT },
  transform: { category: 'action', label: 'Data Transform', help: '데이터 변환', outputs: ONE_OUT },
  delay: { category: 'action', label: 'Delay', help: '지정 시간 대기', outputs: ONE_OUT },
};

// 이 노드의 실제 출구 목록
export function outputsOf(node) {
  if (node.data.kind === 'switch') {
    const cases = paramsOf(node).cases;
    return [...cases.map((c) => ({ id: c.id, label: c.label })), { id: 'default', label: '기본' }];
  }
  return NODE_KIND_INFO[node.data.kind]?.outputs || ONE_OUT;
}

// 출구 이름(YES/NO 등)을 연결선 글자로 쓴다.
export function outputLabel(node, handleId) {
  if (!node) return undefined;
  const out = outputsOf(node).find((o) => o.id === (handleId ?? null));
  return out?.label || undefined;
}
