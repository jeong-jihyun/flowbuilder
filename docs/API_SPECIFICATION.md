# API SPECIFICATION

API가 추가·변경되면 이 문서를 같이 고칩니다.

## 공통 규칙

- 기본 주소: `/api`
- 응답은 JSON, 항상 `ok` (true/false)를 포함합니다.
- 실패 시: `{ "ok": false, "error": "오류_코드" }`
- `/api/health`를 뺀 모든 API는 로그인 토큰이 필요합니다: `Authorization: Bearer <Clerk 토큰>`
- 3단계부터 그룹 권한도 서버에서 확인합니다.

공통 오류

| 상태 | error | 뜻 |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | 토큰이 없음 |
| 401 | `INVALID_TOKEN` | 토큰이 위조됐거나 만료됨 |
| 405 | `METHOD_NOT_ALLOWED` | 허용되지 않은 호출 방식 |
| 503 | `AUTH_NOT_CONFIGURED` | 서버에 `CLERK_SECRET_KEY`가 없음 |

## 구현된 API

### GET /api/health

서버가 살아 있는지 확인합니다. 로그인 없이 호출할 수 있습니다.

응답 200

```json
{ "ok": true, "service": "flowbuilder", "time": "2026-11-16T09:00:00.000Z" }
```

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

## 예정 API (아직 없음, 구현할 때 확정)

| 단계 | 주소 | 용도 |
| --- | --- | --- |
| 3 | `/api/groups`, `/api/groups/:id/members` | 그룹·멤버·권한 |
| 6 | `/api/workflows`, `/api/workflows/:id` | Workflow 저장·조회 |
| 7 | `/api/workflows/:id/validate` | 검증 |
| 8 | `/api/workflows/:id/run`, `/api/executions/:id` | 실행·상태 |
| 9 | `/api/callbacks/runner` | 외부 실행기 결과 수신 |
