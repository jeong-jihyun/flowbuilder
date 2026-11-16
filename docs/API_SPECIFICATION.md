# API SPECIFICATION

API가 추가·변경되면 이 문서를 같이 고칩니다.

## 공통 규칙

- 기본 주소: `/api`
- 응답은 JSON, 항상 `ok` (true/false)를 포함합니다.
- 실패 시: `{ "ok": false, "error": "오류_코드" }`
- `/api/health`를 뺀 모든 API는 로그인 토큰이 필요합니다: `Authorization: Bearer <Clerk 토큰>`
- 그룹에 딸린 API는 그룹 권한도 서버에서 확인합니다(역할표: 설계 문서 8.2, 코드: `api/_lib/roles.js`).

공통 오류

| 상태 | error | 뜻 |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | 토큰이 없음 |
| 401 | `INVALID_TOKEN` | 토큰이 위조됐거나 만료됨 |
| 405 | `METHOD_NOT_ALLOWED` | 허용되지 않은 호출 방식 |
| 503 | `AUTH_NOT_CONFIGURED` | 서버에 `CLERK_SECRET_KEY`가 없음 |
| 503 | `DB_NOT_CONFIGURED` | 서버에 `MONGODB_URI`가 없음 |
| 503 | `DB_UNAVAILABLE` | DB에 연결하지 못함 |
| 500 | `INTERNAL_ERROR` | 예상하지 못한 서버 오류 (서버 로그에 기록) |

## 구현된 API

### GET /api/health

서버가 살아 있는지 확인합니다. 로그인 없이 호출할 수 있습니다.

응답 200

```json
{ "ok": true, "service": "flowbuilder", "time": "2026-11-16T09:00:00.000Z", "db": "ok" }
```

`db`: `ok`(연결됨) / `not_configured`(`MONGODB_URI` 없음) / `error`(연결 실패, 자세한 내용은 서버 로그에만). 3단계에서 추가.

GET이 아니면 405

```json
{ "ok": false, "error": "METHOD_NOT_ALLOWED" }
```

### GET /api/me

로그인한 사용자를 서버가 확인합니다. 토큰 필요.

응답 200

```json
{ "ok": true, "userId": "user_xxxxxxxx" }
```

실패: 위 공통 오류(401, 405, 503)

## 그룹 API (3단계)

모두 토큰 필요. 파일 하나(`api/groups.js`)가 받습니다. `/api/groups/...` 주소는 `vercel.json`에서 `/api/groups?path=...`로 바꿔 전달합니다(Vercel 무료 등급 함수 12개 제한 때문).

| 방식 | 주소 | 누가 | 본문 | 성공 응답 |
| --- | --- | --- | --- | --- |
| GET | `/api/groups` | 로그인한 누구나 | - | 200 `{ groups: [Group] }` 내가 속한 그룹만 |
| POST | `/api/groups` | 로그인한 누구나 | `{ name, description? }` | 201 `{ group }` 만든 사람이 Owner |
| GET | `/api/groups/:id` | 멤버 | - | 200 `{ group }` |
| PATCH | `/api/groups/:id` | Owner, Admin | `{ name?, description? }` | 200 `{ group }` |
| DELETE | `/api/groups/:id` | Owner | - | 200 `{}` 멤버 기록도 삭제 |
| GET | `/api/groups/:id/members` | 멤버 | - | 200 `{ members: [Member] }` Owner→Viewer 순 |
| POST | `/api/groups/:id/members` | Owner, Admin | `{ email, role }` | 201 `{ member }` |
| PATCH | `/api/groups/:id/members/:userId` | Owner, Admin | `{ role }` | 200 `{ member }` |
| DELETE | `/api/groups/:id/members/:userId` | Owner, Admin, 또는 본인(나가기) | - | 200 `{}` |

Group

```json
{
  "id": "6739...",
  "name": "마케팅팀",
  "description": "",
  "createdAt": "2026-11-16T09:00:00.000Z",
  "myRole": "owner",
  "permissions": { "view": true, "edit": true, "run": true, "manageMembers": true },
  "memberCount": 3
}
```

`memberCount`는 목록(GET `/api/groups`)에만 있습니다. 화면은 `permissions`로 버튼을 보이거나 숨기고, 최종 판단은 서버가 합니다.

Member

```json
{ "userId": "user_xxx", "email": "a@b.com", "name": "홍길동", "role": "editor", "addedAt": "2026-11-16T09:00:00.000Z" }
```

`role`: `owner` | `admin` | `editor` | `viewer`

역할 규칙

- Admin은 Editor·Viewer만 추가·변경·내보내기 합니다. Owner는 모두 할 수 있습니다.
- Owner가 한 명뿐이면 그 Owner를 강등하거나 내보낼 수 없습니다(`LAST_OWNER`).
- 멤버 추가는 FlowBuilder(Clerk)에 이미 가입한 이메일만 됩니다.

