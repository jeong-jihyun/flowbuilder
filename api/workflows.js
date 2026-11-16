// 워크플로우 API (6단계): /api/workflows 아래 주소를 모두 이 파일 하나가 받는다.
// /api/workflows/... 는 vercel.json 에서 ?path=... 로 바꿔 이 파일로 보낸다.
//
// GET    /api/workflows[?groupId=]   내가 속한 그룹의 워크플로우 목록 (nodes·edges 제외)
// POST   /api/workflows              만들기 { groupId, name, description?, nodes?, edges? } (Editor 이상)
// GET    /api/workflows/:id          하나 불러오기 (멤버)
// PUT    /api/workflows/:id          저장 { version, name?, description?, nodes?, edges? } (Editor 이상)
// DELETE /api/workflows/:id          삭제 (Editor 이상)
// POST   /api/workflows/:id/validate 저장된 버전 검증 (멤버)
// POST   /api/workflows/:id/run      실행 시작 { input?, triggerNodeId? } (소유자·관리자·Editor, 8단계)
// POST   /api/workflows/:id/activate 자동 실행 켜기·끄기 { active } (Editor 이상, 9단계)
// GET    /api/workflows/:id/webhook?nodeId=   Webhook 주소 보기 (Editor 이상, 9단계)
// POST   /api/workflows/:id/webhook  Webhook 주소 새로 만들기 { nodeId } (Editor 이상, 9단계)
import { apiHandler, methodNotAllowed } from './_lib/http.js';
import { ApiError } from './_lib/errors.js';
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  validateSavedWorkflow,
} from './_lib/workflows.js';
import { startExecution } from './_lib/executions.js';
import { createWebhookPath, getWebhookPath, setWorkflowActive } from './_lib/automation.js';

export async function routeWorkflows({ db, userId, method, parts, query = {}, body = {} }) {
  const [id, sub, ...rest] = parts;
  const SUBS = ['validate', 'run', 'activate', 'webhook'];
  if (rest.length || (sub !== undefined && !SUBS.includes(sub))) throw new ApiError(404, 'NOT_FOUND');

  if (sub === 'activate') {
    if (method !== 'POST') throw methodNotAllowed('POST');
    return { status: 200, body: await setWorkflowActive(db, userId, id, body.active) };
  }
  if (sub === 'webhook') {
    const nodeId = method === 'GET' ? query.nodeId : body.nodeId;
    if (typeof nodeId !== 'string') throw new ApiError(400, 'NODE_ID_REQUIRED');
    if (method === 'GET') return { status: 200, body: { path: await getWebhookPath(db, userId, id, nodeId) } };
    if (method === 'POST') return { status: 201, body: { path: await createWebhookPath(db, userId, id, nodeId) } };
    throw methodNotAllowed('GET, POST');
  }

  if (sub === 'run') {
    if (method !== 'POST') throw methodNotAllowed('POST');
    return { status: 201, body: { execution: await startExecution(db, userId, id, body) } };
  }

  if (sub === 'validate') {
    if (method !== 'POST') throw methodNotAllowed('POST');
    return { status: 200, body: { validation: await validateSavedWorkflow(db, userId, id) } };
  }

  if (id === undefined) {
    if (method === 'GET') {
      const groupId = typeof query.groupId === 'string' && query.groupId ? query.groupId : undefined;
      return { status: 200, body: { workflows: await listWorkflows(db, userId, groupId) } };
    }
    if (method === 'POST') return { status: 201, body: { workflow: await createWorkflow(db, userId, body) } };
    throw methodNotAllowed('GET, POST');
  }

  if (method === 'GET') return { status: 200, body: { workflow: await getWorkflow(db, userId, id) } };
  if (method === 'PUT') return { status: 200, body: { workflow: await updateWorkflow(db, userId, id, body) } };
  if (method === 'DELETE') {
    await deleteWorkflow(db, userId, id);
    return { status: 200, body: {} };
  }
  throw methodNotAllowed('GET, PUT, DELETE');
}

export default apiHandler('/api/workflows', routeWorkflows);
