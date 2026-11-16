# CHANGE MANAGEMENT

프로그램을 수정하는 모든 개발자와 AI는 이 문서에 기록을 남깁니다.
기록이 없는 작업은 완료로 처리하지 않습니다. 최근 기록을 맨 위에 둡니다.

규칙

- 실제로 하지 않은 테스트를 통과했다고 적지 않습니다.
- 긴급 수정도 기록합니다.
- 설계와 구현이 달라지면 설계 문서도 같이 고칩니다.

---

## 2026-11-17 · v0.14.0 · 연동 마법사를 "버튼만 누르는" 방식으로 재작성

| 항목 | 내용 |
| --- | --- |
| 배경 | 사용자가 입력할 값을 이해하지 못해 막힘. "내용은 다 채워 두고 버튼만 누르게" 요청 |
| 변경 | 종류를 누르면 이름·함수·저장소·워크플로우 파일·브랜치가 미리 채워진 확인 화면 → "이 내용으로 만들기" 한 번. GAS는 비밀값을 자동 생성해 인증정보로 등록. 만든 뒤 화면에서 ①코드 복사 ②비밀값 복사 ③배포 후 주소만 붙여넣기(→ 노드에 자동 저장). 깃허브는 견본 yml이 이 저장소에 이미 있어 파일 작업 없음, 토큰 발급 링크 → 토큰만 붙여넣기(→ 인증정보 등록+노드 연결) |
| 파일 | `src/components/ConnectDialog.jsx`(재작성), `src/manual/snippets.js`(견본 저장소·링크 상수), `.github/workflows/example-dispatch.yml`(견본 파일 추가) |
| 확인한 것 | 빌드, 가짜 서버로 폰 폭에서 GAS·깃허브 두 경로 끝까지(생성 → 안내 → 주소/토큰 붙여넣기 → PUT으로 노드 저장 → 편집기 이동), 콘솔 오류 0. 서버 환경변수 `CREDENTIALS_KEY`는 설정 완료(health 확인) |
| **미확인** | 실제 서버에 저장되는지, 실제 구글 배포·깃허브 토큰 화면 문구, 실제 폰 화면. 견본 저장소가 `jeong-jihyun/flowbuilder`로 고정(다른 저장소는 "값 고치기"에서 변경) |

---

## 2026-11-17 · v0.13.2 · 입력 단계 안내 보강

| 항목 | 내용 |
| --- | --- |
| 배경 | 사용자가 "입력하고 등록" 단계에서 무엇을 넣을지 몰라 막힘 |
| 변경 | 입력 단계 맨 위에 "이름만 적고 견본 만들기" 안내 추가, 주소·저장소·워크플로우 파일 칸마다 "어디서 구하는지" 설명 |
| 원인 추가 확인 | 운영 서버 환경변수에 `CREDENTIALS_KEY`·`CRON_SECRET`이 없음(Vercel 환경변수 목록 확인). 비밀값을 넣고 등록하면 서버가 거부함. Claude가 환경변수를 넣으려 했으나 자동 승인 검사가 거부해 넣지 못함 |
| 확인한 것 | 빌드 |
| **미확인** | 실제 화면(폰), 서버 키 설정 후 실제 등록 |

---

## 2026-11-17 · v0.13.1 · 연동 마법사를 "견본 먼저, 세부는 나중에"로 변경

| 항목 | 내용 |
| --- | --- |
| 배경 | 사용자가 인증정보 화면에서 무엇을 해야 할지 모르겠다고 함. 인증정보는 수정 기능이 없어(삭제 후 재등록) 처음부터 모든 값을 요구하면 막힘 |
| 변경 | 인증정보가 없으면 화면 맨 위에 "구글 앱스 스크립트 견본" / "깃허브 액션 견본" 카드 표시 → "견본으로 시작"을 누르면 준비 단계부터 시작. 입력 단계에서 이름만 있으면 견본 워크플로우 생성(주소·비밀값 비워도 됨, 넣은 값은 모양 검사). 끝나면 "남은 할 일" 체크리스트와 "편집기에서 이어서 하기" 버튼 표시. 완료 전에는 화면 이동 안 함 |
| 파일 | `src/components/ConnectDialog.jsx`, `src/pages/Credentials.jsx`, `src/pages/Workflows.jsx` |
| 확인한 것 | 빌드 통과, 가짜 서버로 폰 폭에서 GAS·깃허브 견본 경로: 이름만 입력 → 인증정보 없이 워크플로우만 생성, 남은 할 일 안내, 편집기 이동, 콘솔 오류 0. 검증기가 빈 주소를 "꼭 넣어야 합니다" 오류로 알려 주고 생성 API는 막지 않음(실행·활성화 때만 막힘) |
| **미확인** | 실제 서버 저장, 실제 폰 화면, 편집기에서 빈 견본 노드를 열었을 때의 실제 화면(검증기 동작만 확인) |

---

## 2026-11-17 · v0.13.0 · 연동 등록 마법사 (GAS·깃허브 액션)

| 항목 | 내용 |
| --- | --- |
| 변경 | 인증정보·워크플로우 화면에 "연동 추가 (GAS·깃허브 액션)" 버튼과 3단계 팝업 추가: 종류·그룹 선택 → 준비(코드·yml 복사, 무작위 비밀값, 토큰 발급 안내) → 주소·비밀값 입력 후 등록. 선택하면 "수동 실행 → 연동 노드" 워크플로우도 바로 만들고 열어 줌 |
| 안전 | 비밀값은 팝업 안에서만 보관, 등록·닫기 시 지움. 인증정보는 소유자·관리자 그룹만 선택 가능. 인증정보 등록 성공 후 워크플로우 생성만 실패하면 "인증정보는 등록됨"으로 따로 알림 |
| 파일 | `src/components/ConnectDialog.jsx`(신규), `src/manual/snippets.js`(신규, 공용 코드 견본), `src/manual/manuals.js`, `src/manual/ManualDialog.jsx`, `src/pages/Credentials.jsx`, `src/pages/Workflows.jsx` |
| 확인한 것 | 빌드 통과, 엔진 시험 43+8+4 통과, 데모 모드(가짜 API)에서 폰 폭(390px) GAS·깃허브 두 경로 끝까지: 입력 전 등록 비활성, 비밀값 48자 자동 입력, POST 본문(인증정보·노드 설정값·credentialId 연결), 등록 후 /workflows/w1 이동, 콘솔 오류 0 |
| **미확인** | 실제 서버 저장(서버에 CREDENTIALS_KEY가 아직 없어 등록이 실패함), 실제 구글·깃허브 계정으로 끝까지, 실제 폰 화면 |