그룹 API 오류

| 상태 | error | 뜻 |
| --- | --- | --- |
| 400 | `NAME_REQUIRED` | 그룹 이름이 비어 있음 |
| 400 | `TEXT_TOO_LONG` | 이름 50자, 설명 200자 초과 |
| 400 | `INVALID_EMAIL` | 이메일 형식 오류 |
| 400 | `INVALID_ROLE` | 역할 값 오류 |
| 403 | `FORBIDDEN` | 멤버지만 그 작업을 할 역할이 아님 |
| 404 | `GROUP_NOT_FOUND` | 그룹이 없거나 내가 멤버가 아님 (둘을 구분하지 않음) |
| 404 | `MEMBER_NOT_FOUND` | 그 사용자가 그룹 멤버가 아님 |
| 404 | `USER_NOT_FOUND` | 그 이메일로 가입한 사람이 없음 (멤버 관리 권한이 있을 때만 알려 줌) |
| 404 | `NOT_FOUND` | 없는 주소 |
| 409 | `ALREADY_MEMBER` | 이미 멤버 |
| 409 | `LAST_OWNER` | 마지막 Owner를 강등·삭제하려 함 |

## Workflow API (6단계)

모두 토큰 필요. 파일 하나(`api/workflows.js`)가 받습니다. `/api/workflows/...`는 `vercel.json`에서 `?path=...`로 바꿔 전달합니다. 권한은 Workflow가 속한 그룹의 역할로 정합니다.

| 방식 | 주소 | 누가 | 본문 | 성공 응답 |
| --- | --- | --- | --- | --- |
| GET | `/api/workflows` | 로그인한 누구나 | - | 200 `{ workflows: [Workflow] }` 내가 속한 그룹의 것만, 최근 수정 순, nodes·edges 제외 |
| GET | `/api/workflows?groupId=` | 그 그룹 멤버 | - | 200 위와 같음 (그 그룹만) |
| POST | `/api/workflows` | 그룹의 Owner·Admin·Editor | `{ groupId, name, description?, nodes?, edges? }` | 201 `{ workflow }` (version 1) |
| GET | `/api/workflows/:id` | 그룹 멤버 | - | 200 `{ workflow }` (nodes·edges·groupName 포함) |
| PUT | `/api/workflows/:id` | 그룹의 Owner·Admin·Editor | `{ version, name?, description?, nodes?, edges? }` | 200 `{ workflow }` (version + 1) |
| DELETE | `/api/workflows/:id` | 그룹의 Owner·Admin·Editor | - | 200 `{}` |

Workflow

```json
{
  "id": "6739...",
  "groupId": "6738...",
  "groupName": "마케팅팀",
  "name": "주문 알림",
  "description": "",
  "status": "draft",
  "version": 3,
  "nodeCount": 4,
  "createdAt": "2026-11-16T09:00:00.000Z",
  "updatedAt": "2026-11-16T09:30:00.000Z",
  "myRole": "editor",
  "permissions": { "view": true, "edit": true, "run": true, "manageMembers": false },
  "nodes": [],
  "edges": []
}
```

- `nodes`·`edges`는 하나 불러오기·만들기·저장 응답에만 있습니다. 모양은 설계 6.1과 4.1(`type`, `data.kind`, `data.label`, `data.params`, `sourceHandle`).
- 서버는 저장 전에 모양을 검사하고 화면 전용 필드(`selected`, `measured` 등)를 버립니다. 위치는 정수로 반올림합니다.
- `version`: 불러올 때 받은 값을 PUT에 그대로 보냅니다. 그 사이 다른 사람이 저장했으면 409 `VERSION_CONFLICT`이고 아무것도 바뀌지 않습니다.

Workflow API 오류

| 상태 | error | 뜻 |
| --- | --- | --- |
| 400 | `NAME_REQUIRED` | 이름이 비어 있음 |
| 400 | `TEXT_TOO_LONG` | 이름 80자, 설명 300자 초과 |
| 400 | `INVALID_WORKFLOW` | nodes·edges 모양 오류. `detail`에 위치 (예: `nodes[3].position`) |
| 400 | `WORKFLOW_TOO_LARGE` | 노드 200개·연결선 400개·200KB 초과. `detail`에 한도 |
| 400 | `VERSION_REQUIRED` | PUT에 `version`이 없음 |
| 403 | `FORBIDDEN` | 그룹 멤버지만 편집 권한 없음 (Viewer) |
| 404 | `GROUP_NOT_FOUND` | 만들거나 거를 그룹이 없거나 멤버가 아님 |
| 404 | `WORKFLOW_NOT_FOUND` | Workflow가 없거나 그 그룹 멤버가 아님 (둘을 구분하지 않음) |
| 409 | `VERSION_CONFLICT` | 다른 사람이 먼저 저장함. `detail`에 최신 버전 |
| 409 | `TOO_MANY_WORKFLOWS` | 그룹당 100개 초과 |

