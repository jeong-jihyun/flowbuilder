// Workflow API (6단계): /api/workflows 아래 주소를 모두 이 파일 하나가 받는다.
// /api/workflows/... 는 vercel.json 에서 ?path=... 로 바꿔 이 파일로 보낸다.
//
// GET    /api/workflows[?groupId=]   내가 속한 그룹의 Workflow 목록 (nodes·edges 제외)
// POST   /api/workflows              만들기 { groupId, name, description?, nodes?, edges? } (Editor 이상)
// GET    /api/workflows/:id          하나 불러오기 (멤버)
// PUT    /api/workflows/:id          저장 { version, name?, description?, nodes?, edges? } (Editor 이상)
// DELETE /api/workflows/:id          삭제 (Editor 이상)
import { apiHandler, methodNotAllowed } from './_lib/http.js';
import { ApiError } from './_lib/errors.js';
import { createWorkflow, deleteWorkflow, getWorkflow, listWorkflows, updateWorkflow } from './_lib/workflows.js';

export async function routeWorkflows({ db, userId, method, parts, query = {}, body = {} }) {
  const [id, ...rest] = parts;
  if (rest.length) throw new ApiError(404, 'NOT_FOUND');

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
