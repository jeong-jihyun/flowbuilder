# FlowBuilder 통합 설계 문서

v1.0 · 2026-11-16

### 1. 프로젝트 개요

### 1.1 목적

FlowBuilder는 사용자가 시각적인 노드 편집기를 이용하여 업무 자동화 Workflow를 직접 설계하고 실행할 수 있는 웹 기반 자동화 플랫폼입니다.

Make 및 n8n과 유사한 노드 기반 자동화 방식을 제공하되, 외부 실행기를 연결하여 다양한 업무 자동화를 수행하는 것을 목표로 합니다.

### 1.2 핵심 요구사항

| 구분          | 요구사항                                        |
| ----------- | ------------------------------------------- |
| Workflow 편집 | 노드 생성, 이동, 삭제, 연결                           |
| 실행 흐름       | Trigger, Condition, Action                  |
| 분기 처리       | 조건에 따른 실행 경로 분리                             |
| 속성 관리       | 노드별 입력값 및 실행 설정                             |
| 그룹 관리       | 프로젝트 및 사용자 그룹                               |
| 인증          | 이메일 및 Google 로그인                            |
| 실행 관리       | 실행 상태, 결과, 오류 및 로그                          |
| 외부 연동       | Google Apps Script, GitHub Actions, Webhook |
| 반응형         | PC 및 모바일 편집 지원                              |
| 배포          | Vercel                                      |
| 소스 관리       | GitHub                                      |

### 2. 전체 시스템 아키텍처

```mermaid
flowchart TB
    USER["사용자"]

    subgraph FRONT["Frontend - Vercel"]
        REACT["React 18 + Vite"]
        FLOW["React Flow Editor"]
        MUI["MUI UI"]
        CLERK["Clerk Authentication"]
    end

    subgraph BACK["Backend - Vercel Functions"]
        API["API Gateway"]
        AUTH["Token Verification"]
        RBAC["Group Authorization"]
        WF["Workflow Management"]
        VALID["Workflow Validator"]
        ENGINE["Execution Orchestrator"]
        ADAPTER["Runner Adapter"]
    end

    DB[("MongoDB Atlas")]

    subgraph RUNNER["External Execution"]
        GAS["Google Apps Script"]
        GHA["GitHub Actions"]
        WEBHOOK["HTTP Webhook"]
    end

    USER --> FRONT
    REACT --> FLOW
    REACT --> MUI
    REACT --> CLERK
    FRONT --> API
    API --> AUTH
    AUTH --> RBAC
    RBAC --> WF
    WF --> VALID
    VALID --> ENGINE
    ENGINE --> ADAPTER
    RBAC <--> DB
    WF <--> DB
    ENGINE <--> DB
    ADAPTER --> GAS
    ADAPTER --> GHA
    ADAPTER --> WEBHOOK
    GAS --> API
    GHA --> API
    WEBHOOK --> API
```

### 2.1 구성요소별 역할

| 구성요소                   | 역할                         |
| ---------------------- | -------------------------- |
| React                  | 사용자 화면 구성                  |
| React Flow             | Workflow 시각적 편집            |
| MUI                    | UI 컴포넌트                    |
| Clerk                  | 로그인 및 인증                   |
| Vercel Functions       | 서버 API                     |
| MongoDB Atlas          | 사용자, 그룹, Workflow 및 실행 데이터 |
| Execution Orchestrator | 실행 순서 및 상태 관리              |
| Runner Adapter         | 외부 실행기 연결                  |
| GAS                    | Google 업무 자동화              |
| GitHub Actions         | 코드 및 작업 자동화                |
| Webhook                | 외부 시스템 호출                  |

### 3. 사용자 화면 레이아웃

### 3.1 메인 화면

