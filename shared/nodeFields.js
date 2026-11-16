// 노드별 설정 항목(5단계). 속성 패널은 이 표를 보고 입력칸을 만든다.
// 화면(src/editor)과 서버(api/_lib, 7단계 검증)가 같이 쓴다. 화면 라이브러리(MUI 등)를 가져오지 않는다.
// 값은 node.data.params 에 저장한다. 비밀번호·토큰 같은 인증정보는 여기 넣지 않는다(9단계 Credentials).
//
// 필드 모양: { key, label, type, default, required, options, min, max, pattern, placeholder, help, showIf }
// type: text | number | select | time | textarea | json | cases(Switch 전용)

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }));

const WEEKDAYS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

export const OPERATORS = [
  { value: 'equals', label: '같다 (=)' },
  { value: 'notEquals', label: '다르다 (≠)' },
  { value: 'contains', label: '포함한다' },
  { value: 'greaterThan', label: '크다 (>)' },
  { value: 'lessThan', label: '작다 (<)' },
  { value: 'isEmpty', label: '비어 있다' },
  { value: 'isNotEmpty', label: '비어 있지 않다' },
];
const NO_RIGHT_SIDE = ['isEmpty', 'isNotEmpty'];

const DELAY_UNITS = [
  { value: 'seconds', label: '초', sec: 1 },
  { value: 'minutes', label: '분', sec: 60 },
  { value: 'hours', label: '시간', sec: 3600 },
];
const MAX_DELAY_SECONDS = 24 * 3600;

export const MAX_SWITCH_CASES = 10;

const label = (options, value) => options.find((o) => o.value === value)?.label ?? value;

export const NODE_FIELDS = {
  manual: {
    help: 'Run 버튼을 누르면 이 노드부터 시작합니다. 설정할 항목이 없습니다.',
    fields: [],
    summary: () => '',
  },
  schedule: {
    help: '시간은 한국 시간(Asia/Seoul) 기준입니다.',
    fields: [
      {
        key: 'frequency',
        label: '반복',
        type: 'select',
        default: 'daily',
        options: [
          { value: 'hourly', label: '매시간' },
          { value: 'daily', label: '매일' },
          { value: 'weekly', label: '매주' },
        ],
      },
      { key: 'minute', label: '분 (0~59)', type: 'number', default: 0, min: 0, max: 59, required: true, showIf: (p) => p.frequency === 'hourly' },
      { key: 'weekday', label: '요일', type: 'select', default: 'mon', options: WEEKDAYS, showIf: (p) => p.frequency === 'weekly' },
      { key: 'time', label: '시각', type: 'time', default: '09:00', required: true, showIf: (p) => p.frequency !== 'hourly' },
    ],
    summary: (p) =>
      p.frequency === 'hourly'
        ? `매시간 ${p.minute}분`
        : p.frequency === 'weekly'
          ? `매주 ${label(WEEKDAYS, p.weekday)} ${p.time}`
          : `매일 ${p.time}`,
  },
  webhook: {
    help: '받을 주소는 Workflow를 서버에 저장(6단계)한 뒤 만들어집니다.',
    fields: [
      {
        key: 'method',
        label: '받을 요청 방식',
        type: 'select',
        default: 'POST',
        options: METHODS.filter((m) => m.value === 'GET' || m.value === 'POST'),
      },
    ],
    summary: (p) => `${p.method} 요청을 받으면 시작`,
  },
  ifElse: {
    help: '앞 노드의 값은 {{input.이름}} 처럼 씁니다. 맞으면 YES, 아니면 NO로 갑니다.',
    fields: [
      { key: 'left', label: '비교할 값', type: 'text', default: '', required: true, placeholder: '{{input.status}}' },
      { key: 'operator', label: '조건', type: 'select', default: 'equals', options: OPERATORS },
      { key: 'right', label: '기준 값', type: 'text', default: '', placeholder: 'done', showIf: (p) => !NO_RIGHT_SIDE.includes(p.operator) },
    ],
    summary: (p) =>
      p.left ? `${p.left} ${label(OPERATORS, p.operator)}${NO_RIGHT_SIDE.includes(p.operator) ? '' : ` ${p.right}`}` : '',
  },
  switch: {
    help: '값이 어느 갈래의 "일치 값"과 같으면 그 갈래로, 아무것도 안 맞으면 "기본"으로 갑니다.',
    fields: [
      { key: 'value', label: '나눌 값', type: 'text', default: '', required: true, placeholder: '{{input.type}}' },
      {
        key: 'cases',
        label: '갈래',
        type: 'cases',
        default: [
          { id: 'case_1', label: '1', match: '' },
          { id: 'case_2', label: '2', match: '' },
        ],
      },
    ],
    summary: (p) => (p.value ? `${p.value} 로 ${p.cases.length + 1}갈래` : ''),
  },
  http: {
    help: '인증 키가 필요하면 9단계 Credentials에서 연결합니다. 여기에 키를 직접 넣지 마세요.',
    fields: [
      { key: 'method', label: '요청 방식', type: 'select', default: 'GET', options: METHODS },
      {
        key: 'url',
        label: '주소 (URL)',
        type: 'text',
        default: '',
        required: true,
        placeholder: 'https://api.example.com/items',
        pattern: { re: /^https?:\/\/\S+$/, message: 'http:// 또는 https:// 로 시작해야 합니다' },
      },
      { key: 'headers', label: '헤더 (JSON, 선택)', type: 'json', default: '', placeholder: '{ "Accept": "application/json" }' },
      { key: 'body', label: '보낼 내용 (선택)', type: 'textarea', default: '', showIf: (p) => p.method !== 'GET' },
      { key: 'timeoutSeconds', label: '제한 시간 (초)', type: 'number', default: 30, min: 1, max: 300, required: true },
    ],
    summary: (p) => (p.url ? `${p.method} ${p.url}` : ''),
  },
  gas: {
    help: 'Apps Script를 "웹 앱"으로 배포한 주소를 넣습니다. 연결 방식은 9단계에서 확정합니다.',
    fields: [
      {
        key: 'url',
        label: '웹 앱 주소',
        type: 'text',
        default: '',
        required: true,
        placeholder: 'https://script.google.com/macros/s/.../exec',
        pattern: { re: /^https:\/\/script\.google\.com\/\S+$/, message: 'https://script.google.com/ 으로 시작해야 합니다' },
      },
      { key: 'functionName', label: '실행할 함수 이름 (선택)', type: 'text', default: '', placeholder: 'main' },
      { key: 'payload', label: '보낼 값 (JSON, 선택)', type: 'json', default: '' },
    ],
    summary: (p) => (p.functionName ? `함수 ${p.functionName}` : p.url ? 'Apps Script 웹 앱' : ''),
  },
  githubActions: {
    help: 'GitHub 토큰은 9단계 Credentials에서 연결합니다.',
    fields: [
      {
        key: 'repo',
        label: '저장소 (owner/repo)',
        type: 'text',
        default: '',
        required: true,
        placeholder: 'jeong-jihyun/flowbuilder',
        pattern: { re: /^[\w.-]+\/[\w.-]+$/, message: 'owner/repo 모양이어야 합니다' },
      },
      { key: 'workflow', label: 'Workflow 파일', type: 'text', default: '', required: true, placeholder: 'deploy.yml' },
      { key: 'ref', label: '브랜치', type: 'text', default: 'main', required: true },
      { key: 'inputs', label: '입력값 (JSON, 선택)', type: 'json', default: '' },
    ],
    summary: (p) => (p.repo ? `${p.repo}${p.workflow ? ` · ${p.workflow}` : ''}` : ''),
  },
  transform: {
    help: '결과는 아래 JSON이 됩니다. 앞 노드의 값은 {{input.이름}} 처럼 씁니다.',
    fields: [
      {
        key: 'mapping',
        label: '결과 모양 (JSON)',
        type: 'json',
        default: '{\n  "result": "{{input}}"\n}',
        required: true,
      },
    ],
    summary: () => 'JSON 변환',
  },
  delay: {
    help: '최대 24시간까지 기다릴 수 있습니다.',
    fields: [
      { key: 'amount', label: '시간', type: 'number', default: 1, min: 1, required: true },
      { key: 'unit', label: '단위', type: 'select', default: 'minutes', options: DELAY_UNITS },
    ],
    summary: (p) => `${p.amount}${label(DELAY_UNITS, p.unit)} 대기`,
  },
};

