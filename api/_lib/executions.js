// 실행 엔진 (Execution Orchestrator, 8단계). 설계 7.1 흐름을 따른다:
// 요청 → 인증 → 그룹 권한 → Workflow 조회 → 검증 → Execution 생성 → 노드 실행 → 결과 저장 → 완료/실패
//
// Vercel 함수는 오래 돌 수 없으므로 한 번에 정해진 시간(budget)만큼만 노드를 처리하고 상태를 저장한다.
// 남은 일은 다음 요청(화면이 상태를 물어볼 때 등)에서 이어서 한다. Delay처럼 기다리는 노드도 같은 방식.
import { ApiError } from './errors.js';
import { myRoles, toObjectId } from './groups.js';
import { can } from './roles.js';
import { loadWithRole } from './workflows.js';
import { validateWorkflow } from '../../shared/validator.js';
import { NODE_KIND_INFO } from '../../shared/nodeKinds.js';
import { executeNode } from './engine/executors.js';

export const RUN_LIMITS = {
  activePerWorkflow: 3, // 동시에 진행 중인 실행
  keepPerWorkflow: 50, // Workflow마다 남기는 실행 기록 (10단계에서 30일 자동 삭제 추가)
  outputBytes: 2000, // 노드 결과는 앞부분 2KB까지만 저장 (DB 용량 정책)
  inputBytes: 10_000,
  budgetMs: 20_000, // 실행 시작 요청 한 번에 쓰는 시간
  tickBudgetMs: 8_000, // 상태 조회 때 이어서 처리하는 시간
  lockMs: 40_000, // 한 실행을 두 요청이 동시에 처리하지 않게 잠그는 시간
};

const ACTIVE = ['running', 'waiting'];
const executions = (db) => db.collection('executions');

// 시험에서 시각을 바꿔 끼울 수 있게
let clock = () => Date.now();
export function setClock(fn) {
  clock = fn || (() => Date.now());
}

// 결과가 크면 앞부분만 남긴다
function truncate(value) {
  if (value === undefined) return undefined;
  const text = JSON.stringify(value);
  if (text === undefined || text.length <= RUN_LIMITS.outputBytes) return value;
  return { _truncated: true, preview: text.slice(0, RUN_LIMITS.outputBytes) };
}

function view(ex, { full = false } = {}) {
  return {
    id: String(ex._id),
    workflowId: String(ex.workflowId),
    workflowName: ex.workflowName,
    workflowVersion: ex.workflowVersion,
    status: ex.status,
    triggerNodeId: ex.triggerNodeId,
    startedBy: ex.startedBy,
    createdAt: ex.createdAt,
    finishedAt: ex.finishedAt,
    resumeAt: ex.resumeAt ? new Date(ex.resumeAt) : null,
    error: ex.error,
    stepCount: ex.steps?.length ?? 0,
    ...(full && { input: ex.input, steps: ex.steps }),
  };
}

// 실행 기록 하나 + 내 역할. 그룹 멤버가 아니면 404.
async function loadExecution(db, userId, id, action) {
  const _id = toObjectId(id, 'EXECUTION_NOT_FOUND');
  const ex = await executions(db).findOne({ _id });
  if (!ex) throw new ApiError(404, 'EXECUTION_NOT_FOUND');
  const membership = await db.collection('group_members').findOne({ groupId: ex.groupId, userId });
  if (!membership) throw new ApiError(404, 'EXECUTION_NOT_FOUND');
  if (!can(membership.role, action)) throw new ApiError(403, 'FORBIDDEN');
  return ex;
}