```text
┌──────────────────────────────────────────────────────────────┐
│ FlowBuilder     Workspace ▼       Search       User Profile  │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ Workspace     │  Dashboard                                   │
│               │                                              │
│ My Groups     │  ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│               │  │ Workflows  │ │ Executions │ │ Failures  │ │
│ Projects      │  │     12     │ │    128     │ │     3     │ │
│               │  └────────────┘ └────────────┘ └───────────┘ │
│ Workflows     │                                              │
│ Executions    │  Recent Workflows                            │
│ Credentials   │                                              │
│ Settings      │  Workflow Name    Status       Updated       │
│               │  Email Automation Active      2026-11-16    │
│               │  Data Collection  Draft        2026-11-15    │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

### 3.2 Workflow Editor


```text
┌──────────────────────────────────────────────────────────────┐
│ FlowBuilder / Project / Workflow Name                        │
├──────────────────────────────────────────────────────────────┤
│ Save     Undo     Redo       Validate       Run       Publish │
├──────────────┬───────────────────────────────┬───────────────┤
│              │                               │               │
│ Node Palette │       Workflow Canvas         │ Properties    │
│              │                               │               │
│ Trigger      │       ┌──────────────┐        │ Node Name     │
│              │       │   Trigger    │        │               │
│ Schedule     │       └──────┬───────┘        │ Parameters    │
│ Webhook      │              │                │               │
│ Manual       │       ┌──────▼───────┐        │ Input         │
│              │       │  Condition   │        │               │
│ Condition    │       └───┬──────┬───┘        │ Output        │
│              │           │      │             │               │
│ If / Else    │        YES       NO            │ Test Node     │
│ Switch       │         │        │             │               │
│              │      Action   Action           │               │
│ Action       │                               │               │
│              │                               │               │
│ HTTP Request │                               │               │
│ GAS          │                               │               │
│ GitHub       │                               │               │
├──────────────┴───────────────────────────────┴───────────────┤
│ Execution History / Logs / Errors / Results                  │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 화면 영역별 기능

| 영역                 | 기능                    |
| ------------------ | --------------------- |
| 상단 Toolbar         | 저장, 실행, 검증, 게시, 실행 취소 |
| 좌측 Node Palette    | 노드 검색 및 추가            |
| 중앙 Canvas          | 노드 배치 및 연결            |
| 우측 Properties      | 선택한 노드의 속성 설정         |
| 하단 Execution Panel | 실행 결과, 로그, 오류 확인      |

모바일에서는 좌측 노드 목록과 우측 속성 패널을 별도 Drawer 또는 하단 패널로 전환합니다. 캔버스의 노드 선택, 이동, 연결 및 확대·축소 기능도 제공해야 합니다.

### 4. Workflow 편집기 설계

### 4.1 노드 유형

| 유형        | 노드                 | 설명                 |
| --------- | ------------------ | ------------------ |
| Trigger   | Manual             | 수동 실행              |
| Trigger   | Schedule           | 예약 실행              |
| Trigger   | Webhook            | 외부 요청으로 실행         |
| Condition | If / Else          | 조건 분기              |
| Condition | Switch             | 다중 조건 분기           |
| Action    | HTTP Request       | REST API 호출        |
| Action    | Google Apps Script | GAS 실행             |
| Action    | GitHub Actions     | GitHub Workflow 실행 |
| Action    | Data Transform     | 데이터 변환             |
| Action    | Delay              | 지정 시간 대기           |

### 4.2 사용자 제어 범위

사용자는 React Flow를 통해 다음 작업을 직접 수행할 수 있어야 합니다.

* 노드 추가 및 삭제

* 노드 위치 이동

* 노드 간 연결 및 연결 해제

* 연결선 재설정

* 노드 속성 변경

* 조건 및 분기 설정

* 캔버스 확대·축소

* 실행 흐름 검증

* Workflow 저장 및 불러오기

설계 원칙: React Flow는 편집기 역할을 담당하며 실제 실행 엔진은 별도로 구현합니다. 사용자가 노드를 배치했다고 해서 자동으로 실행되는 구조가 되어서는 안 됩니다.

### 5. 주요 기능 및 메뉴 구조