---

## 2026-11-17 · v0.12.2 · 사용 설명서 레시피 확대 (깃허브 액션·분기·자동 시작)

| 항목 | 내용 |
| --- | --- |
| 변경 | 편집기 설명서 레시피를 2개 → 7개로 늘림: 3 깃허브 액션 연결(yml 파일·토큰 발급·노드 설정값) / 4 조건 분기(예·아니오 출구 잇기) / 5 다중 분기(갈래·기본) / 6 GAS 결과로 분기 / 7 예약 실행·웹훅으로 자동 시작(PowerShell 시험 명령). 복사 버튼 34개 |
| 근거 | 코드에서 확인한 동작만 적음: 분기 출구 예/아니오·갈래·기본, 숫자 비교, 깃허브 액션 노드는 깃허브 실행이 실패하면 노드도 실패하고 흐름이 멈춤(실패 갈래 없음), GAS 응답의 result 값은 다음 노드에서 {{input.이름}} 으로 읽음 |
| 파일 | `src/manual/manuals.js`, `src/manual/ManualDialog.jsx`(빈 텍스트 단계는 앞 단계 복사칸으로 합침) |
| 확인한 것 | 빌드 통과, 폰 폭에서 레시피 렌더·가로 넘침 없음, 복사 버튼 34개 모두 비어 있지 않은 값을 클립보드에 넣음, 콘솔 오류 없음 |
| **미확인** | 레시피를 실제 구글·깃허브 계정으로 끝까지 따라 해 본 것(토큰 발급·Apps Script 배포 화면 문구는 각 사이트가 바꾸면 달라질 수 있음), 웹훅 주소 만들기·예약 실행의 실제 동작(서버 환경값 미설정), 실제 폰의 복사 |

---

## 2026-11-17 · v0.12.1 · 사용 설명서에 "복사해서 붙여 넣기" 레시피

| 항목 | 내용 |
| --- | --- |
| 변경 | 워크플로우 편집기 설명서에 따라 하기 레시피 2개 추가: (1) 수동 실행 → 데이터 변환 (2) 구글 앱스 스크립트 연결(Apps Script 코드·TOKEN 무작위 비밀값 만들기·웹 앱 배포·인증정보 등록·노드 설정값·변환 결과·실행 입력값). 칸마다 "복사" 버튼, 막혔을 때 점검 목록 |
| 파일 | `src/manual/manuals.js`(RECIPES), `src/manual/ManualDialog.jsx`(복사 버튼, 비밀값 만들기) |
| 비밀값 | 브라우저 안에서만 만들며 저장·전송하지 않음(창을 닫으면 사라짐) |
| 확인한 것 | 복사 버튼이 클립보드에 실제로 값을 넣음(PC 브라우저 시험), 비밀값 생성·표시, 폰 폭 가로 넘침 없음, 콘솔 오류 없음 |
| **미확인** | 레시피 2를 실제 구글 계정·실제 서버로 끝까지 따라 해 본 것(Apps Script 배포 화면 문구는 구글 쪽 화면이 바뀌면 달라질 수 있음, 암호화 키 미설정 상태), 실제 폰의 복사 동작 |

---

## 2026-11-17 · v0.12.0 · 사용 설명서 팝업 + 남은 영어 한글화

| 항목 | 내용 |
| --- | --- |
| 변경 | 위쪽 바에 "사용 설명서" 버튼 추가. 누르면 현재 메뉴의 설명서 팝업이 열리고(폰은 전체 화면), 위쪽 칩으로 7개 메뉴 설명서를 오갈 수 있음. 각 설명서 = 실제 화면 사진(빨간 번호) + 용도 + 사용법 + 예제 + 알아둘 점 |
| 한글화 | 남은 영어 화면 글자(노드 이름·분류·역할·상태·편집기 도구·속성 패널 등)를 한글로 변경. 저장돼 있던 옛 영어 노드 이름은 화면에서만 한글로 보여 줌(다음 저장 때 바뀜) |
| 파일 | `src/manual/manuals.js`(내용), `src/manual/ManualDialog.jsx`, `public/manual/*.png`(사진 9장), `scripts/capture-manual.py`(사진 다시 만드는 도구), `src/demo/clerkStub.jsx` + `vite.config.js`(가짜 로그인, `--mode demo` 에서만 사용) |
| 사진 만드는 법 | 가짜 로그인 + 가짜 서버 응답으로 찍은 화면입니다(실제 서버 아님). 화면이 바뀌면 `scripts/capture-manual.py`로 다시 찍어야 사진이 최신이 됨 |
| 확인한 것 | 빌드 통과(운영 빌드에 가짜 로그인 코드 미포함), 7개 화면에서 PC·폰 폭 모두 팝업 열림·사진 로딩·가로 넘침 없음, 기존 시험 스크립트 43+8+4개 통과 |
| **미확인** | 실제 로그인 상태에서의 화면(사진은 가짜 데이터), 실제 폰에서 팝업 사진 가독성, 남은 영어가 아주 구석(오류 문구 일부)에 없는지 전수 확인 |

---

## 2026-11-17 · v0.11.2 · 메뉴 이름 한글 통일

