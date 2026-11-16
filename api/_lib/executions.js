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
import { loadSecret } from './credentials.js';

export const RUN_LIMITS = {
  activePerWorkflow: 3, // 동시에 진행 중인 실행
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
    source: ex.source || 'manual',
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
  // 인증정보는 이 실행의 그룹 것만 꺼낼 수 있다
  const getCredential = (id, type) => loadSecret(db, ex.groupId, id, type);
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
      result = await executeNode(node, item.input, { state: step, now: clock(), deadline, getCredential });
    } catch (err) {
      result = { status: 'failed', error: err?.message || String(err) };
    }

    if (result.status === 'waiting') {
      // 기다리는 동안 실행 전체가 멈춘다 (지금 엔진은 한 줄로 처리)
      step.status = 'waiting';
      step.resumeAt = result.resumeAt;
      if (result.state) step.runner = result.state;
      status = 'waiting';
      resumeAt = result.resumeAt;
      break;
    }

    step.finishedAt = new Date(clock());
    delete step.resumeAt;
    delete step.runner;
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

// 실행 하나를 만든다. 사람이 누른 Run, Webhook, 예약 실행이 모두 여기를 거친다 (9단계).
// source: 'manual' | 'webhook' | 'schedule'. webhook·schedule은 그 Trigger 노드를 꼭 지정한다.
export async function launchExecution(db, wf, { input: rawInput, triggerNodeId, startedBy, source = 'manual', budgetMs = RUN_LIMITS.budgetMs }) {
  const input = rawInput === undefined ? {} : rawInput;
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'INVALID_INPUT', '{ } 모양의 JSON');
  if (JSON.stringify(input).length > RUN_LIMITS.inputBytes) throw new ApiError(400, 'INVALID_INPUT', '10KB까지');

  // 설계 7.1: 실행 전 유효성 검사. 오류가 있으면 실행하지 않는다.
  const validation = validateWorkflow(wf.nodes, wf.edges);
  if (!validation.ok) throw new ApiError(400, 'VALIDATION_FAILED', `오류 ${validation.errors.length}개`);

  // 시작할 Trigger: 고른 것 → 없으면 Manual → 없으면 첫 Trigger
  const triggers = wf.nodes.filter((n) => NODE_KIND_INFO[n.data.kind]?.category === 'trigger');
  const trigger =
    triggers.find((n) => n.id === triggerNodeId) || triggers.find((n) => n.data.kind === 'manual') || triggers[0];
  if (triggerNodeId && trigger.id !== triggerNodeId) throw new ApiError(400, 'INVALID_TRIGGER');
  if (source !== 'manual' && trigger.data.kind !== source) throw new ApiError(400, 'INVALID_TRIGGER');

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
    source,
    input,
    startedBy,
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

  return advanceExecution(db, insertedId, budgetMs);
}

// Run 버튼: 저장된 Workflow를 실행한다. 저장 안 된 화면 내용은 실행하지 않는다.
export async function startExecution(db, userId, workflowId, body = {}) {
  const { wf, role } = await loadWithRole(db, userId, workflowId, 'view');
  if (!can(role, 'run')) throw new ApiError(403, 'FORBIDDEN');
  const ex = await launchExecution(db, wf, { input: body.input, triggerNodeId: body.triggerNodeId, startedBy: userId });
  return view(ex, { full: true });
}

