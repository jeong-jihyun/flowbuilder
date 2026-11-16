// 사이드 메뉴 목록. 설계 문서 5장(메뉴 구조)을 그대로 따른다.
// ready: false 인 메뉴는 아직 만들지 않은 화면이다(준비 중 화면으로 연결).
export const MENU = [
  { path: '/', label: '대시보드', ready: true },
  { path: '/groups', label: '내 그룹', ready: true },
  { path: '/workflows', label: '워크플로우', ready: true },
  { path: '/editor', label: '워크플로우 편집기', ready: true },
  { path: '/executions', label: '실행 기록', ready: true },
  { path: '/credentials', label: '인증정보', ready: true },
  { path: '/settings', label: '설정', ready: true },
];