| 항목 | 내용 |
| --- | --- |
| 변경 | 메뉴·화면 제목·화면 안의 메뉴 안내 문구를 한글로 통일: 대시보드 / 내 그룹 / 워크플로우 / 워크플로우 편집기 / 실행 기록 / 인증정보 / 설정 |
| 범위 | 사이드 메뉴, 각 화면 제목, 대시보드 카드 이름과 "최근 워크플로우", 이동 링크, 안내 문구(인증정보 메뉴, 내 그룹), `docs/TEST_SCENARIOS.md` |
| 그대로 둔 것 | 주소(`/groups`, `/executions` 등), 코드의 파일·함수 이름, 본문에서 쓰는 "Workflow" 단어, 설계 문서 원문 |
| 검증 | 빌드 통과, PC·폰 폭에서 메뉴 글자 확인 (아래 결과 참고) |
| **미확인** | 실제 폰에서 글자 잘림 |

---

## 2026-11-17 · v0.11.1 · 로고 적용

| 항목 | 내용 |
| --- | --- |
| 변경 | 위쪽 바의 글자 "FlowBuilder"를 로고 그림으로 교체(누르면 Dashboard), 로그인 화면에도 로고 표시 |
| 추가 | `public/logo.png`(가로형), `public/favicon.png`·`apple-touch-icon.png`·`icon-512.png`(육각형 아이콘만 잘라 만듦), `index.html`에 탭 아이콘 연결 |
| 검증 | 빌드 통과, PC(1280)·폰(390) 폭에서 로고가 불러와지고 가로 넘침 없음 |
| **미확인** | 실제 브라우저 탭 아이콘 모양, 로그인 화면(Clerk 켠 상태), 홈 화면에 추가했을 때 아이콘 |

---

## 2026-11-17 · v0.11.0 · Settings 화면, 다시 실행, 서버 설정 상태, 테스트 시나리오

| 항목 | 내용 |
| --- | --- |
| 목적 | 남은 기능 정리와 사용자가 직접 확인할 테스트 시나리오 문서 |
| 추가 | Settings 화면(사용자·내 그룹·시스템 상태), `POST /api/executions/:id/retry`(같은 입력으로 새 실행), 실행 상세의 "다시 실행" 버튼 |
| 변경 | `GET /api/health`에 `config`(auth, credentialsKey, cronSecret 세 개의 true/false)를 추가. 값은 절대 보내지 않음 |
| 변경 | Workflows 목록 칩을 "자동 실행 중"으로 표시, Publish 버튼 안내 문구를 자동 실행 스위치 안내로 변경 |
| 결정 | Publish·버전 이력은 만들지 않음. "자동 실행" 스위치가 그 역할을 대신함 (설계 문서에 반영 필요 시 별도 논의) |
| 만들지 않음 | 노드 단위 자동 재시도(`retrying`). 실패한 실행은 "다시 실행"으로 처음부터 다시 돌림 |
| 문서 | `docs/TEST_SCENARIOS.md` 신규(메뉴별 시나리오, ★는 아직 실제 환경에서 확인 못 한 것) |

검증 결과

| 확인 | 결과 |
| --- | --- |
| `npx vite build` | 통과 |
| 다시 실행 거절 경로(비멤버 404, Viewer 403, 진행 중 409, 잘못된 ID 404) | 가짜 DB로 4개 통과 |
| PC(1280)·폰(390) 폭에서 Settings·Credentials·Executions·Dashboard 가로 넘침 | 없음 (로그인 끈 상태, 오류 로그 0건) |
| **미확인** | 다시 실행 성공 경로(실제 MongoDB 필요), 로그인한 상태의 Settings 표시, `/api/health` `config` 값(배포 후 확인), 실제 폰 |

---

## 2026-11-17 · v0.10.1 · 자동 삭제 제거, 사용자가 직접 삭제하도록 변경

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-17 |
| 작업자 | Claude (AI), 요청: 정지현 ("시스템에서 삭제는 안 돼, 사용자가 삭제하도록 유도해야 돼") |
| 변경 목적 | v0.10.0의 30일 자동 삭제(TTL)와 8단계의 Workflow당 최근 50개 자동 정리를 없애고, 안내 후 사용자가 직접 삭제하게 함 |
| 변경 파일 | 수정: `api/_lib/executions.js`(자동 정리 제거, 삭제 함수 추가, 목록에 `counts.old`), `api/executions.js`(DELETE), `api/_lib/db.js`(TTL 인덱스 만들지 않음, 이미 있으면 인덱스만 제거), `src/pages/Executions.jsx`, `src/lib/api.js`, `package.json`, `package-lock.json`, `README.md`, `docs/*` |
| 영향 범위 | 실행 기록이 자동으로 지워지지 않음(DB 용량은 사용자가 정리). 새 API: `DELETE /api/executions/:id`(Owner·Admin·Editor, 끝난 것만), `DELETE /api/executions?olderThanDays=N`(Owner·Admin, N≥7, 끝난 것만). Executions 화면에 30일 지난 기록 안내와 삭제 버튼 |
| 배포 상태 | 미배포 (v0.10.0은 배포됨: 커밋 39a6bbf. 그 배포가 만든 TTL 인덱스는 이번 버전을 배포하면 첫 DB 연결 때 제거됨. v0.10.0 배포 후 아직 30일이 지나지 않았으므로 자동으로 지워진 기록은 없음) |
| 롤백 방법 | `git revert` 또는 이전 배포. 단 v0.10.0으로 돌아가면 자동 삭제가 다시 켜지므로 권하지 않음 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 삭제 로직 8개 (가짜 DB): 일괄 삭제는 Admin 그룹의 끝난 30일 지난 기록만(진행 중·최근·Viewer 그룹 것 그대로), 7일 미만·값 없음 400, 진행 중 하나 삭제 409, Viewer 403, 끝난 것 삭제, 없는 ID 404, Viewer만이면 일괄 403 | 통과 |
| 수행함 | 목록 로직 8개 (이전 시험 다시 실행) | 통과 |
| 수행 안 함 | 실제 MongoDB에서 TTL 인덱스 제거, 실제 삭제 | **미확인** |
| 수행 안 함 | Executions 화면(안내·삭제 창)을 로그인한 상태로 보기, 휴대폰 폭 | **미확인** (빌드만 통과) |

미완료 항목

