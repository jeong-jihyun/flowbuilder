// 그룹 역할과 권한표. 설계 문서 8.2를 그대로 옮겼다.
// 권한 판단은 항상 서버에서 이 표로 한다. 화면은 서버가 알려 준 결과로 버튼만 숨긴다.
export const ROLES = ['owner', 'admin', 'editor', 'viewer'];

const PERMISSIONS = {
  owner: { view: true, edit: true, run: true, manageMembers: true },
  admin: { view: true, edit: true, run: true, manageMembers: true },
  editor: { view: true, edit: true, run: true, manageMembers: false },
  viewer: { view: true, edit: false, run: false, manageMembers: false },
};

export function isRole(role) {
  return ROLES.includes(role);
}

export function can(role, action) {
  return PERMISSIONS[role]?.[action] === true;
}

export function permissionsOf(role) {
  return { ...(PERMISSIONS[role] || { view: false, edit: false, run: false, manageMembers: false }) };
}

// 멤버 관리 권한이 있는 사람이 "누구를 어떤 역할로" 바꿀 수 있는지.
// - Owner: 모든 역할을 주고 바꿀 수 있다.
// - Admin: Editor·Viewer만 다룬다. 소유자·관리자을 만들거나 건드리지 못한다.
// targetRole 은 대상의 지금 역할(새로 추가할 때는 null), newRole 은 바꿀 역할(내보낼 때는 null).
export function canAssign(actorRole, targetRole, newRole) {
  if (actorRole === 'owner') return true;
  if (actorRole !== 'admin') return false;
  const low = (r) => r === null || r === 'editor' || r === 'viewer';
  return low(targetRole) && low(newRole);
}
