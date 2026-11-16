# CHANGE MANAGEMENT

프로그램을 수정하는 모든 개발자와 AI는 이 문서에 기록을 남깁니다.
기록이 없는 작업은 완료로 처리하지 않습니다. 최근 기록을 맨 위에 둡니다.

규칙

- 실제로 하지 않은 테스트를 통과했다고 적지 않습니다.
- 긴급 수정도 기록합니다.
- 설계와 구현이 달라지면 설계 문서도 같이 고칩니다.

---

## 2026-11-16 · v0.1.0 · 1단계 프로젝트 초기 구성

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 1단계(React + Vite 초기 구성) |
| 변경 파일 | 신규: `package.json`, `vite.config.js`, `index.html`, `vercel.json`, `.gitignore`, `.env.example`, `api/health.js`, `src/main.jsx`, `src/App.jsx`, `src/theme.js`, `src/menu.js`, `src/layout/AppShell.jsx`, `src/pages/Dashboard.jsx`, `src/pages/WorkflowEditor.jsx`, `src/pages/ComingSoon.jsx`, `README.md`, `docs/*` |
| 영향 범위 | 신규 프로젝트라 기존 기능 영향 없음 |
| 배포 상태 | 운영 배포 완료 (Vercel Hobby) · https://flowbuilder-roan.vercel.app · 커밋 e74ff99 |
| 롤백 방법 | 첫 배포라 되돌릴 이전 버전 없음. 이후에는 Vercel에서 이전 배포로 되돌리기 |
| 비고 | `docs/FLOWBUILDER_DESIGN.md`는 원본에서 외부 참고 이미지 링크 1개만 뺐습니다 (남의 디자인 시안, 링크 만료 가능) |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm install` | 통과 |
| 수행함 | `npm run build` | 통과 |
| 수행함 | PC 폭(1280px) Dashboard·Editor 화면 표시 | 통과 |
| 수행함 | PC에서 마우스로 노드 끌어 옮기기 | 통과 |
| 수행함 | 모바일 폭(390px) 화면 표시, 메뉴 Drawer 열림 | 통과 |
| 수행함 | `api/health.js` 함수 직접 호출 (GET 200, POST 405) | 통과 |
| 수행 안 함 | 실제 휴대폰에서 노드 끌기·선 잇기(터치) | 미확인 |
| 수행함 | 배포 주소에서 `/api/health` 응답 200 | 통과 |
| 수행함 | 배포 주소에서 `/editor` 직접 열기 시 화면 파일 응답 200 | 통과 |
| 수행 안 함 | 배포 주소를 실제 브라우저로 열어 화면 눈으로 확인 | 미확인 |

미완료 항목

- Dashboard 숫자·목록은 예시 데이터입니다.
- 편집기는 미리보기입니다. Node Palette, Properties, 저장이 없습니다.

다음 작업

- 2단계: Clerk 로그인 (이메일, Google)
