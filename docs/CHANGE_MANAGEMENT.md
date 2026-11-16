# CHANGE MANAGEMENT

프로그램을 수정하는 모든 개발자와 AI는 이 문서에 기록을 남깁니다.
기록이 없는 작업은 완료로 처리하지 않습니다. 최근 기록을 맨 위에 둡니다.

규칙

- 실제로 하지 않은 테스트를 통과했다고 적지 않습니다.
- 긴급 수정도 기록합니다.
- 설계와 구현이 달라지면 설계 문서도 같이 고칩니다.

---

## 2026-11-16 · v0.5.0 · 5단계 노드 속성 관리 (Properties Panel)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 5단계. 설계 3.2 오른쪽 Properties(Node Name, Parameters, Input, Output, Test Node)와 4.2 "노드 속성 변경, 조건 및 분기 설정" 구현 |
| 변경 파일 | 신규: `src/editor/nodeFields.js`, `src/editor/PropertiesPanel.jsx` / 수정: `src/editor/nodeCatalog.js`(출구를 노드 값에 따라 계산, 기본 설정값), `src/editor/WorkflowNode.jsx`(요약·"설정 필요" 표시, 출구 변경 알림), `src/pages/WorkflowEditor.jsx`(패널 연결, 실행 취소 묶기, Switch 선 정리, 미니맵 축소), `package.json`, `package-lock.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/FLOWBUILDER_DESIGN.md`(v1.4), `docs/CHANGE_MANAGEMENT.md` |
| 영향 범위 | Workflow Editor 화면만. 저장 데이터에 `data.params` 추가(이전 임시 저장은 기본값으로 채워 읽음). 서버 API·DB 변경 없음 |
| 배포 상태 | 배포 전 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 613c831)로 되돌리기, 또는 `git revert`. 이전 버전은 `params`를 무시하므로 임시 저장 값과 충돌 없음 |

