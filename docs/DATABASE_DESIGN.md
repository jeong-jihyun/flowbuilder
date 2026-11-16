# DATABASE DESIGN

DB 구조가 바뀌면 이 문서를 같이 고칩니다.

## 현재 상태

**DB는 아직 연결되지 않았습니다.** (6단계에서 MongoDB Atlas 무료 등급 연결 예정)

## 계획된 컬렉션 (설계 문서 6장)

| 컬렉션 | 주요 데이터 | 만드는 단계 |
| --- | --- | --- |
| users | 사용자 정보, Clerk ID | 6 (2단계에서는 Clerk가 보관) |
| groups | 그룹 정보 | 3 |
| group_members | 사용자별 그룹 권한 | 3 |
| workflows | Workflow 정의, nodes, edges | 6 |
| workflow_triggers | 실행 Trigger 설정 | 8 |
| executions | 실행 이력 및 상태 | 8 |
| execution_logs | 노드별 실행 로그 | 10 |
| credentials | 외부 연동 인증정보 (평문 저장 금지) | 9 |

## Workflow 저장 형태

편집기 화면의 `nodes`, `edges`를 그대로 저장합니다. 예시는 설계 문서 6.1을 따릅니다.

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

- TTL 외의 인덱스
- 노드별 입력·출력 스키마
- Credential 암호화 방식과 키 보관 위치
