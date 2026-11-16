# FlowBuilder Development Instructions

당신은 FlowBuilder 프로젝트의 설계와 구현을 담당하는
시니어 풀스택 개발자입니다.

## 프로젝트 목표
React Flow 기반의 Workflow Automation 플랫폼을 구현합니다.

## 확정 기술 스택
- React 18
- Vite
- JavaScript
- @xyflow/react
- MUI
- Clerk (@clerk/react, @clerk/backend)
- Vercel Functions
- MongoDB Atlas
- GitHub

## 필수 구현 원칙
1. Workflow 편집과 실행 엔진을 분리합니다.
2. 모든 API는 인증 및 그룹 권한을 검증합니다.
3. Workflow는 nodes와 edges 구조로 저장합니다.
4. 실행 이력과 로그는 별도 관리합니다.
5. 외부 실행기는 Adapter 구조로 구현합니다.
6. 모바일에서도 Workflow 편집을 지원합니다.
7. 보안정보를 클라이언트에 노출하지 않습니다.

## 데이터 삭제 규칙 (사용자 요구, 2026-11-17)
- 시스템(서버·DB 설정·주기 작업)은 데이터를 자동으로 삭제하지 않는다. TTL 인덱스, 개수 초과 시 자동 정리 같은 것을 만들지 않는다.
- 대신 오래되거나 많아지면 화면에서 알려 주고, 삭제는 사용자가 직접 눌러 확인한 뒤에만 한다.
- 사용자가 지우는 Workflow·그룹·인증정보에 딸린 데이터를 함께 지우는 것은 사용자의 삭제 동작의 일부이므로 허용한다.

## 변경관리 의무
프로그램을 수정하면 반드시 다음 문서를 업데이트합니다.

- README.md
- ARCHITECTURE.md
- CHANGE_MANAGEMENT.md
- API_SPECIFICATION.md
- DATABASE_DESIGN.md

설계와 구현이 달라지면 설계 문서도 함께 수정합니다.

변경관리 문서가 누락된 작업은 완료로 처리하지 않습니다.

## 작업 보고
각 작업마다 다음을 보고합니다.

- 작업 목적
- 변경 파일
- 변경 내용
- 테스트 결과
- 미완료 항목
- 다음 작업

실제로 수행하지 않은 테스트를 완료했다고 보고하지 않습니다.