공통: 실패 응답에 `detail`(어디가 틀렸는지)이 붙을 수 있습니다. 화면은 문구 뒤에 괄호로 보여 줍니다.

그룹 API 변경: `DELETE /api/groups/:id`는 이제 그 그룹의 Workflow도 함께 지웁니다.

### POST /api/workflows/:id/validate (7단계)

저장된 버전을 검증합니다. 그룹 멤버면 누구나(Viewer 포함). 본문 없음.

응답 200

```json
{
  "ok": true,
  "validation": {
    "version": 3,
    "ok": false,
    "errors": [{ "level": "error", "code": "INVALID_PARAM", "message": "\"HTTP Request\" · 주소 (URL): 꼭 넣어야 합니다", "nodeId": "action_1" }],
    "warnings": [{ "level": "warning", "code": "OPEN_BRANCH", "message": "...", "nodeId": "condition_1" }]
  }
}
```

- `validation.ok`는 오류가 없을 때 true (경고는 있어도 됨). 규칙과 code 목록은 설계 문서 7.3.
- `nodeId`·`edgeId`는 문제 위치(있을 때만).
- 오류: 404 `WORKFLOW_NOT_FOUND`(없거나 멤버 아님), 405(POST가 아님)

## 실행 API (8단계)

실행 시작은 `api/workflows.js`, 실행 기록은 `api/executions.js`가 받습니다. 두 함수는 최대 30초까지 돌 수 있게 설정했습니다(`vercel.json`). 실행 방식은 설계 문서 7.4.

| 방식 | 주소 | 누가 | 본문 | 성공 응답 |
| --- | --- | --- | --- | --- |
| POST | `/api/workflows/:id/run` | 그룹의 Owner·Admin·Editor | `{ input?, triggerNodeId? }` | 201 `{ execution }` 최대 20초 진행한 상태 |
| GET | `/api/executions?workflowId=` | 그 Workflow의 그룹 멤버 | - | 200 `{ executions: [Execution], counts: { total, failed } }` 최근 20개 |
| GET | `/api/executions` | 로그인한 누구나 | - | 200 위와 같음 (내가 속한 그룹 전체) |
| GET | `/api/executions/:id` | 그룹 멤버 | - | 200 `{ execution }` 진행 중이고 처리할 차례면 최대 8초 더 진행한 뒤 |
| POST | `/api/executions/:id/cancel` | 그룹의 Owner·Admin·Editor | - | 200 `{ execution }` |

Execution

```json
{
  "id": "673a...",
  "workflowId": "6739...",
  "workflowName": "주문 처리",
  "workflowVersion": 3,
  "status": "success",
  "triggerNodeId": "trigger_1",
  "startedBy": "user_xxx",
  "createdAt": "2026-11-16T12:00:00.000Z",
  "finishedAt": "2026-11-16T12:00:05.300Z",
  "resumeAt": null,
  "error": null,
  "stepCount": 5,
  "input": { "amount": 150 },
  "steps": [
    { "nodeId": "condition_1", "label": "큰 주문?", "kind": "ifElse", "status": "success", "branch": "yes", "output": { "amount": 150 }, "startedAt": "...", "finishedAt": "..." }
  ]
}
```

- `input`·`steps`는 하나 불러오기·실행·취소 응답에만 있습니다(목록에는 없음).
- `status`: `running`(진행 중) · `waiting`(Delay 등으로 기다림, `resumeAt` 이후 진행) · `success` · `failed` · `cancelled`. 노드 `status`는 여기에 `skipped`(실행 안 함)가 더해집니다.

실행 API 오류

| 상태 | error | 뜻 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | 저장된 버전에 검증 오류가 있어 실행 안 함. `detail`에 오류 수. 기록을 만들지 않음 |
| 400 | `INVALID_INPUT` | 입력이 { } JSON이 아니거나 10KB 초과 |
| 400 | `INVALID_TRIGGER` | `triggerNodeId`가 이 Workflow의 Trigger가 아님 |
| 403 | `FORBIDDEN` | Viewer가 실행·취소 |
| 404 | `WORKFLOW_NOT_FOUND` / `EXECUTION_NOT_FOUND` | 없거나 그룹 멤버가 아님 |
| 409 | `TOO_MANY_RUNNING` | 이 Workflow가 이미 3개 진행 중 |
| 409 | `ALREADY_FINISHED` | 끝난 실행을 취소하려 함 |

Workflow·그룹 API 변경: Workflow를 지우면 그 실행 기록도, 그룹을 지우면 그룹의 실행 기록도 함께 지웁니다.

