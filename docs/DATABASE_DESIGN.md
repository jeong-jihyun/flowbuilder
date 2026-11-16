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
| workflows | Workflow 정의, nodes, edges | 6 |
| workflow_triggers | 실행 Trigger 설정 | 8 |
| executions | 실행 이력 및 상태 | 8 |
| execution_logs | 노드별 실행 로그 | 10 |
| credentials | 외부 연동 인증정보 (평문 저장 금지) | 9 |

## Workflow 저장 형태

편집기 화면의 `nodes`, `edges`를 그대로 저장합니다. 예시는 설계 문서 6.1을 따릅니다.

노드는 `{ id, type, position, data: { kind, label } }`, 연결선은 `{ id, source, target, sourceHandle, targetHandle, label? }`만 저장합니다. 화면 전용 값(선택 여부, 크기 등)은 저장하지 않습니다. 자세한 값은 설계 문서 4.1(v1.3).

4단계에서는 DB 대신 브라우저(localStorage `flowbuilder.editorDraft.v1`)에 같은 모양으로 임시 저장합니다. 6단계에서 `workflows` 컬렉션으로 옮깁니다.

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

1. `execution_logs`는 30일이 지나면 자동 삭제합니다 (MongoDB TTL 인덱스).
2. 노드 결과(output)는 앞부분 2KB까지만 저장합니다.
3. 6단계에서 DB를 연결한 뒤 실제 크기를 재서 위 어림값을 고칩니다.

## 아직 정하지 않은 것

- 3단계 외 컬렉션의 인덱스
- 노드별 입력·출력 스키마
- Credential 암호화 방식과 키 보관 위치
