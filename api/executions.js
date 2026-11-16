// 실행 기록 API (8단계): /api/executions 아래 주소를 모두 이 파일 하나가 받는다.
// 실행 시작은 POST /api/workflows/:id/run (api/workflows.js).
//
// GET  /api/executions[?workflowId=&status=&before=&limit=]  최신순 목록(기본 20, 최대 50) + 개수 + hasMore (멤버)
// GET  /api/executions/:id             실행 상태·노드별 결과. 진행 중이면 조금 더 진행시킨 뒤 돌려준다 (멤버)
// POST /api/executions/:id/cancel      취소 (Owner·Admin·Editor)
import { apiHandler, methodNotAllowed } from './_lib/http.js';
import { ApiError } from './_lib/errors.js';
import { cancelExecution, getExecution, listExecutions } from './_lib/executions.js';

export async function routeExecutions({ db, userId, method, parts, query = {} }) {
  const [id, sub, ...rest] = parts;
  if (rest.length || (sub !== undefined && sub !== 'cancel')) throw new ApiError(404, 'NOT_FOUND');

  if (id === undefined) {
    if (method !== 'GET') throw methodNotAllowed('GET');
    const workflowId = typeof query.workflowId === 'string' && query.workflowId ? query.workflowId : undefined;
    const str = (v) => (typeof v === 'string' && v ? v : undefined);
    return { status: 200, body: await listExecutions(db, userId, { workflowId, status: str(query.status), before: str(query.before), limit: str(query.limit) }) };
  }
  if (sub === 'cancel') {
    if (method !== 'POST') throw methodNotAllowed('POST');
    return { status: 200, body: { execution: await cancelExecution(db, userId, id) } };
  }
  if (method !== 'GET') throw methodNotAllowed('GET');
  return { status: 200, body: { execution: await getExecution(db, userId, id) } };
}

export default apiHandler('/api/executions', routeExecutions);