// 서버 주기 작업(9단계): 아무도 보고 있지 않은 실행을 이어서 진행한다.
// 잠겨 있지 않고, 진행 중이거나 기다릴 시각이 지난 실행을 오래된 것부터 처리한다.
export async function advanceDueExecutions(db, { budgetMs = 20_000, perExecutionMs = 5_000 } = {}) {
  const started = Date.now();
  const now = clock();
  const due = await executions(db)
    .find(
      { lockUntil: { $lt: now }, $or: [{ status: 'running' }, { status: 'waiting', resumeAt: { $lte: now } }] },
      { projection: { _id: 1 } }
    )
    .sort({ updatedAt: 1 })
    .limit(20)
    .toArray();
  let advanced = 0;
  for (const { _id } of due) {
    if (Date.now() - started > budgetMs) break;
    await advanceExecution(db, _id, perExecutionMs);
    advanced++;
  }
  return { due: due.length, advanced };
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

const STATUSES = ['running', 'waiting', 'success', 'failed', 'cancelled'];
export const OLD_DAYS = 30; // 이보다 오래된 기록은 "정리를 권함"으로 알린다 (시스템이 지우지는 않음)
const DAY_MS = 24 * 3600 * 1000;
export const LIST_PAGE = 20;
export const LIST_MAX = 50;

// 목록: 최신순. status(상태 거르기), before(이 시각보다 먼저 시작한 것, 다음 쪽), limit(최대 50)
export async function listExecutions(db, userId, { workflowId, status, before, limit } = {}) {
  let filter;
  if (workflowId) {
    const { wf } = await loadWithRole(db, userId, workflowId, 'view');
    filter = { workflowId: wf._id };
  } else {
    const roles = await myRoles(db, userId);
    filter = { groupId: { $in: [...roles.keys()].map((g) => toObjectId(g)) } };
  }
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw new ApiError(400, 'INVALID_STATUS');
    filter.status = status;
  }
  const page = { ...filter };
  if (before !== undefined) {
    const d = new Date(before);
    if (Number.isNaN(d.getTime())) throw new ApiError(400, 'INVALID_BEFORE');
    page.createdAt = { $lt: d };
  }
  const n = Math.min(LIST_MAX, Math.max(1, Math.floor(Number(limit)) || LIST_PAGE));
  const scope = workflowId ? { workflowId: filter.workflowId } : { groupId: filter.groupId };
  const [rows, total, failed, oldCount] = await Promise.all([
    executions(db).find(page, { projection: { graph: 0, queue: 0, input: 0 } }).sort({ createdAt: -1 }).limit(n + 1).toArray(),
    executions(db).countDocuments(scope),
    executions(db).countDocuments({ ...scope, status: 'failed' }),
    executions(db).countDocuments({ ...scope, status: { $nin: ACTIVE }, createdAt: { $lt: new Date(clock() - OLD_DAYS * DAY_MS) } }),
  ]);
  const list = rows.slice(0, n);
  const hasMore = rows.length > n;
  return { executions: list.map((ex) => view(ex)), counts: { total, failed, old: oldCount }, hasMore };
}

// 삭제는 사용자가 직접 한다. 시스템이 기록을 자동으로 지우지 않는다.
// 하나 삭제: Owner·Admin·Editor. 진행 중인 실행은 먼저 취소해야 한다.
export async function deleteExecution(db, userId, id) {
  const ex = await loadExecution(db, userId, id, 'edit');
  if (ACTIVE.includes(ex.status)) throw new ApiError(409, 'EXECUTION_ACTIVE');
  await executions(db).deleteOne({ _id: ex._id, status: { $nin: ACTIVE } });
}

// N일보다 오래된, 끝난 기록 한꺼번에 삭제: 멤버 관리 권한(Owner·Admin)이 있는 그룹의 것만
export async function deleteOldExecutions(db, userId, { olderThanDays } = {}) {
  const days = Math.floor(Number(olderThanDays));
  if (!Number.isFinite(days) || days < 7) throw new ApiError(400, 'INVALID_DAYS');
  const roles = await myRoles(db, userId);
  const groupIds = [...roles.entries()].filter(([, role]) => can(role, 'manageMembers')).map(([g]) => toObjectId(g));
  if (groupIds.length === 0) throw new ApiError(403, 'FORBIDDEN');
  const { deletedCount } = await executions(db).deleteMany({
    groupId: { $in: groupIds },
    status: { $nin: ACTIVE },
    createdAt: { $lt: new Date(clock() - days * DAY_MS) },
  });
  return { deleted: deletedCount };
}

// 끝난 실행을 같은 입력·같은 Trigger로 다시 실행한다 (저장된 최신 버전으로). 새 실행 기록이 생긴다.
export async function retryExecution(db, userId, id) {
  const ex = await loadExecution(db, userId, id, 'run');
  if (ACTIVE.includes(ex.status)) throw new ApiError(409, 'EXECUTION_ACTIVE');
  const { wf } = await loadWithRole(db, userId, String(ex.workflowId), 'view');
  const next = await launchExecution(db, wf, { input: ex.input, triggerNodeId: ex.triggerNodeId, startedBy: userId });
  return view(next, { full: true });
}
