// 자동 실행 (9단계): "자동 실행" 켜기·끄기, Webhook 주소, 예약 실행(Schedule).
// 자동 실행이 켜진(status: 'active') Workflow만 Webhook·예약으로 시작한다.
import { ApiError } from './errors.js';
import { decrypt, encrypt, randomToken, sha256 } from './crypto.js';
import { loadWithRole } from './workflows.js';
import { launchExecution } from './executions.js';
import { validateWorkflow } from '../../shared/validator.js';
import { paramsOf } from '../../shared/nodeFields.js';

const KST_OFFSET = 9 * 3600 * 1000; // 한국 시간 (서머타임 없음)
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// 예약 시각에서 이만큼 넘게 늦었으면 실행하지 않고 건너뛴다 (서버가 오래 멈췄다 깨어난 경우)
export const SCHEDULE_GRACE_MS = HOUR;

const tokens = (db) => db.collection('webhook_tokens');
const workflows = (db) => db.collection('workflows');

// ── 자동 실행 켜기·끄기 ──

export async function setWorkflowActive(db, userId, id, active) {
  const { wf } = await loadWithRole(db, userId, id, 'edit');
  if (typeof active !== 'boolean') throw new ApiError(400, 'INVALID_ACTIVE');
  if (active) {
    // 켤 때 검증: 오류가 있으면 켜지 않는다
    const validation = validateWorkflow(wf.nodes, wf.edges);
    if (!validation.ok) throw new ApiError(400, 'VALIDATION_FAILED', `오류 ${validation.errors.length}개`);
  }
  const now = new Date();
  await workflows(db).updateOne(
    { _id: wf._id },
    active ? { $set: { status: 'active', activatedAt: now } } : { $set: { status: 'draft' }, $unset: { activatedAt: '' } }
  );
  return { status: active ? 'active' : 'draft' };
}

// ── Webhook 주소 ──
// 주소: /api/hooks/<토큰>. 토큰은 해시로 찾고, 다시 보여 줄 수 있게 암호화해서도 둔다.

function webhookNode(wf, nodeId) {
  const node = wf.nodes.find((n) => n.id === nodeId);
  if (!node || node.data.kind !== 'webhook') throw new ApiError(404, 'WEBHOOK_NODE_NOT_FOUND');
  return node;
}

export async function getWebhookPath(db, userId, id, nodeId) {
  const { wf } = await loadWithRole(db, userId, id, 'edit');
  webhookNode(wf, nodeId);
  const rec = await tokens(db).findOne({ workflowId: wf._id, nodeId });
  return rec ? `/api/hooks/${decrypt(rec.box)}` : null;
}

// 새 주소 만들기 (있으면 바꾼다 → 이전 주소는 더 이상 안 됨)
export async function createWebhookPath(db, userId, id, nodeId) {
  const { wf } = await loadWithRole(db, userId, id, 'edit');
  webhookNode(wf, nodeId);
  const token = randomToken();
  const box = encrypt(token);
  await tokens(db).deleteMany({ workflowId: wf._id, nodeId });
  await tokens(db).insertOne({ tokenHash: sha256(token), box, workflowId: wf._id, groupId: wf.groupId, nodeId, createdBy: userId, createdAt: new Date() });
  return `/api/hooks/${token}`;
}

// Webhook으로 들어온 요청 → 실행. 로그인 없이 부르므로 토큰이 곧 열쇠다.
export async function runWebhook(db, token, { method, body, query }) {
  if (typeof token !== 'string' || token.length < 20) throw new ApiError(404, 'WEBHOOK_NOT_FOUND');
  const rec = await tokens(db).findOne({ tokenHash: sha256(token) });
  if (!rec) throw new ApiError(404, 'WEBHOOK_NOT_FOUND');
  const wf = await workflows(db).findOne({ _id: rec.workflowId });
  const node = wf?.nodes.find((n) => n.id === rec.nodeId && n.data.kind === 'webhook');
  if (!node) throw new ApiError(404, 'WEBHOOK_NOT_FOUND');
  if (wf.status !== 'active') throw new ApiError(409, 'WORKFLOW_INACTIVE');
  const expected = paramsOf(node).method || 'POST';
  if (method !== expected) {
    const err = new ApiError(405, 'METHOD_NOT_ALLOWED');
    err.allow = expected;
    throw err;
  }
  const input = { body: body ?? null, query: query || {} };
  return launchExecution(db, wf, { input, triggerNodeId: node.id, startedBy: 'webhook', source: 'webhook', budgetMs: 8_000 });
}

// ── 예약 실행 ──

// 지금(now) 또는 그 전의 가장 가까운 예약 시각(ms). 시각 계산은 한국 시간 기준.
export function lastSlot(params, now) {
  const k = new Date(now + KST_OFFSET); // UTC 필드를 한국 시간처럼 읽는다
  const at = (h, m) => Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), h, m) - KST_OFFSET;
  if (params.frequency === 'hourly') {
    let slot = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), k.getUTCHours(), Number(params.minute) || 0) - KST_OFFSET;
    if (slot > now) slot -= HOUR;
    return slot;
  }
  const [h, m] = String(params.time || '09:00').split(':').map(Number);
  if (params.frequency === 'weekly') {
    const target = WEEKDAYS.indexOf(params.weekday);
    const back = (k.getUTCDay() - (target < 0 ? 1 : target) + 7) % 7;
    let slot = at(h, m) - back * DAY;
    if (slot > now) slot -= 7 * DAY;
    return slot;
  }
  let slot = at(h, m);
  if (slot > now) slot -= DAY;
  return slot;
}

// MongoDB 필드 이름에 . 을 쓸 수 없어서 바꿔 쓴다
const stateKey = (nodeId) => `scheduleState.${nodeId.replace(/\./g, '%2E')}`;

// 자동 실행이 켜진 Workflow의 Schedule 노드 중 시각이 된 것을 실행한다.
export async function runSchedules(db, now = Date.now()) {
  const list = await workflows(db)
    .find({ status: 'active', 'nodes.data.kind': 'schedule' })
    .limit(200)
    .toArray();
  const result = { started: 0, skipped: 0, failed: [] };
  for (const wf of list) {
    for (const node of wf.nodes.filter((n) => n.data.kind === 'schedule')) {
      const slot = lastSlot(paramsOf(node), now);
      // 켜기 전의 시각은 실행하지 않는다
      if (wf.activatedAt && slot < new Date(wf.activatedAt).getTime()) continue;
      const key = stateKey(node.id);
      // 같은 시각을 두 번 실행하지 않게 먼저 "이 시각은 내가 맡았다"고 기록한다
      const claimed = await workflows(db).updateOne(
        { _id: wf._id, status: 'active', $or: [{ [key]: { $exists: false } }, { [key]: { $lt: slot } }] },
        { $set: { [key]: slot } }
      );
      if (claimed.modifiedCount === 0) continue;
      if (now - slot > SCHEDULE_GRACE_MS) {
        result.skipped++;
        continue;
      }
      try {
        await launchExecution(db, wf, { input: { scheduledAt: new Date(slot).toISOString() }, triggerNodeId: node.id, startedBy: 'schedule', source: 'schedule', budgetMs: 3_000 });
        result.started++;
      } catch (err) {
        result.failed.push({ workflowId: String(wf._id), nodeId: node.id, error: err.code || err.message });
      }
    }
  }
  return result;
}