```text
FlowBuilder
│
├── Dashboard
│
├── Workspace
│   ├── Group Management
│   ├── Member Management
│   └── Permission Management
│
├── Workflow
│   ├── Workflow List
│   ├── Workflow Editor
│   ├── Workflow Version
│   └── Workflow Publish
│
├── Execution
│   ├── Execution History
│   ├── Execution Detail
│   ├── Execution Logs
│   └── Error / Retry
│
├── Integration
│   ├── Google Apps Script
│   ├── GitHub Actions
│   └── Webhook
│
├── Credentials
│   ├── Credential List
│   └── Credential Management
│
└── Settings
    ├── User Settings
    ├── Workspace Settings
    └── System Settings
```

### 6. 데이터베이스 설계

MongoDB Atlas를 사용하며 다음 컬렉션으로 구성합니다.

| 컬렉션               | 주요 데이터                    |
| ----------------- | ------------------------- |
| users             | 사용자 정보, Clerk ID          |
| groups            | 그룹 정보                     |
| group_members     | 사용자별 그룹 권한                |
| workflows         | Workflow 정의, nodes, edges |
| workflow_triggers | 실행 Trigger 설정             |
| executions        | 실행 이력 및 상태                |
| execution_logs    | 노드별 실행 로그                 |
| credentials       | 외부 연동 인증정보                |

### 6.1 Workflow 데이터 예시

```json
{
  "_id": "workflow_id",
  "groupId": "group_id",
  "name": "Email Automation",
  "description": "이메일 자동화 Workflow",
  "version": 1,
  "status": "draft",
  "nodes": [
    {
      "id": "trigger_1",
      "type": "trigger",
      "position": {
        "x": 100,
        "y": 100
      },
      "data": {
        "label": "Manual Trigger"
      }
    },
    {
      "id": "action_1",
      "type": "action",
      "position": {
        "x": 400,
        "y": 100
      },
      "data": {
        "label": "HTTP Request"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "trigger_1",
      "target": "action_1"
    }
  ]
}
```

실제 운영 환경에서는 노드의 실행 설정, 입력·출력 스키마, 연결 Handle, 생성 및 수정 이력 등을 추가합니다.

### 7. Workflow 실행 구조

### 7.1 실행 프로세스

```mermaid
flowchart TD
    A["Workflow 실행 요청"]
    B["사용자 인증"]
    C["그룹 권한 확인"]
    D["Workflow 데이터 조회"]
    E["Workflow 유효성 검사"]
    F["Execution 생성"]
    G["실행 가능한 노드 분석"]
    H["Runner Adapter"]
    I["외부 실행기 호출"]
    J["Callback 수신"]
    K["실행 결과 및 로그 저장"]
    L["완료 또는 실패"]

    A --> B --> C --> D --> E
    E -->|통과| F
    E -->|실패| L
    F --> G --> H --> I --> J --> K --> L
```

### 7.2 실행 상태

| 상태        | 설명    |
| --------- | ----- |
| pending   | 실행 대기 |
| running   | 실행 중  |
| success   | 성공    |
| failed    | 실패    |
| cancelled | 취소    |
| retrying  | 재시도 중 |

실행 엔진은 조건 분기, 노드별 데이터 전달, 실행 순서, 오류 처리, 재시도 및 실행 로그를 관리해야 합니다.

### 8. 인증 및 권한 설계

### 8.1 인증

* 인증 서비스: Clerk

* 이메일 로그인

* Google 로그인

* 서버 API에서 Clerk 토큰 검증

### 8.2 권한

| 역할     | 조회  | 편집  | 실행  | 멤버 관리 |
| ------ | --- | --- | --- | ----- |
| Owner  | O   | O   | O   | O     |
| Admin  | O   | O   | O   | O     |
| Editor | O   | O   | O   | X     |
| Viewer | O   | X   | X   | X     |

그룹 권한은 서버에서 검증해야 하며 프론트엔드 화면 제어만으로 보안을 구현해서는 안 됩니다.

### 9. 기술 스택

| 구분              | 기술                             |
| --------------- | ------------------------------ |
| Frontend        | React 18                       |
| Build           | Vite                           |
| Language        | JavaScript                     |
| Workflow Editor | @xyflow/react                  |
| UI Framework    | MUI                            |
| Authentication  | Clerk                          |
| Backend         | Vercel Functions               |
| Database        | MongoDB Atlas Free             |
| Hosting         | Vercel                         |
| Source Control  | GitHub                         |
| External Runner | GAS / GitHub Actions / Webhook |

