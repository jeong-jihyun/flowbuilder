# DATABASE DESIGN

DB 구조가 바뀌면 이 문서를 같이 고칩니다.

## 현재 상태

MongoDB Atlas 무료 등급(M0)을 3단계부터 씁니다. (원래 6단계 예정이었으나 그룹 저장에 DB가 필요해 앞당김)

- 접속: 서버 환경변수 `MONGODB_URI` (브라우저는 DB에 직접 붙지 않음)
- DB 이름: `MONGODB_DB`, 비우면 `flowbuilder`
- 연결 코드: `api/_lib/db.js` (연결 1개를 재사용, 처음 연결할 때 인덱스 생성)

## 구현된 컬렉션

### groups

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `_id` | ObjectId | 그룹 ID |
| `name` | string | 1~50자 |
| `description` | string | 0~200자 |
| `createdBy` | string | 만든 사람 Clerk ID |
| `createdAt`, `updatedAt` | Date | |

### group_members

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `_id` | ObjectId | |
| `groupId` | ObjectId | `groups._id` |
| `userId` | string | Clerk 사용자 ID |
| `email`, `name` | string | 추가할 때의 Clerk 정보 사본 (화면 표시용, 나중에 Clerk에서 바뀌어도 자동 갱신 안 됨) |
| `role` | string | `owner` / `admin` / `editor` / `viewer` |
| `addedBy` | string | 추가한 사람 Clerk ID |
| `addedAt` | Date | |

인덱스

| 컬렉션 | 인덱스 | 용도 |
| --- | --- | --- |
| group_members | `{ groupId: 1, userId: 1 }` unique | 같은 사람 중복 추가 방지, 권한 조회 |
| group_members | `{ userId: 1 }` | 내 그룹 목록 |

그룹을 지우면 `group_members`의 해당 그룹 기록도 지웁니다. 6단계에서 `workflows`가 생기면 그룹 삭제 시 함께 정리해야 합니다.

## 계획된 컬렉션 (설계 문서 6장)

| 컬렉션 | 주요 데이터 | 만드는 단계 |
| --- | --- | --- |
| users | 사용자 정보, Clerk ID | 6 (2단계에서는 Clerk가 보관) |
| groups | 그룹 정보 | 3 (구현) |
| group_members | 사용자별 그룹 권한 | 3 (구현) |
| workflows | Workflow 정의, nodes, edges | 6 (구현) |
| workflow_triggers | 실행 Trigger 설정 | 8 |
| executions | 실행 이력 및 상태 | 8 (구현) |
| execution_logs | 노드별 실행 로그 | 10 |
| credentials | 외부 연동 인증정보 (평문 저장 금지) | 9 |

### workflows (6단계)

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `_id` | ObjectId | Workflow ID |
| `groupId` | ObjectId | 속한 그룹 `groups._id` |
| `name` | string | 1~80자 |
| `description` | string | 0~300자 (화면에서는 아직 안 씀) |
| `status` | string | 지금은 항상 `draft` (게시 기능 이후 `published` 등) |
| `version` | number | 저장할 때마다 1씩 올라감. 동시 저장 충돌 확인용 |
| `nodes`, `edges` | array | 아래 "Workflow 저장 형태" |
| `nodeCount` | number | 목록에서 nodes 를 안 읽고 개수를 보여 주려고 |
| `createdBy`, `updatedBy` | string | Clerk 사용자 ID |
| `createdAt`, `updatedAt` | Date | |

인덱스: `{ groupId: 1, updatedAt: -1 }` (그룹별 최근 수정 순 목록)

한도(서버에서 확인): 노드 200개, 연결선 400개, nodes+edges 200KB, 그룹당 100개. 1건 최대 약 200KB × 그룹당 100개 = 그룹당 최대 약 20MB.

## Workflow 저장 형태

편집기 화면의 `nodes`, `edges`를 그대로 저장합니다. 예시는 설계 문서 6.1을 따릅니다.

노드는 `{ id, type, position, data: { kind, label, params } }`, 연결선은 `{ id, source, target, sourceHandle, targetHandle, label? }`만 저장합니다. 화면 전용 값(선택 여부, 크기 등)은 저장하지 않습니다. 자세한 값은 설계 문서 4.1·4.3(v1.4). `params`가 없는 노드(4단계에서 만든 것)는 읽을 때 기본값으로 채웁니다.

서버에 저장하기 전의 "새 Workflow"(/editor)는 브라우저(localStorage `flowbuilder.editorDraft.v1`)에 같은 모양으로 임시 저장하고, 서버에 저장하면 지웁니다. 서버는 위치를 정수로 반올림해 저장합니다.

7단계(검증)는 DB 구조를 바꾸지 않았습니다. 검증 결과는 저장하지 않고 매번 계산합니다.