설계와 달라진 점 (설계 문서 v1.4에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 노드별 입력 항목 | 정의 없음 ("노드별 입출력 스키마" 미확정) | 설계 4.3 표로 정함 | 속성 패널을 만들려면 항목이 필요 |
| Switch 갈래 | 4단계에서 3개 고정 | 1~10개, 이름·일치 값 편집 | 4.2 "조건 및 분기 설정" |
| Input·Output·Test Node | 패널에 있음 | 자리만 두고 "8단계 이후" 안내 | 실행 엔진이 있어야 보여 줄 값이 생김 |

검증 결과 (로그인을 끈 테스트 서버 `localhost:5174`, 크롬에서 직접 조작)

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 4단계 임시 저장(설정값 없는 노드)을 불러옴 → 오류 없이 열리고 필수값 빈 노드에 "설정 필요" 표시 | 통과 |
| 수행함 | 예시 흐름 노드에 요약 표시 (예: "GET https://api.example.com/items") | 통과 |
| 수행함 | If / Else 선택 → 오른쪽 패널에 이름·안내·비교할 값·조건·기준 값 표시 | 통과 |
| 수행함 | 이름을 "상태 확인"으로 입력 → 노드에 바로 반영, Ctrl+Z 한 번에 원래 이름, Ctrl+Y로 복구 | 통과 |
| 수행함 | Switch 추가 → "나눌 값" 비어 "설정 필요 1곳", 갈래 추가로 출구 4개(1·2·3·기본) | 통과 |
| 수행함 | Switch 갈래 2에 선 연결 후 이름을 "긴급"으로 → 선 글자도 "긴급" | 통과 |
| 수행함 | 갈래 2 삭제 → 그 선과 출구 함께 사라짐, Ctrl+Z로 갈래·선 모두 복구 | 통과 |
| 수행함 | HTTP: 주소 "ftp://x", 헤더 "{ bad", 제한 시간 999 → 세 칸 모두 오류 문구, 노드에 "설정 필요 3곳" | 통과 |
| 수행함 | 휴대폰 폭(390px): 노드 선택 → "속성 편집" 버튼 → 아래 창에 패널, 조건을 "비어 있다"로 바꾸면 "기준 값" 칸 숨김·노드 요약 갱신 | 통과 |
| 수행함 | 새로고침 후 노드 유지, 새로 연 화면 콘솔 오류 0건 | 통과 |
| 수행 안 함 | Schedule·Webhook·GAS·GitHub Actions·Transform·Delay 패널을 하나씩 직접 입력 | 미확인 (같은 입력칸 생성 코드를 씀) |
| 수행 안 함 | 실제 휴대폰에서 입력(키보드가 올라올 때 창 위치) | 미확인 |

미완료 항목

- Input·Output 보기와 Test Node (8단계 이후)
- 인증정보 연결 (9단계 Credentials). 지금은 패널에 "키를 직접 넣지 마세요" 안내만 있음
- 숨겨진 칸의 값은 지우지 않고 남겨 둠 (예: 조건을 "비어 있다"로 바꿔도 기준 값은 저장돼 있음). 실행 엔진은 보이는 칸만 써야 함

다음 작업

- 6단계: Workflow 저장 (MongoDB `workflows`, 목록 화면)

---

## 2026-11-16 · v0.4.0 · 4단계 Workflow 편집기

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 4단계(React Flow 편집기). 설계 3.2 화면 구성과 4.1 노드 10종, 4.2 사용자 제어(추가·삭제·이동·연결·연결 해제·재연결·확대) 구현 |
| 변경 파일 | 신규: `src/editor/nodeCatalog.js`, `src/editor/WorkflowNode.jsx`, `src/editor/NodePalette.jsx`, `src/editor/EditorToolbar.jsx`, `src/editor/useHistory.js`, `src/editor/draftStorage.js`, `src/editor/editor.css` / 수정: `src/pages/WorkflowEditor.jsx`(전면 교체), `package.json`, `package-lock.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/FLOWBUILDER_DESIGN.md`(v1.3), `docs/CHANGE_MANAGEMENT.md` |
| 영향 범위 | Workflow Editor 화면만. 서버 API·DB 변경 없음 (`API_SPECIFICATION.md` 변경 없음) |
| 배포 상태 | 운영 배포 (2026-11-16) · https://flowbuilder-roan.vercel.app/editor · 커밋 dfac494 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 b8fd939)로 되돌리기, 또는 `git revert`. 브라우저 임시 저장 값은 그대로 남지만 이전 버전은 읽지 않으므로 영향 없음 |

설계와 달라진 점 (설계 문서 v1.3에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 노드 종류 저장 위치 | 6.1 예시는 `type`만 있음 | `type`은 분류, `data.kind`에 종류 | 6.1 모양을 지키면서 10종을 구분 |
| Switch 출구 | 정의 없음 | 3개(1, 2, 기본) 고정 | 개수 설정은 속성 기능(5단계) |
| 저장 | 6단계 | 6단계 전까지 브라우저 임시 저장 | 새로고침·화면 이동 시 작업이 사라지지 않게 |
| 하단 Execution Panel | 3.2에 있음 | 아직 없음 | 실행(8단계)·로그(10단계)가 있어야 보여 줄 내용이 생김 |

검증 결과 (로그인을 끈 테스트 서버 `localhost:5174`, 크롬에서 직접 조작)

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | PC 폭: 예시 흐름 표시(If/Else YES·NO 선), 노드 목록 10종·분류별 표시 | 통과 |
| 수행함 | 목록 누르기로 노드 추가 3개 → 서로 겹치지 않음 (처음엔 가운데 겹침 → 빈자리 찾기로 고침) | 통과 |
| 수행함 | 목록에서 캔버스로 끌어 놓기 → 놓은 자리에 추가 | 통과 |
| 수행함 | Switch 출구 "1" → GitHub Actions 연결, 선에 "1" 표시 | 통과 |
| 수행함 | Ctrl+Z로 연결 취소, Ctrl+Y로 복구 | 통과 |
| 수행함 | 노드 선택 후 Delete → 노드와 붙은 선 함께 삭제, Ctrl+Z로 둘 다 복구 | 통과 |
| 수행함 | YES 선 끝을 다른 노드로 끌어 재연결 → 같은 id, YES 이름 유지 | 통과 |
| 수행함 | 새로고침 후 노드 7개·선 4개 그대로 (임시 저장) | 통과 |
| 수행함 | 휴대폰 폭(390px): 노드 목록 숨김, "+ 노드" 버튼 → 아래 창에서 추가, 창 닫힘, 미니맵 숨김 | 통과 |
| 수행함 | 휴대폰 폭에서 새 노드가 화면 밖에 생기던 문제 → 화면을 새 노드로 옮기도록 고친 뒤 화면 안에 표시 확인 | 통과 |
| 수행함 | 새로 연 화면에서 콘솔 오류 0건 (수정 중 화면 자동 갱신 때 난 일시 오류는 제외) | 통과 |
| 수행 안 함 | 실제 휴대폰 터치로 노드 끌기·연결점 잇기 | 미확인 |
| 수행함 | 로그인한 배포 주소 `/editor`: 예시 흐름·노드 목록·Toolbar 표시, 콘솔 오류 0건, `/api/health` db ok | 통과 |

미완료 항목

- 노드 이름·설정 바꾸기 (5단계 Properties)
- 서버 저장, 여러 Workflow 관리 (6단계). 지금 임시 저장은 브라우저 하나에 흐름 하나뿐
- Save·Validate·Run·Publish 버튼은 눌리지 않게 두고 몇 단계에서 되는지 설명만 표시
- 휴대폰에서는 처음 화면에 노드가 작게 보임 (확대 버튼·두 손가락으로 키워야 함)

다음 작업

- 5단계: 노드 속성 관리 (Properties Panel)

---

## 2026-11-16 · v0.3.0 · 3단계 그룹 관리 (그룹·권한, MongoDB 연결)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 3단계(그룹 및 권한). 그룹 저장을 위해 MongoDB 연결을 6단계에서 앞당김 |
| 변경 파일 | 신규: `api/groups.js`, `api/_lib/db.js`, `api/_lib/roles.js`, `api/_lib/groups.js`, `api/_lib/clerkUsers.js`, `src/pages/Groups.jsx`, `src/pages/GroupDetail.jsx`, `src/lib/roles.js` / 수정: `api/health.js`(DB 상태 `db` 추가), `src/lib/api.js`(JSON 본문, `useApi`, 오류 문구), `src/components/ServerAuthCheck.jsx`(`useApi` 사용), `src/App.jsx`, `src/menu.js`, `src/layout/AppShell.jsx`(하위 주소 메뉴 선택), `vercel.json`, `.env.example`, `package.json`, `package-lock.json`(`mongodb` 6.x 추가), `README.md`, `docs/*` |
| 영향 범위 | My Groups 메뉴(새 화면), 새 API `/api/groups`, 새 환경변수 `MONGODB_URI`. 기존 Dashboard·편집기·로그인은 동작 변화 없음 |
| 배포 상태 | 운영 배포 (2026-11-16) · https://flowbuilder-roan.vercel.app. Vercel Marketplace로 MongoDB Atlas 무료(M0, 512MB) `flowbuilder-db` 생성, 지역 Washington D.C.(Vercel 함수와 같은 iad1), `MONGODB_URI`가 Production·Preview에 자동 등록됨 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 bbf5df5)로 되돌리기, 또는 `git revert`. DB의 `groups`, `group_members` 컬렉션은 지워도 다른 기능에 영향 없음 |

설계와 달라진 점 (설계 문서 v1.2에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| DB 연결 시점 | 6단계 | 3단계 | 그룹·멤버를 저장할 곳이 필요 |
| 역할 부여 규칙 | 권한표만 있음 | Admin은 Editor·Viewer만 다룸, Owner 최소 1명, 본인 나가기 허용 | 권한표만으로는 "Admin이 Owner를 내보낼 수 있나"가 정해지지 않음 |
| 멤버 추가 방법 | 정의 없음 | 이미 가입한 이메일로만 추가 | 초대 메일은 별도 기능이라 뒤로 미룸 |
| API 파일 구성 | 주소별 파일 가정 | `/api/groups` 전체를 파일 1개 + `vercel.json` 다시쓰기 | Vercel 무료 등급 함수 12개 제한 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 메모리 MongoDB(mongodb-memory-server)로 그룹 API 처리 52개 항목: 만들기·목록·조회·수정·삭제, 멤버 추가·역할 변경·내보내기·나가기, 역할별 허용/거부(Owner·Admin·Editor·Viewer), 마지막 Owner 보호, 비멤버 404, 중복 추가 409, 입력값 오류 400, 없는 주소 404, 잘못된 방식 405, 인덱스 생성, 경로 해석 | 통과 |
| 수행함 | `/api/groups` 진입점: 토큰 없음 401, 가짜 토큰 401, Clerk 키 없음 503 | 통과 |
| 수행 안 함 | 실제 Clerk로 이메일 → 가입자 찾기 (`findUserByEmail`) | 미확인 (테스트에서는 가짜 조회 함수 사용) |
| 수행함 | 배포 주소 `/api/groups`: 토큰 없음 401, 가짜 토큰 401 | 통과 |
| 수행함 | 배포 주소에서 사용자가 그룹 "Group" 생성 → 그룹 상세에 "내 역할: Owner", 멤버 1명 표시 (크롬 화면으로 확인) | 통과 |
| 수행 안 함 | 그룹 화면을 브라우저로 눈으로 확인 | 미확인 (로그인 + API가 있어야 화면이 채워짐) |

미완료 항목

- 초대 메일 (가입하지 않은 사람 초대)
- 멤버 이메일·이름은 추가할 때의 사본이라 Clerk에서 바꿔도 자동 갱신되지 않음
- 마지막 Owner 확인과 변경이 한 번에(트랜잭션) 처리되지 않아, Owner 2명이 동시에 서로를 강등하면 Owner가 0명이 될 수 있음 (드문 경우라 보류)
- Settings 메뉴는 아직 내용이 정해지지 않아 "준비 중" 그대로

다음 작업

- 실제 화면에서 그룹 만들기·멤버 추가 검증
- 4단계: Workflow 편집기

---

## 2026-11-16 · v0.2.0 · 2단계 인증 구현 (Clerk)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 2단계(Clerk 로그인). DB 용량 정책(로그 30일 자동 삭제, 결과 2KB 제한)을 설계에 추가 |
| 변경 파일 | 신규: `api/_lib/auth.js`, `api/me.js`, `src/lib/authConfig.js`, `src/lib/api.js`, `src/pages/SignInPage.jsx`, `src/components/ServerAuthCheck.jsx` / 수정: `src/main.jsx`, `src/App.jsx`, `src/layout/AppShell.jsx`, `src/pages/Dashboard.jsx`, `vite.config.js`, `package.json`, `package-lock.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/API_SPECIFICATION.md`, `docs/DATABASE_DESIGN.md`, `docs/FLOWBUILDER_DESIGN.md`, `docs/AI_HANDOFF_PROMPT.md` |
| 영향 범위 | 전체 화면(로그인해야 보임), 이후 만들 모든 API(토큰 검증 공통 함수 사용) |
| 배포 상태 | 운영 배포 완료 (2026-11-16) · https://flowbuilder-roan.vercel.app · 커밋 92c1fde. Clerk 앱 `FlowBuilder`(개발용, 무료) 생성, 키 2개를 Vercel 환경변수에 등록 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 95255d4)로 되돌리기, 또는 `git revert` |

설계와 달라진 점 (설계 문서에도 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| Clerk 패키지 | `@clerk/clerk-react` 가정 | `@clerk/react` 6.x + `@clerk/backend` 3.x | 예전 패키지는 지원 종료(설치 시 경고 확인) |
| 키가 없을 때 | 정의 없음 | 로그인 없이 화면을 띄우고 상단에 경고 표시 | 키 없이 Clerk를 켜면 앱이 아예 뜨지 않음 |
| DB 용량 | "한도 확인 필요"(미확정) | 실행 로그 30일 뒤 자동 삭제, 노드 결과는 2KB까지만 저장 (10단계에서 구현) | 무료 512MB 안에서 계속 쓰기 위해 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm install`, `npm run build` | 통과 |
| 수행함 | 키 없는 상태: PC 폭·모바일 폭 화면 표시, 경고 띠 표시, 편집기 노드 4개, 콘솔 오류 0건 | 통과 |
| 수행함 | `/api/me` 함수 직접 호출: 서버 키 없음 503, 토큰 없음 401, 가짜 토큰 401, POST 405 | 통과 |
| 수행함 | 배포 주소에서 로그인 화면 표시 (이메일 입력칸, Continue with Google 버튼) | 통과 |
| 수행함 | 배포 주소 `/api/me`: 키 등록 전 503 → 등록 후 토큰 없이 401 `UNAUTHENTICATED` | 통과 |
| 수행 안 함 | 실제 가입·로그인·로그아웃, 로그인 후 `/api/me` 200 | 미확인 (사용자 계정으로 직접 해야 함) |
| 수행 안 함 | 실제 휴대폰에서 로그인 화면 표시 | 미확인 |

미완료 항목

- Clerk는 개발용(Development) 상태입니다. 로그인 화면에 "Development mode"가 표시됩니다. 운영용 전환은 자기 도메인이 필요해 보류합니다.
- GitHub에 올려도 Vercel이 자동 배포하지 않습니다. 배포는 따로 실행해야 합니다.
- `CLERK_SECRET_KEY`는 Production 환경에만 등록돼 있습니다.
- `users` 컬렉션 저장은 DB가 연결되는 6단계에서 합니다. 지금은 Clerk가 사용자 정보를 보관합니다.

다음 작업

- 실제 가입·로그인 검증
- 3단계: 그룹 관리 (그룹·권한) — DB가 필요하므로 MongoDB 연결을 함께 진행

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
