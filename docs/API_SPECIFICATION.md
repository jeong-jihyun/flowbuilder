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

## 예정 API (아직 없음, 구현할 때 확정)

| 단계 | 주소 | 용도 |
| --- | --- | --- |
| 7 | `/api/workflows/:id/validate` | 검증 |
| 8 | `/api/workflows/:id/run`, `/api/executions/:id` | 실행·상태 |
| 9 | `/api/callbacks/runner` | 외부 실행기 결과 수신 |
