// 그룹·멤버 API: /api/groups 아래 주소를 모두 이 파일 하나가 받는다.
// (Vercel 무료 등급은 배포당 함수 12개까지라 주소마다 파일을 만들지 않는다.
//  /api/groups/... 는 vercel.json 에서 ?path=... 로 바꿔 이 파일로 보낸다)
//
// GET    /api/groups                         내 그룹 목록
// POST   /api/groups                         그룹 만들기 (만든 사람이 Owner)
// GET    /api/groups/:id                     그룹 정보 + 내 역할
// PATCH  /api/groups/:id                     이름·설명 수정 (Owner, Admin)
// DELETE /api/groups/:id                     그룹 삭제 (Owner)
// GET    /api/groups/:id/members             멤버 목록
// POST   /api/groups/:id/members             멤버 추가 { email, role } (Owner, Admin)
// PATCH  /api/groups/:id/members/:userId     역할 변경 { role } (Owner, Admin)
// DELETE /api/groups/:id/members/:userId     내보내기·나가기
import { apiHandler, methodNotAllowed } from './_lib/http.js';
import { findUserByEmail, getUserProfile } from './_lib/clerkUsers.js';
import {
  ApiError,
  addMember,
  changeMemberRole,
  createGroup,
  deleteGroup,
  getGroup,
  listMembers,
  listMyGroups,
  removeMember,
  updateGroup,
} from './_lib/groups.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 경로와 호출 방식에 맞는 처리를 고른다. lookups 는 Clerk 사용자 조회 함수(테스트에서 바꿔 끼운다).
export async function routeGroups({ db, userId, method, parts, body = {}, lookups }) {
  const [id, sub, memberId, ...rest] = parts;
  if (rest.length || (sub !== undefined && sub !== 'members')) throw new ApiError(404, 'NOT_FOUND');

  if (id === undefined) {
    if (method === 'GET') return { status: 200, body: { groups: await listMyGroups(db, userId) } };
    if (method === 'POST') {
      const me = await lookups.getUserProfile(userId);
      return { status: 201, body: { group: await createGroup(db, me, body) } };
    }
    throw methodNotAllowed('GET, POST');
  }

  if (sub === undefined) {
    if (method === 'GET') return { status: 200, body: { group: await getGroup(db, userId, id) } };
    if (method === 'PATCH') return { status: 200, body: { group: await updateGroup(db, userId, id, body) } };
    if (method === 'DELETE') {
      await deleteGroup(db, userId, id);
      return { status: 200, body: {} };
    }
    throw methodNotAllowed('GET, PATCH, DELETE');
  }

  if (memberId === undefined) {
    if (method === 'GET') return { status: 200, body: { members: await listMembers(db, userId, id) } };
    if (method === 'POST') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_PATTERN.test(email)) throw new ApiError(400, 'INVALID_EMAIL');
      // 권한부터 확인해 권한 없는 사람이 가입 여부를 알아내지 못하게 한다
      const group = await getGroup(db, userId, id);
      if (!group.permissions.manageMembers) throw new ApiError(403, 'FORBIDDEN');
      const target = await lookups.findUserByEmail(email);
      if (!target) throw new ApiError(404, 'USER_NOT_FOUND');
      return { status: 201, body: { member: await addMember(db, userId, id, target, body.role) } };
    }
    throw methodNotAllowed('GET, POST');
  }

  if (method === 'PATCH') {
    return { status: 200, body: { member: await changeMemberRole(db, userId, id, memberId, body.role) } };
  }
  if (method === 'DELETE') {
    await removeMember(db, userId, id, memberId);
    return { status: 200, body: {} };
  }
  throw methodNotAllowed('PATCH, DELETE');
}

export default apiHandler('/api/groups', routeGroups, { lookups: { findUserByEmail, getUserProfile } });
