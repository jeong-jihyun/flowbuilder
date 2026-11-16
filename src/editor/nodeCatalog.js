// 노드 목록. 설계 문서 4.1을 그대로 옮겼다.
// 저장 형태(설계 6.1): node.type 은 분류(trigger·condition·action), node.data.kind 는 노드 종류.
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WebhookIcon from '@mui/icons-material/Webhook';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import HttpIcon from '@mui/icons-material/Http';
import DescriptionIcon from '@mui/icons-material/Description';
import GitHubIcon from '@mui/icons-material/GitHub';
import TransformIcon from '@mui/icons-material/Transform';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { defaultParams, paramsOf } from './nodeFields.js';

export const CATEGORIES = {
  trigger: { label: 'Trigger', color: '#2e7d32', help: '흐름을 시작합니다' },
  condition: { label: 'Condition', color: '#ed6c02', help: '조건에 따라 길을 나눕니다' },
  action: { label: 'Action', color: '#2f5bea', help: '실제 일을 합니다' },
};

// outputs: 아래쪽 연결점. id 가 null 이면 이름 없는 출구 하나.
// Switch는 사용자가 정한 갈래(params.cases) + 기본으로 바뀐다 → outputsOf() 사용.
const ONE_OUT = [{ id: null, label: '' }];

export const NODE_KINDS = {
  manual: { category: 'trigger', label: 'Manual', icon: TouchAppIcon, help: '수동 실행', outputs: ONE_OUT },
  schedule: { category: 'trigger', label: 'Schedule', icon: ScheduleIcon, help: '예약 실행', outputs: ONE_OUT },
  webhook: { category: 'trigger', label: 'Webhook', icon: WebhookIcon, help: '외부 요청으로 실행', outputs: ONE_OUT },
  ifElse: {
    category: 'condition',
    label: 'If / Else',
    icon: CallSplitIcon,
    help: '조건 분기',
    outputs: [
      { id: 'yes', label: 'YES' },
      { id: 'no', label: 'NO' },
    ],
  },
  switch: {
    category: 'condition',
    label: 'Switch',
    icon: AltRouteIcon,
    help: '다중 조건 분기',
    outputs: [
      { id: 'case_1', label: '1' },
      { id: 'case_2', label: '2' },
      { id: 'default', label: '기본' },
    ],
  },
  http: { category: 'action', label: 'HTTP Request', icon: HttpIcon, help: 'REST API 호출', outputs: ONE_OUT },
  gas: { category: 'action', label: 'Google Apps Script', icon: DescriptionIcon, help: 'GAS 실행', outputs: ONE_OUT },
  githubActions: { category: 'action', label: 'GitHub Actions', icon: GitHubIcon, help: 'GitHub Workflow 실행', outputs: ONE_OUT },
  transform: { category: 'action', label: 'Data Transform', icon: TransformIcon, help: '데이터 변환', outputs: ONE_OUT },
  delay: { category: 'action', label: 'Delay', icon: HourglassBottomIcon, help: '지정 시간 대기', outputs: ONE_OUT },
};

// 이 노드의 실제 출구 목록
export function outputsOf(node) {
  if (node.data.kind === 'switch') {
    const cases = paramsOf(node).cases;
    return [...cases.map((c) => ({ id: c.id, label: c.label })), { id: 'default', label: '기본' }];
  }
  return NODE_KINDS[node.data.kind]?.outputs || ONE_OUT;
}

// 출구 이름(YES/NO 등)을 연결선 글자로 쓴다.
export function outputLabel(node, handleId) {
  if (!node) return undefined;
  const out = outputsOf(node).find((o) => o.id === (handleId ?? null));
  return out?.label || undefined;
}

// 새 노드 만들기. id 는 설계 6.1 예시처럼 "분류_번호" 모양.
export function createNode(kind, position, existingNodes) {
  const def = NODE_KINDS[kind];
  const prefix = `${def.category}_`;
  const used = existingNodes
    .map((n) => (n.id.startsWith(prefix) ? Number(n.id.slice(prefix.length)) : 0))
    .filter(Number.isFinite);
  const next = Math.max(0, ...used) + 1;
  return {
    id: `${prefix}${next}`,
    type: def.category,
    position,
    data: { kind, label: def.label, params: defaultParams(kind) },
  };
}