// 정해진 시간 동안 노드를 처리한다. 다른 요청이 처리 중이면 아무것도 하지 않는다.
export async function advanceExecution(db, _id, budgetMs) {
  const now = clock();
  const ex = await executions(db).findOneAndUpdate(
    {
      _id,
      lockUntil: { $lt: now },
      $or: [{ status: 'running' }, { status: 'waiting', resumeAt: { $lte: now } }],
    },
    { $set: { lockUntil: now + RUN_LIMITS.lockMs } },
    { returnDocument: 'after' }
  );
  if (!ex) return executions(db).findOne({ _id });

  const deadline = Date.now() + budgetMs;
  const nodes = new Map(ex.graph.nodes.map((n) => [n.id, n]));
  const outgoing = new Map();
  for (const e of ex.graph.edges) {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source).push(e);
  }
  const steps = ex.steps;
  const queue = ex.queue;
  let status = 'running';
  let error = null;
  let resumeAt = null;

  while (queue.length > 0 && Date.now() < deadline) {
    const item = queue[0];
    const node = nodes.get(item.nodeId);
    let step = steps.find((s) => s.nodeId === node.id);
    if (!step) {
      step = { nodeId: node.id, label: node.data.label, kind: node.data.kind, status: 'running', startedAt: new Date(clock()) };
      steps.push(step);
    }

    let result;
    try {
      result = await executeNode(node, item.input, { state: step, now: clock(), deadline });
    } catch (err) {
      result = { status: 'failed', error: err?.message || String(err) };
    }

    if (result.status === 'waiting') {
      // 기다리는 동안 실행 전체가 멈춘다 (지금 엔진은 한 줄로 처리)
      step.status = 'waiting';
      step.resumeAt = result.resumeAt;
      status = 'waiting';
      resumeAt = result.resumeAt;
      break;
    }

    step.finishedAt = new Date(clock());
    delete step.resumeAt;
    if (result.output !== undefined) step.output = truncate(result.output);

    if (result.status === 'failed') {
      step.status = 'failed';
      step.error = result.error;
      status = 'failed';
      error = `"${node.data.label}": ${result.error}`;
      queue.length = 0;
      break;
    }

    step.status = 'success';
    if (result.branch !== undefined) step.branch = result.branch;
    queue.shift();
    // 다음 노드: 조건 노드는 고른 갈래로만. 이미 실행했거나 대기 중인 노드는 다시 넣지 않는다(먼저 온 쪽 기준).
    for (const e of outgoing.get(node.id) || []) {
      if (result.branch !== undefined && (e.sourceHandle ?? null) !== result.branch) continue;
      if (steps.some((s) => s.nodeId === e.target) || queue.some((q) => q.nodeId === e.target)) continue;
      queue.push({ nodeId: e.target, input: result.output });
    }
  }

  const changes = { steps, queue, status, error, resumeAt, lockUntil: 0, updatedAt: new Date(clock()) };
  const done = status === 'failed' || (status === 'running' && queue.length === 0);
  if (done) {
    if (status === 'running') changes.status = 'success';
    changes.finishedAt = new Date(clock());
    // 실행하지 않은 노드는 "건너뜀"으로 남긴다 (고르지 않은 갈래, 실패 뒤 노드)
    for (const n of ex.graph.nodes) {
      if (!steps.some((s) => s.nodeId === n.id)) steps.push({ nodeId: n.id, label: n.data.label, kind: n.data.kind, status: 'skipped' });
    }
  }

  // 끝났으면 실행용 복사본(graph)과 대기열은 지워 DB 용량을 아낀다
  if (done) delete changes.queue;
  const update = done ? { $set: changes, $unset: { graph: '', queue: '' } } : { $set: changes };
  // 처리하는 사이 누가 취소했으면 덮어쓰지 않는다
  await executions(db).updateOne({ _id, status: { $ne: 'cancelled' } }, update);
  return executions(db).findOne({ _id });
}

