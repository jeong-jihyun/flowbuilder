// 화면에서 쓰는 노드 목록: 공통 목록(shared/nodeKinds.js)에 아이콘을 덧붙인다.
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
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { defaultParams } from '../../shared/nodeFields.js';
import { NODE_KIND_INFO } from '../../shared/nodeKinds.js';

// 예전에 저장된 워크플로우의 영어 노드 이름 → 지금의 한글 이름 (사용자가 직접 바꾼 이름은 그대로 둔다)
const LEGACY_LABELS = {
  manual: 'Manual', schedule: 'Schedule', webhook: 'Webhook', ifElse: 'If / Else', switch: 'Switch',
  http: 'HTTP Request', gas: 'Google Apps Script', githubActions: 'GitHub Actions', transform: 'Data Transform', delay: 'Delay',
};
export function localizeNode(node) {
  const kind = node.data?.kind;
  const def = NODE_KIND_INFO[kind];
  return def && node.data.label === LEGACY_LABELS[kind] ? { ...node, data: { ...node.data, label: def.label } } : node;
}

export { outputLabel, outputsOf } from '../../shared/nodeKinds.js';

export const CATEGORIES = {
  trigger: { label: '시작', color: '#16A36A', help: '흐름을 시작합니다' },
  condition: { label: '조건', color: '#A76A08', help: '조건에 따라 길을 나눕니다' },
  action: { label: '작업', color: '#2864FF', help: '실제 일을 합니다' },
};

const ICONS = {
  manual: TouchAppIcon,
  schedule: ScheduleIcon,
  webhook: WebhookIcon,
  ifElse: CallSplitIcon,
  switch: AltRouteIcon,
  http: HttpIcon,
  gas: DescriptionIcon,
  githubActions: GitHubIcon,
  transform: TransformIcon,
  delay: HourglassBottomIcon,
  subWorkflow: AccountTreeIcon,
};

export const NODE_KINDS = Object.fromEntries(
  Object.entries(NODE_KIND_INFO).map(([kind, info]) => [kind, { ...info, icon: ICONS[kind] }])
);

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
