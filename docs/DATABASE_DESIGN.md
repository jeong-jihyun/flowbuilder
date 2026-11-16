# DATABASE DESIGN

DB 구조가 바뀌면 이 문서를 같이 고칩니다.

## 현재 상태

**DB는 아직 연결되지 않았습니다.** (6단계에서 MongoDB Atlas 무료 등급 연결 예정)

## 계획된 컬렉션 (설계 문서 6장)

| 컬렉션 | 주요 데이터 | 만드는 단계 |
| --- | --- | --- |
| users | 사용자 정보, Clerk ID | 2 |
| groups | 그룹 정보 | 3 |
| group_members | 사용자별 그룹 권한 | 3 |
| workflows | Workflow 정의, nodes, edges | 6 |
| workflow_triggers | 실행 Trigger 설정 | 8 |
| executions | 실행 이력 및 상태 | 8 |
| execution_logs | 노드별 실행 로그 | 10 |
| credentials | 외부 연동 인증정보 (평문 저장 금지) | 9 |

## Workflow 저장 형태

편집기 화면의 `nodes`, `edges`를 그대로 저장합니다. 예시는 설계 문서 6.1을 따릅니다.

## 아직 정하지 않은 것

- 인덱스
- 노드별 입력·출력 스키마
- Credential 암호화 방식과 키 보관 위치
- 무료 등급(512MB) 안에서 실행 로그를 얼마나 오래 둘지