// Run: 저장된 Workflow를 실행한다. 저장 안 된 화면 내용은 실행하지 않는다.
export async function startExecution(db, userId, workflowId, body = {}) {
  const { wf, role } = await loadWithRole(db, userId, workflowId, 'view');
  if (!can(role, 'run')) throw new ApiError(403, 'FORBIDDEN');

  const input = body.input === undefined ? {} : body.input;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'INVALID_INPUT', '{ } 모양의 JSON');
  if (JSON.stringify(input).length > RUN_LIMITS.inputBytes) throw new ApiError(400, 'INVALID_INPUT', '10KB까지');

  // 설계 7.1: 실행 전 유효성 검사. 오류가 있으면 실행하지 않는다.
  const validation = validateWorkflow(wf.nodes, wf.edges);
  if (!validation.ok) throw new ApiError(400, 'VALIDATION_FAILED', `오류 ${validation.errors.length}개`);

  // 시작할 Trigger: 고른 것 → 없으면 Manual → 없으면 첫 Trigger
  const triggers = wf.nodes.filter((n) => NODE_KIND_INFO[n.data.kind]?.category === 'trigger');
  const trigger =
    triggers.find((n) => n.id === body.triggerNodeId) || triggers.find((n) => n.data.kind === 'manual') || triggers[0];
  if (body.triggerNodeId && trigger.id !== body.triggerNodeId) throw new ApiError(400, 'INVALID_TRIGGER');

  const active = await executions(db).countDocuments({ workflowId: wf._id, status: { $in: ACTIVE } });
  if (active >= RUN_LIMITS.activePerWorkflow) {
    throw new ApiError(409, 'TOO_MANY_RUNNING', `동시에 ${RUN_LIMITS.activePerWorkflow}개까지`);
  }

  const now = new Date(clock());
  const doc = {
    workflowId: wf._id,
    groupId: wf.groupId,
    workflowName: wf.name,
    workflowVersion: wf.version,
    status: 'running',
    triggerNodeId: trigger.id,
    input,
    startedBy: userId,
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    error: null,
    resumeAt: null,
    lockUntil: 0,
    // 실행 중에 Workflow를 고쳐도 영향 없게 시작할 때의 모습을 복사해 둔다 (끝나면 지움)
    graph: { nodes: wf.nodes, edges: wf.edges },
    queue: [{ nodeId: trigger.id, input }],
    steps: [],
  };
  const { insertedId } = await executions(db).insertOne(doc);

  // 오래된 기록 정리: Workflow마다 최근 50개만
  const old = await executions(db)
    .find({ workflowId: wf._id, status: { $nin: ACTIVE } }, { projection: { _id: 1 } })
    .sort({ createdAt: -1 })
    .skip(RUN_LIMITS.keepPerWorkflow)
    .toArray();
  if (old.length) await executions(db).deleteMany({ _id: { $in: old.map((o) => o._id) } });

  const ex = await advanceExecution(db, insertedId, RUN_LIMITS.budgetMs);
  return view(ex, { full: true });
}

// 상태 조회. 진행 중이고 처리할 차례면 조금 더 진행시킨 뒤 돌려준다.
export async function getExecution(db, userId, id) {
  let ex = await loadExecution(db, userId, id, 'view');
  const due = ex.status === 'running' || (ex.status === 'waiting' && ex.resumeAt <= clock());
  if (due && ex.lockUntil < clock()) ex = await advanceExecution(db, ex._id, RUN_LIMITS.tickBudgetMs);
  return view(ex, { full: true });
}

export async function cancelExecution(db, userId, id) {
  const ex = await loadExecution(db, userId, id, 'run');
  if (!ACTIVE.includes(ex.status)) throw new ApiError(409, 'ALREADY_FINISHED');
  const now = new Date(clock());
  const steps = ex.steps.map((s) => (s.status === 'running' || s.status === 'waiting' ? { ...s, status: 'cancelled', finishedAt: now } : s));
  await executions(db).updateOne(
    { _id: ex._id, status: { $in: ACTIVE } },
    { $set: { status: 'cancelled', finishedAt: now, updatedAt: now, steps, lockUntil: 0 }, $unset: { graph: '', queue: '' } }
  );
  return view(await executions(db).findOne({ _id: ex._id }), { full: true });
}

// 목록: workflowId 를 주면 그 Workflow의 최근 20개, 아니면 내 그룹 전체의 최근 20개 + 개수
export async function listExecutions(db, userId, { workflowId } = {}) {
  let filter;
  if (workflowId) {
    const { wf } = await loadWithRole(db, userId, workflowId, 'view');
    filter = { workflowId: wf._id };
  } else {
    const roles = await myRoles(db, userId);
    filter = { groupId: { $in: [...roles.keys()].map((g) => toObjectId(g)) } };
  }
  const [list, total, failed] = await Promise.all([
    executions(db).find(filter, { projection: { graph: 0, queue: 0, input: 0 } }).sort({ createdAt: -1 }).limit(20).toArray(),
    executions(db).countDocuments(filter),
    executions(db).countDocuments({ ...filter, status: 'failed' }),
  ]);
  return { executions: list.map((ex) => view(ex)), counts: { total, failed } };
}
