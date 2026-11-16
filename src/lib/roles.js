// 화면 표시용 역할 이름. 권한 판단은 서버(api/_lib/roles.js)가 하고,
// 화면은 서버가 돌려준 permissions 로 버튼만 보이거나 숨긴다.
export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const ROLE_HELP = {
  owner: '모든 권한 + 그룹 삭제',
  admin: '편집·실행 + 멤버 관리',
  editor: '조회·편집·실행',
  viewer: '조회만',
};

// 지금 내 역할로 줄 수 있는 역할 (서버 규칙과 같다. 서버가 최종 확인한다)
export function assignableRoles(myRole) {
  if (myRole === 'owner') return ['owner', 'admin', 'editor', 'viewer'];
  if (myRole === 'admin') return ['editor', 'viewer'];
  return [];
}

export const ROLE_COLORS = {
  owner: 'primary',
  admin: 'secondary',
  editor: 'success',
  viewer: 'default',
};