- 용량이 가득 차기 전에 알려 주는 기능(지금은 30일 지난 기록 수만 안내)
- Workflow 삭제·그룹 삭제 시 딸린 기록을 함께 지우는 것은 유지(사용자가 직접 누른 삭제의 일부)

---

## 2026-11-17 · v0.10.0 · 10단계 실행 기록 화면과 30일 자동 삭제

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-17 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 10단계. 5장 Executions 메뉴, 용량 정책(30일 자동 삭제) |
| 변경 파일 | 신규: `src/pages/Executions.jsx` / 수정: `api/_lib/executions.js`(목록: 상태 거르기·다음 쪽·개수), `api/executions.js`, `api/_lib/db.js`(TTL 인덱스), `src/editor/ExecutionPanel.jsx`(StepRow 공개), `src/menu.js`, `src/App.jsx`, `src/lib/api.js`, `package.json`, `package-lock.json`, `README.md`, `docs/*` |
| 영향 범위 | Executions 메뉴(목록·상태 거르기·더 보기·노드별 결과 창). `GET /api/executions`에 `status`·`before`·`limit` 추가, 응답에 `hasMore` 추가(기존 응답과 호환). `executions`에 `createdAt` TTL 인덱스: 시작 30일 뒤 기록이 자동 삭제됨 |
| 배포 상태 | 미배포 (푸시·배포 전) |
| 롤백 방법 | 이전 배포로 되돌리기 또는 `git revert`. TTL 인덱스는 DB에 남으므로 기록을 오래 두려면 `executions`의 `createdAt_1` 인덱스를 삭제해야 함 |

설계와 달라진 점

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 노드별 로그 컬렉션 | `execution_logs` 따로 둠 | 따로 두지 않고 `executions.steps`에 둠 | 8단계에서 이미 한 문서에 저장 중이고 노드 결과는 2KB로 제한됨. 용량 정책(30일)은 같은 TTL로 충족 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 목록 로직 8개 (가짜 DB): 20개씩·`hasMore`, 다음 쪽(`before`), 상태 거르기, 개수(다른 그룹 제외), `limit` 최대 50, 잘못된 `status`·`before`는 400 | 통과 |
| 수행 안 함 | 실제 MongoDB에서 TTL 인덱스 생성과 실제 삭제 (삭제는 MongoDB가 약 1분 간격으로 처리) | **미확인** |
| 수행 안 함 | Executions 화면을 로그인한 상태에서 보기, 휴대폰 폭 | **미확인** (빌드만 통과) |

미완료 항목

- 실패 시 재시도(retrying), 오류 갈래
- Settings 메뉴 (무엇을 둘지 미정)
- 11~12단계

---

## 2026-11-17 · v0.9.0 · 9단계 외부 연동 (GAS · GitHub Actions · Webhook · 예약 실행)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-17 (서버 코드는 2026-11-16 커밋 8cd3656, 화면·문서·시험은 2026-11-17) |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 9단계. 2장 Runner Adapter(GAS·GitHub), 3.1 Trigger(Webhook·Schedule), 6장 credentials, 8장 인증정보 보호 |
| 변경 파일 | 신규: `api/credentials.js`, `api/hooks.js`, `api/cron.js`, `api/_lib/{credentials,crypto,automation}.js`, `api/_lib/runners/{gas,github}.js`, `.github/workflows/flowbuilder-tick.yml`, `src/pages/Credentials.jsx`, `src/editor/WebhookAddress.jsx`, `docs/GAS_TEMPLATE.md` / 수정: `api/workflows.js`(activate·webhook), `api/_lib/workflows.js`, `api/_lib/executions.js`, `api/_lib/engine/executors.js`, `api/_lib/runners/{index,http}.js`, `api/_lib/db.js`(인덱스), `shared/nodeFields.js`(인증정보 고르기 항목), `vercel.json`, `src/menu.js`, `src/App.jsx`, `src/lib/api.js`, `src/editor/{PropertiesPanel,FlowEditor}.jsx`, `src/pages/WorkflowDetail.jsx`, `.env.example`, `package.json`, `README.md`, `docs/*` |
| 영향 범위 | 새 메뉴 Credentials, 노드 설정의 인증정보 고르기(HTTP·GAS·GitHub), Webhook 노드의 받을 주소, 저장된 Workflow 위쪽의 "자동 실행" 스위치. 새 API `/api/credentials`, `/api/hooks/<토큰>`, `/api/cron`, `/api/workflows/:id/activate`·`webhook`. 새 컬렉션 `credentials`·`webhook_tokens`, `workflows`에 `scheduleState`·`activatedAt`. HTTP·GAS·GitHub 노드가 실제로 바깥에 요청을 보냄 |
| 필요한 설정 (배포 전) | Vercel 환경변수 `CREDENTIALS_KEY`(32바이트 base64)·`CRON_SECRET`, GitHub 저장소 Secret `FLOWBUILDER_CRON_SECRET`(= `CRON_SECRET`과 같은 값). 없으면 인증정보 등록은 503 `CREDENTIALS_NOT_CONFIGURED`, `/api/cron`은 503 `CRON_NOT_CONFIGURED` |
| 배포 상태 | **미배포** (GitHub 푸시 전, 사용자 확인 대기) |
| 롤백 방법 | Vercel에서 이전 배포(커밋 11437e4)로 되돌리기, 또는 `git revert`. 새 컬렉션은 남지만 이전 버전은 읽지 않음. `CREDENTIALS_KEY`를 바꾸거나 잃어버리면 등록한 인증정보를 읽을 수 없으니 다시 등록해야 함 |