## 외부 연동 API (9단계)

| 방식 | 주소 | 누가 | 본문 | 성공 응답 |
| --- | --- | --- | --- | --- |
| GET | `/api/credentials[?groupId=]` | 그룹 멤버 | - | 200 `{ credentials: [Credential] }` (비밀값 없음) |
| POST | `/api/credentials` | 그룹의 Owner·Admin | `{ groupId, name, type, secret, headerName? }` | 201 `{ credential }` |
| DELETE | `/api/credentials/:id` | 그룹의 Owner·Admin | - | 200 `{}` |
| POST | `/api/workflows/:id/activate` | Owner·Admin·Editor | `{ active: true/false }` | 200 `{ status: "active" \| "draft" }` |
| GET | `/api/workflows/:id/webhook?nodeId=` | Owner·Admin·Editor | - | 200 `{ path }` (없으면 `null`) |
| POST | `/api/workflows/:id/webhook` | Owner·Admin·Editor | `{ nodeId }` | 201 `{ path }` 새 주소 (이전 주소는 멈춤) |
| POST·GET | `/api/hooks/<토큰>` | 로그인 없음 (토큰이 열쇠) | 받은 내용 | 202 `{ ok, executionId, status }` |
| POST | `/api/cron` | `Authorization: Bearer <CRON_SECRET>` | - | 200 `{ ok, schedules: { started, skipped, failed }, executions, time }` |

Credential: `{ id, groupId, name, type, headerName?, hint, createdAt }`. `type`은 `githubToken` · `gasSecret` · `httpHeader`. `hint`는 비밀값의 끝 4글자(8글자 이하면 `…`). 그룹당 50개, 이름 50자, 비밀값 4000자까지.

Webhook 규칙

- 주소는 `/api/hooks/<무작위 토큰>`. 노드마다 하나. 토큰은 DB에 해시로 찾고 암호화해서도 보관합니다.
- Webhook 노드의 "받을 요청 방식"(GET 또는 POST)과 다르면 405 (`Allow` 헤더).
- 받은 본문과 주소 뒤 `?값`은 합쳐서 10,000자까지(넘으면 413). Trigger의 출력은 `{ body, query }`.
- 그 Workflow의 "자동 실행"이 꺼져 있으면 409 `WORKFLOW_INACTIVE`.
- 요청이 끝나길 기다리지 않고 202로 바로 답하고, 실행은 최대 8초 진행한 뒤 이어서 처리합니다.

자동 실행·예약

- `activate`로 켤 때 검증(7.3)을 하고 오류가 있으면 400 `VALIDATION_FAILED`. 켠 뒤 검증 오류가 있는 모양으로 저장하면 자동으로 꺼집니다.
- `/api/cron`은 GitHub Actions(`.github/workflows/flowbuilder-tick.yml`)가 5분마다 부릅니다. 자동 실행이 켜진 Workflow의 Schedule 노드를 확인해 시각이 된 것을 실행하고(같은 시각은 한 번만, 1시간 넘게 늦으면 건너뜀), 기다리는 실행을 최대 15초 진행합니다.
- `CRON_SECRET`이 서버에 없으면 503 `CRON_NOT_CONFIGURED`, 값이 맞지 않으면 401.

외부 연동 API 오류

| 상태 | error | 뜻 |
| --- | --- | --- |
| 400 | `INVALID_CREDENTIAL_TYPE` · `SECRET_REQUIRED` · `INVALID_HEADER_NAME` · `NODE_ID_REQUIRED` · `INVALID_ACTIVE` | 입력이 올바르지 않음 |
| 403 | `FORBIDDEN` | Editor 이하가 인증정보를 등록·삭제 |
| 404 | `CREDENTIAL_NOT_FOUND` · `WEBHOOK_NOT_FOUND` · `WEBHOOK_NODE_NOT_FOUND` | 없거나 그룹 멤버가 아님 / 토큰이 틀림 / 저장 안 된 노드 |
| 405 | `METHOD_NOT_ALLOWED` | Webhook 요청 방식이 노드 설정과 다름 |
| 409 | `WORKFLOW_INACTIVE` · `TOO_MANY_CREDENTIALS` | 자동 실행이 꺼져 있음 / 그룹당 50개 초과 |
| 413 | `PAYLOAD_TOO_LARGE` | Webhook 내용이 10,000자 초과 |
| 503 | `CREDENTIALS_NOT_CONFIGURED` · `CRON_NOT_CONFIGURED` | 서버에 `CREDENTIALS_KEY` / `CRON_SECRET`이 없음 |

## 예정 API (아직 없음, 구현할 때 확정)

| 단계 | 주소 | 용도 |
| --- | --- | --- |
| 10 | 실행 기록 전용 화면용 조회 | Executions 메뉴 |
