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
import { defaultParams } from '../../shared/nodeFields.js';
import { NODE_KIND_INFO } from '../../shared/nodeKinds.js';

export { outputLabel, outputsOf } from '../../shared/nodeKinds.js';

export const CATEGORIES = {
  trigger: { label: 'Trigger', color: '#16A36A', help: '흐름을 시작합니다' },
  condition: { label: 'Condition', color: '#A76A08', help: '조건에 따라 길을 나눕니다' },
  action: { label: 'Action', color: '#2864FF', help: '실제 일을 합니다' },
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