설계와 달라진 점 (설계 문서 v1.8에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 외부 실행기 결과 받기 | `RUNNER_CALLBACK_SECRET`으로 Callback 검증 | Callback 없음. GAS는 응답을 기다리고(15초), GitHub는 상태를 15초 간격으로 물어봄 | Vercel 함수가 짧고, 받는 주소를 열면 공격 대상이 늘어서 |
| 주기 작업 | 정의 없음 | GitHub Actions가 5분마다 `/api/cron`을 부름 | Vercel Hobby 크론은 하루 1번뿐 (무료만 쓰는 조건) |
| 자동 실행 | 정의 없음 | Workflow의 `status`를 `active`로 두고 켜기·끄기 | Webhook·예약은 사용자가 켠 Workflow만 시작하게 |
| 예약 시각 정밀도 | 정의 없음 | 5분 안팎 지연 가능, 1시간 넘게 늦으면 건너뜀 | 주기 작업이 5분 간격이고 GitHub이 늦게 부를 수 있어서 |
| 인증정보 비밀값 | "Credential 암호화" 미정 | AES-256-GCM, 키는 환경변수, 화면에는 끝 4글자만 | 설계 8장 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 암호화 10개: 복호화 일치, 암호문에 평문 없음, 같은 값도 매번 다른 암호문, 암호문·태그·키를 바꾸면 실패, 키 없음·길이 틀림은 503, Webhook 토큰 모양, 해시·비교 | 통과 |
| 수행함 | 예약 시각 계산 9개 (한국 시간): 매일·매시간·매주, 정각, 자정 경계, 요일 경계 | 통과 |
| 수행함 | GAS 실행기 10개 (가짜 응답): 302 따라가기·토큰 전달·입력값 채우기, 다른 곳으로 넘기면 실패, script.google.com이 아니면 요청 안 보냄, 내부 주소로 풀리면 실패, 인증정보 없음, JSON이 아닌 응답, `ok:false`, 500, 깨진 JSON, 연결 오류 | 통과 |
| 수행함 | GitHub Actions 실행기 14개 (가짜 응답): 시작·15초 뒤 확인, 진행 중·성공·실패 결론, 6시간 넘으면 중단, 204, 401·403·404·422 안내, 인증정보 없음, 저장소 모양 검사, 파일 이름 인코딩, 깨진 입력값 | 통과 |
| 수행 안 함 | 인증정보 등록·목록·삭제와 권한(Owner·Admin만), 다른 그룹 인증정보 못 씀, Webhook 주소 만들기·받기(405·409·413·404), 자동 실행 켜기·끄기·검증 오류 거절, 예약 실행의 중복 방지(같은 시각 한 번), `/api/cron` 인증(401·503) | **미확인** (시험용 메모리 DB를 이 환경에서 내려받지 못함) |
| 수행 안 함 | 화면: Credentials 메뉴, 인증정보 고르기, Webhook 주소 복사, 자동 실행 스위치, 휴대폰 폭 | **미확인** (빌드만 통과) |
| 수행 안 함 | 실제 Google Apps Script·GitHub 호출, GitHub Actions 5분 주기 작업이 실제로 도는지, Vercel 환경변수 적용, 배포 | **미확인** |

미완료 항목

- 위 "수행 안 함" 항목의 확인
- 실패 시 재시도(retrying), 오류 갈래
- 실행 기록 전용 화면(Executions)과 30일 자동 삭제 (10단계)
- DNS 주소가 확인 뒤 바뀌는 경우(DNS rebinding)까지는 막지 못함
- 인증정보 수정(비밀값 바꾸기)은 없음: 삭제 후 다시 등록
- GitHub은 저장소에 60일 동안 변경이 없으면 예약 실행을 멈춤 → 5분 주기 작업이 멈출 수 있음 (멈추면 Actions 화면에서 다시 켜기)

다음 작업

- 10단계: 실행 기록 화면과 30일 자동 삭제

---

## 2026-11-16 · v0.8.0 · 8단계 실행 엔진 (Execution Orchestrator)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 8단계. 7.1 실행 흐름, 7.2 실행 상태, 2장 Execution Orchestrator·Runner Adapter, 3.2 Run 버튼·하단 실행 결과 |
| 변경 파일 | 신규: `api/executions.js`, `api/_lib/executions.js`, `api/_lib/engine/executors.js`, `api/_lib/engine/template.js`, `api/_lib/runners/index.js`, `api/_lib/runners/http.js`, `src/editor/ExecutionPanel.jsx`, `src/editor/RunDialog.jsx`, `src/editor/runContext.js` / 수정: `api/workflows.js`(run), `api/_lib/workflows.js`(권한 확인 공개, 삭제 시 실행 기록 삭제), `api/_lib/groups.js`(그룹 삭제 시 실행 기록 삭제), `api/_lib/db.js`(인덱스), `vercel.json`(함수 30초, 다시쓰기), `src/editor/FlowEditor.jsx`, `src/editor/EditorToolbar.jsx`, `src/editor/WorkflowNode.jsx`, `src/pages/WorkflowDetail.jsx`, `src/pages/WorkflowEditor.jsx`, `src/pages/Dashboard.jsx`, `src/lib/api.js`, `package.json`, `package-lock.json`, `README.md`, `docs/*` |
| 영향 범위 | 저장된 Workflow 화면(Run, 실행 결과 창), Dashboard 실행 수, 새 API `/api/workflows/:id/run`·`/api/executions`, 새 컬렉션 `executions`, Workflow·그룹 삭제(실행 기록도 삭제). HTTP Request 노드가 실제로 바깥에 요청을 보냄 |
| 배포 상태 | 운영 배포 (2026-11-16) · 커밋 90547d2 · https://flowbuilder-roan.vercel.app |
| 롤백 방법 | Vercel에서 이전 배포(커밋 30da20e)로 되돌리기, 또는 `git revert`. `executions` 컬렉션은 남지만 이전 버전은 읽지 않으므로 영향 없음 |

설계와 달라진 점 (설계 문서 v1.7에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 실행 방식 | 정의 없음 | 요청마다 정해진 시간만 진행하고 저장, 다음 요청에서 이어 감 | Vercel 함수 시간 제한 |
| 진행시키는 주체 | 정의 없음 | 실행 결과 창이 상태를 물어볼 때 | 서버 주기 작업이 아직 없음. 아무도 안 보면 Delay 뒤가 멈춤(9단계 이후 예약 실행과 함께 해결) |
| HTTP Request 실행 위치 | 외부 실행기(Runner)로 위임 | 서버 함수에서 바로 (15초까지) | 짧은 REST 호출은 실행기 없이 가능. 긴 작업은 9단계 GAS·GitHub로 |
| 실행 기록 보관 | 정의 없음 | Workflow당 최근 50개 | 무료 DB 512MB (30일 자동 삭제는 10단계) |
| 모이는 노드 | 정의 없음 | 먼저 도착한 값으로 한 번만 실행 | 단순하고 예측 가능하게. 여러 값을 합치는 노드는 나중에 |
| retrying 상태 | 7.2에 있음 | 아직 안 씀 | 재시도 기능은 아직 없음 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 실행 엔진 57개 항목 (메모리 MongoDB): 입력값 바꾸기 7, 조건 계산 4, HTTP 주소 막기 7(localhost·127.0.0.1·사설망·메타데이터·사설 IP로 풀리는 이름·ftp·공개 주소), If/Else 양쪽 갈래·건너뜀·변환 결과, Switch 일치·기본, 미연결 실행기 실패와 뒤 노드 건너뜀, 검증 오류 시 400·기록 없음, Viewer 실행 403·기록 보기 가능, 비멤버 404, 입력값 검사, Delay 대기 → 시각 전 대기 유지 → 시각 후 이어서 성공, 동시 진행 3개 제한, 취소·다시 취소 409·취소 후 진행 안 함, 동시에 세 요청이 처리해도 노드 한 번씩(잠금), HTTP 성공·보낸 주소·헤더·방식·redirect 안 따라감, HTTP 500 실패, 입력값으로 내부 주소를 넣어도 막고 요청 안 보냄, 큰 결과 2KB로 자름, 목록·개수, Workflow·그룹 삭제 시 실행 기록 삭제, 인덱스 | 통과 |
| 수행함 | 이전 단계 시험 다시 실행: 그룹 52, Workflow 47, 검증 26 (검증 시험의 "없는 하위 주소" 예시를 `/run`에서 `/zzz`로 바꿈 — `/run`이 생겼으므로) | 통과 |
| 수행함 | 화면 시험 (실제 API 코드 + 메모리 DB + 가짜 로그인, 크롬): Run 창에 `{"amount":150}` → 실행 결과 창 "기다리는 중", 노드에 성공 표시, "큰 주문? → YES" | 통과 |
| 수행함 | 실행 결과 창을 열어 둔 채 기다림 → 3초 대기 후 이어서 "성공", 작은 주문 노드는 "건너뜀"(흐리게) | 통과 |
| 수행함 | 결과 항목 누르기 → 출력 `{"msg":"큰 주문 150원"}` 펼침, 노드 선택 | 통과 |
| 수행함 | 저장 안 된 변경이 있으면 Run 꺼짐("저장한 뒤 실행할 수 있습니다"), 저장 후 켜짐 | 통과 |
| 수행함 | 필수값 빈 Switch를 저장하고 Run → 서버가 거절, 위쪽 안내 + 검증 결과 창 자동으로 열림 | 통과 |
| 수행함 | Viewer: Run 꺼짐(이유 표시), 실행 기록 버튼으로 지난 실행·노드 표시 보기, 취소 버튼 없음 | 통과 |
| 수행함 | Dashboard 실행 수 1 (거절된 실행은 기록 안 됨) | 통과 |
| 수행함 | 시험 중 콘솔 오류 0건 | 통과 |
| 수행 안 함 | 화면에서 취소 버튼 누르기 | 미확인 (서버 취소는 시험함) |
| 수행함 | 배포 주소: `/api/executions` 401(배포 전 없던 주소), `/api/workflows/:id/run` 토큰 없이 401, `/api/health` db ok | 통과 |
| 수행함 | 실제 환경(사용자 로그인 + MongoDB Atlas): 시험용 Workflow(HTTP 노드 없음)를 그룹 "Group"에 만들고 검증 ok → API로 `{"amount":150}` 실행 201·성공, 큰 주문?→yes, 결과 "큰 주문 150원", 작은 주문 건너뜀, 상태 조회·목록 일치 | 통과 |
| 수행함 | 실제 환경 화면: 실행 기록 버튼 → 결과 창 "성공"·노드 표시, Run 버튼 → 창에 `{"amount":50}` → NO 갈래 성공, 큰 주문 건너뜀 | 통과 |
| 수행함 | 시험용 Workflow 삭제 → 그 실행 기록 2개도 삭제(실행 수 2 → 0). 사용자의 기존 Workflow "example"은 그대로 | 통과 |
| 수행 안 함 | 실제 바깥 주소로 HTTP 요청 | 미확인 (사용자 계정에서 바깥에 요청을 보내지 않으려고 뺌. 서버 시험에서는 가짜 응답으로 확인) |
| 수행 안 함 | Vercel 함수 30초 설정이 실제로 적용됐는지 | 미확인 (시험한 실행이 모두 1초 안에 끝나 시간 제한에 닿지 않음) |
| 수행 안 함 | 휴대폰 폭에서 실행 결과 창 | 미확인 |

미완료 항목

- 아무도 화면을 보지 않을 때 Delay 뒤를 이어 가는 서버 주기 작업 (예약 실행과 함께)
- GAS·GitHub Actions 실행기, Webhook으로 시작하기, Schedule 예약 실행 (9단계)
- 실패 시 재시도(retrying), 오류 갈래
- 실행 기록 전용 화면(Executions 메뉴)과 30일 자동 삭제, 노드별 로그 컬렉션 (10단계)
- DNS 주소가 확인 뒤 바뀌는 경우(DNS rebinding)까지는 막지 못함

다음 작업

- 9단계: 외부 연동 (GAS / GitHub Actions / Webhook)

---

## 2026-11-16 · v0.7.0 · 7단계 Workflow 검증 (Validator)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 7단계. 3.2 Toolbar의 Validate, 4.2 "실행 흐름 검증", 7.1 실행 전 "Workflow 유효성 검사" |
| 변경 파일 | 신규: `shared/validator.js`, `shared/nodeKinds.js`, `src/editor/ValidationPanel.jsx`, `src/editor/validationContext.js` / 이동: `src/editor/nodeFields.js` → `shared/nodeFields.js` / 수정: `src/editor/nodeCatalog.js`(공용 목록 + 아이콘), `src/editor/FlowEditor.jsx`(검증 상태·패널·노드 이동), `src/editor/EditorToolbar.jsx`(Validate 켜기), `src/editor/WorkflowNode.jsx`(문제 노드 테두리, 테두리 스타일을 컴포넌트로), `src/editor/editor.css`(border 제거), `src/editor/PropertiesPanel.jsx`(import 경로), `api/workflows.js`, `api/_lib/workflows.js`(검증 API), `package.json`, `package-lock.json`, `README.md`, `docs/*` |
| 영향 범위 | Workflow 편집기(새·저장된 화면 모두), 새 API `POST /api/workflows/:id/validate`. DB 변경 없음 |
| 배포 상태 | 운영 배포 (2026-11-16) · 커밋 30da20e. Vercel 배포 READY, 운영 주소의 편집기 파일에 검증 결과 창 포함 확인 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 8a36ab2)로 되돌리기, 또는 `git revert`. 데이터 변경이 없어 되돌려도 영향 없음 |

설계와 달라진 점 (설계 문서 v1.6에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 검증 규칙 | "유효성 검사"만 있고 규칙 없음 | 설계 7.3에 오류 11종·경고 5종으로 정함 | 무엇을 막을지 정해야 8단계 실행 전 검사가 가능 |
| 반복(순환) 흐름 | 정의 없음 | 오류로 막음 | 실행 엔진이 반복을 지원하기 전까지 무한 실행을 막기 위해 |
| Trigger 여러 개 | 정의 없음 | 허용(경고) | 수동·예약 등 시작 방법을 한 Workflow에 둘 수 있게 |
| 검증 실패 시 저장 | 정의 없음 | 저장은 허용, 실행만 막음(8단계) | 그리던 중인 흐름도 저장할 수 있어야 해서 |

함께 고친 문제

- 4단계부터 노드 테두리 색이 표시되지 않던 문제: `editor.css`의 `border: 2px solid`가 컴포넌트에서 정한 색(선택 표시)을 덮어쓰고 있었음. 테두리 스타일을 컴포넌트에서만 정하도록 고침. (검증 표시를 시험하다 발견, 계산된 스타일로 확인)

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 검증 규칙 21개 항목 (정상 흐름, 빈 흐름, Trigger 없음·혼자·여러 개, 필수 설정·형식, 이름 없음, 모르는 노드, 자기 연결, Trigger로 들어오는 선, 순환·순환 경로 문구, 없는 노드로 이어진 선, 지운 Switch 갈래, 빈 갈래, 닿지 않는 노드, 중복 선, 숨겨진 칸 제외, params 없는 옛 노드) | 통과 |
| 수행함 | 검증 API 5개 항목 (Viewer 검증 가능·저장본 기준, 비멤버 404, GET 405, 없는 하위 주소 404, 고쳐 저장 후 통과) | 통과 |
| 수행함 | 그룹 API 52개·Workflow API 47개 다시 실행 (파일 이동 후) | 통과 |
| 수행함 | 크롬(로그인 끈 테스트 서버): 예시 흐름 Validate → "문제가 없습니다" | 통과 |
| 수행함 | 결과 창이 열린 채 Switch 추가 → 바로 "오류 1 · 경고 2", Validate에 빨간 숫자, Switch에 빨간 점선 테두리 | 통과 |
| 수행함 | 결과 항목 누르기 → Switch 선택·속성 창 표시, "나눌 값" 입력 → 바로 "오류 0 · 경고 2", 테두리 주황 | 통과 |
| 수행함 | HTTP Request → If/Else 선으로 순환 만들기 → "순환 연결이 있습니다: If / Else → HTTP Request" | 통과 |
| 수행함 | 휴대폰 폭(390px): 결과 창이 아래쪽에, 캔버스는 위쪽에 남음 | 통과 |
| 수행함 | 시험 중 콘솔 오류 0건 | 통과 |
| 수행 안 함 | 배포 주소에서 저장된 Workflow 검증 (실제 로그인·DB) | 미확인 (사용자 계정에 저장된 Workflow가 없었음) |

미완료 항목

- 실행(Run) 전 서버 검증 연결은 8단계에서 함
- 검증 결과는 저장하지 않음 (목록에서 "검증 통과" 표시 등은 없음)
- 선(edge) 자체에 문제 표시는 없음. 선 문제는 그 선의 노드에 표시됨

다음 작업

- 8단계: 실행 엔진 (Execution Orchestrator)

---

## 2026-11-16 · v0.6.0 · 6단계 Workflow 저장 (MongoDB)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 6단계. 4.2 "Workflow 저장 및 불러오기", 5장 Workflow List, 원칙 2 "모든 API는 그룹 권한 검증" |
| 변경 파일 | 신규: `api/workflows.js`, `api/_lib/workflows.js`, `api/_lib/http.js`, `api/_lib/errors.js`, `src/editor/FlowEditor.jsx`(편집기 본체를 옮겨 옴), `src/editor/graph.js`, `src/pages/Workflows.jsx`, `src/pages/WorkflowDetail.jsx`, `src/components/SaveWorkflowDialog.jsx`, `src/lib/format.js` / 수정: `api/groups.js`(공통 처리 사용), `api/_lib/groups.js`(권한 확인 함수 공개, 그룹 삭제 시 Workflow 삭제), `api/_lib/db.js`(인덱스), `vercel.json`(다시쓰기), `src/pages/WorkflowEditor.jsx`(새 Workflow 화면으로), `src/pages/Dashboard.jsx`(실제 데이터), `src/editor/EditorToolbar.jsx`, `src/editor/PropertiesPanel.jsx`(보기 전용), `src/editor/draftStorage.js`, `src/lib/api.js`, `src/App.jsx`, `src/menu.js`, `package.json`, `package-lock.json`, `README.md`, `docs/*` |
| 영향 범위 | Workflows 메뉴(새 화면), Workflow Editor, Dashboard, 새 API `/api/workflows`, 그룹 삭제(Workflow도 지움), 그룹 API 내부 구조(동작은 같음). 새 컬렉션 `workflows` |
| 배포 상태 | 운영 배포 (2026-11-16) · https://flowbuilder-roan.vercel.app/workflows · 커밋 eadbf45 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 1aca43b)로 되돌리기, 또는 `git revert`. 되돌려도 `workflows` 컬렉션은 남지만 이전 버전은 읽지 않으므로 영향 없음 |

설계와 달라진 점 (설계 문서 v1.5에 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| 동시 저장 | 정의 없음 | version 확인, 다르면 409 후 "최신 불러오기" 안내 | 한쪽 작업이 몰래 덮어써지지 않게 |
| 저장 한도 | 정의 없음 | 노드 200·선 400·200KB·그룹당 100개 | 무료 DB 512MB |
| Workflow 삭제 권한 | 정의 없음 | 편집 권한(Owner·Admin·Editor) | 권한표의 "편집"에 포함된다고 봄. 바꾸려면 `api/_lib/workflows.js` 한 곳 |
| 새 Workflow | 정의 없음 | 브라우저 임시 저장 → 첫 저장 때 그룹·이름 선택 | 4단계 임시 저장을 그대로 살림 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm run build` | 통과 |
| 수행함 | 메모리 MongoDB로 Workflow API 47개 항목: 역할별 만들기·조회·저장·삭제 허용/거부, 비멤버 404, 모양 검사(배열·type·id 중복·position·params·없는 노드 연결), 크기·개수 한도, 화면 전용 필드 제거·위치 반올림, 버전 충돌 409 후 내용 유지, 이름만 바꾸기, 그룹 필터, 그룹 삭제 시 Workflow 삭제, 인덱스, 토큰 없음 401 | 통과 |
| 수행함 | 3단계 그룹 API 52개 항목 다시 실행 (공통 처리로 바꾼 뒤) | 통과 |
| 수행함 | 화면 시험 (실제 API 코드 + 메모리 DB + 가짜 로그인, 크롬): 새 Workflow에서 Save → 그룹·이름 고르기 → `/workflows/:id`로 이동, 임시 저장 지워짐 | 통과 |
| 수행함 | 노드 추가 → "저장 안 된 변경 있음" → Ctrl+S → "저장됨" → 새로고침 후 노드 5개·버전 2 | 통과 |
| 수행함 | 화면에서 고치는 사이 다른 쪽에서 먼저 저장 → 저장 시 경고, 덮어쓰지 않음 → "최신 불러오기"로 버전 3 표시 | 통과 |
| 수행함 | Viewer로 열기: "보기 전용 (Viewer)", 노드 목록 없음, 끌기 불가, Delete 키 무시, 속성 입력칸 비활성, 이름 바꾸기·삭제 버튼 없음 | 통과 |
| 수행함 | Workflows 목록(그룹·노드 수·수정 시각, Viewer 표시), Dashboard Workflow 수·최근 목록 | 통과 |
| 수행함 | Viewer가 "새 Workflow" → "편집할 수 있는 그룹이 없습니다" 안내 | 통과 |
| 수행함 | 목록에서 새로 만들기(Manual 노드 하나로 시작) → 삭제 확인 → 목록으로 돌아감 | 통과 |
| 수행함 | 시험 중 콘솔 오류 0건 | 통과 |
| 수행함 | 배포 주소: `/api/health` db ok, `/api/workflows`·`/api/workflows/:id` 토큰 없이 401, `/workflows` 화면 주소 응답 | 통과 |
| 수행함 | 배포 주소에서 사용자 로그인 토큰으로 `GET /api/workflows` 200(0개), `GET /api/groups`에서 그룹 "Group" Owner·편집 가능 (실제 Clerk + 실제 Atlas, 읽기만) | 통과 |
| 수행 안 함 | 실제 환경에서 화면으로 저장 | 미확인 (사용자가 직접 확인. 크롬 창이 최소화돼 화면 확인 불가) |
| 수행 안 함 | 휴대폰 폭에서 저장·목록 화면 | 미확인 |

미완료 항목

- 앱 안에서 다른 메뉴로 옮겨 갈 때 저장 안 된 변경 경고 (브라우저 닫기·새로고침 때만 경고함)
- Workflow 설명(description)은 API에는 있지만 화면에서 아직 못 바꿈
- 게시(Publish)·버전 기록 보기 (설계 5장 Workflow Version·Publish)
- Workflow를 다른 그룹으로 옮기기

다음 작업

- 7단계: Workflow 검증 (Validator)

---

## 2026-11-16 · v0.5.0 · 5단계 노드 속성 관리 (Properties Panel)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 5단계. 설계 3.2 오른쪽 Properties(Node Name, Parameters, Input, Output, Test Node)와 4.2 "노드 속성 변경, 조건 및 분기 설정" 구현 |
| 변경 파일 | 신규: `src/editor/nodeFields.js`, `src/editor/PropertiesPanel.jsx` / 수정: `src/editor/nodeCatalog.js`(출구를 노드 값에 따라 계산, 기본 설정값), `src/editor/WorkflowNode.jsx`(요약·"설정 필요" 표시, 출구 변경 알림), `src/pages/WorkflowEditor.jsx`(패널 연결, 실행 취소 묶기, Switch 선 정리, 미니맵 축소), `package.json`, `package-lock.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/FLOWBUILDER_DESIGN.md`(v1.4), `docs/CHANGE_MANAGEMENT.md` |
| 영향 범위 | Workflow Editor 화면만. 저장 데이터에 `data.params` 추가(이전 임시 저장은 기본값으로 채워 읽음). 서버 API·DB 변경 없음 |
| 배포 상태 | 운영 배포 (2026-11-16) · https://flowbuilder-roan.vercel.app/editor · 커밋 b5bfa47 |
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
| 수행함 | 배포 주소에 새 편집기 파일(속성 패널 포함)이 올라간 것, `/api/health` db ok | 통과 |
| 수행 안 함 | 로그인한 배포 주소에서 속성 패널 조작 | 미확인 (크롬 창이 최소화돼 화면 확인 불가) |

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
