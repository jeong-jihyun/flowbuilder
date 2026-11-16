// 사이드 메뉴 목록. 설계 문서 5장(메뉴 구조)을 그대로 따른다.
// ready: false 인 메뉴는 아직 만들지 않은 화면이다(준비 중 화면으로 연결).
export const MENU = [
  { path: '/', label: 'Dashboard', ready: true },
  { path: '/groups', label: 'My Groups', ready: false, step: 3 },
  { path: '/workflows', label: 'Workflows', ready: false, step: 6 },
  { path: '/editor', label: 'Workflow Editor', ready: true },
  { path: '/executions', label: 'Executions', ready: false, step: 10 },
  { path: '/credentials', label: 'Credentials', ready: false, step: 9 },
  { path: '/settings', label: 'Settings', ready: false, step: 3 },
];