### 10. 보안 및 운영 원칙

* 브라우저에서 MongoDB에 직접 접속하지 않습니다.

* Clerk Secret Key와 MongoDB URI는 서버 환경변수로 관리합니다.

* 외부 서비스 인증정보는 평문으로 저장하지 않습니다.

* 모든 API에서 사용자 인증과 그룹 권한을 검증합니다.

* 외부 실행 요청은 서명 또는 비밀 토큰으로 검증합니다.

* Callback 요청의 중복 수신을 고려하여 멱등성을 보장합니다.

* 장시간 실행 작업은 Vercel Function에서 직접 수행하지 않고 외부 실행기로 위임합니다.

* 실행 이력과 노드별 로그를 별도 관리합니다.

### 11. 변경관리 및 인수인계 지침

필수 준수 사항

프로그램을 수정하는 모든 개발자와 AI는 변경관리 문서를 반드시 업데이트해야 합니다.

### 11.1 변경관리 대상

* 소스 코드

* DB 스키마

* API 명세

* Workflow 노드 구조

* 인증 및 권한

* 외부 서비스 연동

* 환경변수 및 배포 설정

* 시스템 아키텍처

### 11.2 변경 기록 항목

| 항목    | 기록 내용       |
| ----- | ----------- |
| 변경일   | 실제 변경 일자    |
| 작업자   | 개발자 또는 AI   |
| 변경 목적 | 수정 이유       |
| 변경 파일 | 수정된 파일 목록   |
| 영향 범위 | 연관 기능 및 시스템 |
| 검증 결과 | 실제 수행한 테스트  |
| 배포 상태 | 배포 여부       |
| 롤백 방법 | 원복 절차       |

### 11.3 반드시 지켜야 할 규칙

* 설계와 구현이 달라지면 설계 문서를 업데이트합니다.

* API 또는 DB가 변경되면 해당 명세도 수정합니다.

* README에 주요 변경 사항을 반영합니다.

* 테스트하지 않은 항목을 통과했다고 기록하지 않습니다.

* 긴급 수정도 변경 기록을 남깁니다.

* 변경관리 문서가 업데이트되지 않은 작업은 완료 처리하지 않습니다.

### 12. 개발 진행 순서

| 순서  | 개발 단계        | 주요 결과물                 |
| --- | ------------ | ---------------------- |
| 1   | 프로젝트 초기 구성   | React + Vite           |
| 2   | 인증 구현        | Clerk 로그인              |
| 3   | 그룹 관리        | 그룹 및 권한                |
| 4   | Workflow 편집기 | React Flow             |
| 5   | 노드 속성 관리     | Properties Panel       |
| 6   | Workflow 저장  | MongoDB 연동             |
| 7   | Workflow 검증  | Validator              |
| 8   | 실행 엔진        | Execution Orchestrator |
| 9   | 외부 연동        | GAS / GitHub / Webhook |
| 10  | 실행 이력        | Logs / History         |
| 11  | 모바일 최적화      | Responsive Editor      |
| 12  | 배포 및 검증      | Vercel                 |

### 13. 후임 개발자 및 AI 전달 지침

아래 내용을 프로젝트의 `AI_HANDOFF_PROMPT.md`로 사용하면 됩니다.

```markdown
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
- Clerk
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
```

### 14. 현재 문서의 범위 및 미확정 사항

이 문서는 현재까지 합의한 요구사항을 기반으로 작성한 통합 설계 레이아웃입니다. 실제 소스 코드, API 세부 명세, DB 인덱스, 노드별 입출력 스키마 및 실행 엔진 상세 구현은 아직 포함하지 않았습니다.

다음 항목은 구현 전에 추가 확정이 필요합니다.

* Workflow 버전 및 게시 정책

* 예약 Trigger 실행을 담당할 스케줄러

* 실행 결과 Callback 인증 방식

* 실패한 노드의 재시도 및 복구 정책

* Credential 암호화 및 키 관리 방식

* MongoDB Free 플랜의 용량 및 운영 한도
