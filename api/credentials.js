// 인증정보 API (9단계)
//
// GET    /api/credentials[?groupId=]   목록 (멤버, 비밀값 없음)
// POST   /api/credentials              등록 { groupId, name, type, secret, headerName? } (소유자·관리자)
// PUT    /api/credentials/:id          수정 { name?, secret?, headerName? } 비밀값은 안 보내면 유지 (소유자·관리자)
// DELETE /api/credentials/:id          삭제 (소유자·관리자)
import { apiHandler, methodNotAllowed } from './_lib/http.js';
import { ApiError } from './_lib/errors.js';
import { createCredential, deleteCredential, listCredentials, updateCredential } from './_lib/credentials.js';

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
  if (method === 'PUT') return { status: 200, body: { credential: await updateCredential(db, userId, id, body) } };
  if (method !== 'DELETE') throw methodNotAllowed('PUT, DELETE');
  await deleteCredential(db, userId, id);
  return { status: 200, body: {} };
}

export default apiHandler('/api/credentials', routeCredentials);