### executions (8단계)

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `_id` | ObjectId | 실행 ID |
| `workflowId`, `groupId` | ObjectId | 실행한 Workflow와 그 그룹 |
| `workflowName`, `workflowVersion` | string, number | 실행할 때의 이름·버전 |
| `status` | string | `running` / `waiting` / `success` / `failed` / `cancelled` (`pending`·`retrying`은 아직 안 씀) |
| `triggerNodeId` | string | 시작한 Trigger |
| `input` | object | Run 창에서 넣은 값 (10KB까지) |
| `steps` | array | 노드별 기록 `{ nodeId, label, kind, status, startedAt, finishedAt, output?, error?, branch?, resumeAt? }`. output은 2KB까지 (넘으면 `{ _truncated, preview }`) |
| `error` | string | 실패 이유 (어느 노드에서) |
| `resumeAt` | number(ms) | 기다리는 중이면 다시 진행할 시각 |
| `lockUntil` | number(ms) | 처리 중 잠금. 이 시각 전에는 다른 요청이 처리하지 않음 |
| `graph`, `queue` | object, array | 진행 중일 때만: 시작할 때의 nodes·edges 복사본, 다음에 처리할 노드. 끝나면 지움 |
| `startedBy` | string | Clerk 사용자 ID |
| `createdAt`, `updatedAt`, `finishedAt` | Date | |

인덱스: `{ workflowId: 1, createdAt: -1 }`, `{ groupId: 1, createdAt: -1 }`

용량: 1건은 대개 수 KB (노드 결과 2KB × 노드 수가 최대). 시스템은 기록을 자동으로 지우지 않습니다. 30일이 지난 기록이 있으면 Executions 화면이 알려 주고 사용자가 직접 삭제합니다(10단계).

### credentials (9단계)

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `_id` | ObjectId | 인증정보 ID. 노드의 `params.credentialId`가 이 값을 글자로 가짐 |
| `groupId` | ObjectId | 소유 그룹. 실행 엔진은 Workflow의 그룹 것만 꺼내 씀 |
| `name`, `type` | string | 이름(50자), 종류 `githubToken` / `gasSecret` / `httpHeader` |
| `headerName` | string | `httpHeader`일 때 헤더 이름 |
| `box` | object | 비밀값 암호문 `{ v, iv, tag, data }` (AES-256-GCM, 키는 환경변수 `CREDENTIALS_KEY`) |
| `hint` | string | 비밀값 끝 4글자(8글자 이하면 `…`) |
| `createdBy`, `createdAt` | string, Date | |

인덱스: `{ groupId: 1 }`. 목록 조회는 `box`를 읽지 않습니다.

### webhook_tokens (9단계)

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `tokenHash` | string | 토큰의 SHA-256 (유일). 요청이 오면 이것으로 찾음 |
| `box` | object | 토큰 암호문. 화면에 주소를 다시 보여 주기 위함 |
| `workflowId`, `groupId`, `nodeId` | ObjectId, ObjectId, string | 어느 Workflow의 어느 Webhook 노드인지 |
| `createdBy`, `createdAt` | string, Date | |

인덱스: `{ tokenHash: 1 }`(유일), `{ workflowId: 1, nodeId: 1 }`. 노드당 하나이며 새로 만들면 이전 것을 지웁니다. Workflow를 지우면 함께 지웁니다.

### workflows·executions 변경 (9단계)

- `workflows.status`: `draft` / `active`(자동 실행 켬). `activatedAt`: 켠 시각(그 이전의 예약 시각은 실행 안 함). `scheduleState.<노드ID>`: 마지막으로 맡은 예약 시각(ms). 같은 시각을 두 번 실행하지 않으려고 먼저 기록합니다(노드 ID의 `.`은 `%2E`로 바꿔 저장).
- `executions.steps[].runner`: 실행기가 지난번에 남긴 값(예: GitHub 실행 번호). 새 인덱스 `{ status: 1, resumeAt: 1 }`(주기 작업이 이어 갈 실행을 찾음), `workflows`에 `{ status: 1 }`.

## 용량 정책 (2026-11-16 확정)

무료 등급(M0)은 512MB입니다. 용량의 대부분은 `execution_logs`가 차지합니다.

어림값 (실제로 잰 값이 아니라 데이터 모양으로 추정한 값)

| 데이터 | 1건 크기 | 예시 | 용량 |
| --- | --- | --- | --- |
| 사용자·그룹·권한 | 1KB 미만 | 100명 | 0.1MB 이하 |
| workflows (노드 20개) | 5~10KB | 100개 | 약 1MB |
| executions | 약 1KB | 1만 회 | 약 10MB |
| execution_logs | 노드당 1~2KB | 1만 회 × 노드 10개 | 약 150MB |

정한 규칙 (10단계에서 구현)

1. 시스템은 데이터를 자동으로 삭제하지 않습니다(2026-11-17 변경). 30일이 지난 실행 기록은 화면에서 알려 주고 사용자가 직접 삭제합니다.
2. 노드 결과(output)는 앞부분 2KB까지만 저장합니다.
3. 6단계에서 DB를 연결한 뒤 실제 크기를 재서 위 어림값을 고칩니다.

## 아직 정하지 않은 것

- 3단계 외 컬렉션의 인덱스
- 노드별 입력·출력 스키마
- 인증정보 키를 바꾸는(회전) 절차 (지금은 바꾸면 모두 다시 등록)
