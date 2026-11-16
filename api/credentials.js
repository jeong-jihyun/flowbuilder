// 인증정보 API (9단계)
//
// GET    /api/credentials[?groupId=]   목록 (멤버, 비밀값 없음)
// POST   /api/credentials              등록 { groupId, name, type, secret, headerName? } (Owner·Admin)
// DELETE /api/credentials/:id          삭제 (Owner·Admin)
import { apiHandler, methodNotAllowed } from './_lib/http.js';
import { ApiError } from './_lib/errors.js';
import { createCredential, deleteCredential, listCredentials } from './_lib/credentials.js';

export async function routeCredentials({ db, userId, method, parts, query = {}, body = {} }) {
  const [id, ...rest] = parts;
  if (rest.length) throw new ApiError(404, 'NOT_FOUND');
  if (id === undefined) {
    if (method === 'GET') {
      const groupId = typeof query.groupId === 'string' && query.groupId ? query.groupId : undefined;
      return { status: 200, body: { credentials: await listCredentials(db, userId, groupId) } };
    }
    if (method === 'POST') return { status: 201, body: { credential: await createCredential(db, userId, body) } };
    throw methodNotAllowed('GET, POST');
  }
  if (method !== 'DELETE') throw methodNotAllowed('DELETE');
  await deleteCredential(db, userId, id);
  return { status: 200, body: {} };
}

export default apiHandler('/api/credentials', routeCredentials);
