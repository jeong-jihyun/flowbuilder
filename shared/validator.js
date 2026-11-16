// 워크플로우 검증 (7단계). 화면의 Validate 버튼과 서버(/api/workflows/:id/validate, 8단계 실행 전 확인)가 같이 쓴다.
// 결과: { ok, errors: [Issue], warnings: [Issue] }
// Issue: { level, code, message, nodeId?, edgeId? }
//   error   — 이대로는 실행할 수 없음 (8단계 Run이 막는다)
//   warning — 실행은 되지만 의도와 다를 수 있음
import { fieldError, paramsOf, visibleFields } from './nodeFields.js';
import { NODE_KIND_INFO, outputsOf } from './nodeKinds.js';

function nameOf(node) {
  return `"${node.data?.label || node.id}"`;
}

// 강하게 연결된 묶음(Tarjan). 묶음 크기가 2 이상이면 순환이다.
function findCycles(nodeIds, next) {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const cycles = [];

  function visit(v) {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of next.get(v) || []) {
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v), low.get(w)));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v), idx.get(w)));
      }
    }
    if (low.get(v) === idx.get(v)) {
      const group = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) cycles.push(group.reverse());
    }
  }

  for (const id of nodeIds) if (!idx.has(id)) visit(id);
  return cycles;
}

export function validateWorkflow(nodes = [], edges = []) {
  const errors = [];
  const warnings = [];
  const error = (code, message, at = {}) => errors.push({ level: 'error', code, message, ...at });
  const warn = (code, message, at = {}) => warnings.push({ level: 'warning', code, message, ...at });

  if (nodes.length === 0) {
    error('EMPTY', '노드가 하나도 없습니다. 시작 노드부터 추가하세요.');
    return { ok: false, errors, warnings };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const known = nodes.filter((n) => NODE_KIND_INFO[n.data?.kind]);

  // 1. 노드 종류
  for (const n of nodes) {
    const info = NODE_KIND_INFO[n.data?.kind];
    if (!info) error('UNKNOWN_NODE', `${nameOf(n)}: 알 수 없는 노드 종류(${n.data?.kind})입니다.`, { nodeId: n.id });
    else if (n.type !== info.category) error('UNKNOWN_NODE', `${nameOf(n)}: 노드 분류가 맞지 않습니다.`, { nodeId: n.id });
  }

  // 2. 시작점
  const triggers = known.filter((n) => NODE_KIND_INFO[n.data.kind].category === 'trigger');
  if (triggers.length === 0) error('NO_TRIGGER', 'Trigger 노드가 없습니다. 흐름이 어디서 시작할지 알 수 없습니다.');
  if (triggers.length > 1) {
    warn('MULTIPLE_TRIGGERS', `시작 노드가 ${triggers.length}개입니다. 각 시작 노드는 자기 뒤의 흐름만 따로 실행합니다.`);
  }

  // 3. 노드 이름·설정값
  for (const n of known) {
    if (!String(n.data.label || '').trim()) error('NAME_REQUIRED', `노드 ${n.id}: 이름이 비어 있습니다.`, { nodeId: n.id });
    const params = paramsOf(n);
    for (const f of visibleFields(n.data.kind, params)) {
      const problem = fieldError(f, params[f.key], params);
      if (problem) error('INVALID_PARAM', `${nameOf(n)} · ${f.label}: ${problem}`, { nodeId: n.id });
    }
  }

  // 4. 연결선
  const next = new Map(nodes.map((n) => [n.id, []]));
  const seen = new Set();
  for (const e of edges) {
    const source = byId.get(e.source);
    const target = byId.get(e.target);
    if (!source || !target) {
      error('BROKEN_EDGE', '없는 노드에 이어진 연결선이 있습니다.', { edgeId: e.id });
      continue;
    }
    if (e.source === e.target) {
      error('SELF_LOOP', `${nameOf(source)}: 자기 자신에게 이어져 있습니다.`, { nodeId: source.id, edgeId: e.id });
      continue;
    }
    if (NODE_KIND_INFO[target.data?.kind]?.category === 'trigger') {
      error('INTO_TRIGGER', `${nameOf(target)}: 시작 노드에는 들어오는 선을 이을 수 없습니다.`, { nodeId: target.id, edgeId: e.id });
    }
    if (NODE_KIND_INFO[source.data?.kind]) {
      const handle = e.sourceHandle ?? null;
      if (!outputsOf(source).some((o) => o.id === handle)) {
        error('INVALID_OUTPUT', `${nameOf(source)}: 없어진 출구(${handle})에서 나가는 선이 있습니다.`, {
          nodeId: source.id,
          edgeId: e.id,
        });
      }
    }
    const key = `${e.source}|${e.sourceHandle ?? ''}|${e.target}`;
    if (seen.has(key)) warn('DUPLICATE_EDGE', `${nameOf(source)} → ${nameOf(target)} 연결이 두 번 있습니다.`, { edgeId: e.id });
    seen.add(key);
    next.get(e.source).push(e.target);
  }

  // 5. 순환: 지금 실행 엔진은 되돌아가는 흐름(반복)을 지원하지 않는다
  for (const cycle of findCycles(nodes.map((n) => n.id), next)) {
    const names = cycle.map((id) => nameOf(byId.get(id))).join(' → ');
    error('CYCLE', `순환 연결이 있습니다: ${names}. 흐름은 한 방향으로만 이어져야 합니다.`, { nodeId: cycle[0] });
  }

  // 6. 시작 노드에서 닿지 않는 노드는 실행되지 않는다
  const reached = new Set();
  const queue = triggers.map((t) => t.id);
  while (queue.length) {
    const id = queue.shift();
    if (reached.has(id)) continue;
    reached.add(id);
    queue.push(...next.get(id));
  }
  for (const n of known) {
    if (!reached.has(n.id) && NODE_KIND_INFO[n.data.kind].category !== 'trigger' && triggers.length > 0) {
      warn('UNREACHABLE', `${nameOf(n)}: 시작 노드에서 이어지지 않아 실행되지 않습니다.`, { nodeId: n.id });
    }
  }

  // 7. 비어 있는 출구
  for (const n of known) {
    const info = NODE_KIND_INFO[n.data.kind];
    const used = new Set(edges.filter((e) => e.source === n.id).map((e) => e.sourceHandle ?? null));
    if (info.category === 'trigger' && used.size === 0) {
      warn('TRIGGER_ALONE', `${nameOf(n)}: 뒤에 이어진 노드가 없어 시작해도 아무 일도 하지 않습니다.`, { nodeId: n.id });
    }
    if (info.category === 'condition') {
      const empty = outputsOf(n).filter((o) => !used.has(o.id));
      if (empty.length > 0) {
        warn('OPEN_BRANCH', `${nameOf(n)}: ${empty.map((o) => o.label).join(', ')} 갈래가 비어 있습니다. 그 경우 흐름이 끝납니다.`, {
          nodeId: n.id,
        });
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