function fieldsOf(kind) {
  return NODE_FIELDS[kind]?.fields || [];
}

// 저장된 값 + 빠진 항목은 기본값. (4단계에서 만든 노드에는 params 가 없다)
export function paramsOf(node) {
  const saved = node.data.params || {};
  const params = {};
  for (const f of fieldsOf(node.data.kind)) params[f.key] = saved[f.key] ?? f.default;
  return params;
}

export function defaultParams(kind) {
  return Object.fromEntries(fieldsOf(kind).map((f) => [f.key, f.default]));
}

export function visibleFields(kind, params) {
  return fieldsOf(kind).filter((f) => !f.showIf || f.showIf(params));
}

// 입력칸 하나 검사. 문제가 없으면 '' (자세한 흐름 검증은 7단계)
export function fieldError(field, value, params) {
  const empty = value === '' || value === null || value === undefined;
  if (empty) return field.required ? '꼭 넣어야 합니다' : '';

  if (field.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return '숫자를 넣어 주세요';
    if (field.min !== undefined && n < field.min) return `${field.min} 이상이어야 합니다`;
    if (field.max !== undefined && n > field.max) return `${field.max} 이하여야 합니다`;
  }
  if (field.type === 'json') {
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return '{ } 로 감싼 JSON이어야 합니다';
    } catch {
      return 'JSON 형식이 맞지 않습니다';
    }
  }
  if (field.pattern && !field.pattern.re.test(String(value).trim())) return field.pattern.message;
  if (field.type === 'cases') {
    if (value.some((c) => !String(c.label).trim())) return '갈래 이름을 모두 넣어 주세요';
  }
  // 대기 시간은 단위와 합쳐서 확인한다
  if (field.key === 'amount' && params?.unit) {
    const unit = DELAY_UNITS.find((u) => u.value === params.unit);
    if (unit && Number(value) * unit.sec > MAX_DELAY_SECONDS) return '24시간을 넘을 수 없습니다';
  }
  return '';
}

// 보이는 입력칸 중 문제가 있는 것의 개수
export function countProblems(node) {
  const params = paramsOf(node);
  return visibleFields(node.data.kind, params).filter((f) => fieldError(f, params[f.key], params)).length;
}

export function summaryOf(node) {
  const def = NODE_FIELDS[node.data.kind];
  return def ? def.summary(paramsOf(node)) : '';
}
