# FlowBuilder

노드를 화면에 놓고 선으로 이어서 업무 자동화 흐름(Workflow)을 만드는 웹 앱입니다.

- 화면에서는 흐름을 **그리기만** 합니다.
- 실제 **실행**은 서버의 실행 엔진이 맡고, 일은 외부 실행기(Google Apps Script, GitHub Actions, Webhook)가 합니다.

## 현재 상태

접속 주소: https://flowbuilder-roan.vercel.app

**9단계(외부 연동) 코드 완료, 일부 시험·배포 전** — 전체 12단계 중 9단계. Credentials에 토큰·키를 암호화해 보관하고, GAS·GitHub Actions 노드, Webhook으로 시작, 예약(Schedule) 실행, "자동 실행" 스위치가 있습니다. DB가 필요한 부분과 화면은 아직 시험하지 못했습니다(`docs/CHANGE_MANAGEMENT.md`의 검증 결과 참고).

| 되는 것 | 아직 안 되는 것 |
| --- | --- |
| 화면 틀(상단바, 메뉴, PC/모바일 전환) | 9단계 항목의 DB·화면·실제 연동 시험, 배포 |
| Dashboard: Workflow 수·최근 Workflow·실행 수·실패 수 |  |
| 실행: Run(입력값·Trigger 선택), 진행 상태·노드별 결과·취소, 실행 기록 (`/api/workflows/:id/run`, `/api/executions`) | |
| 외부 연동: Credentials(`/api/credentials`), GAS·GitHub Actions 노드, Webhook 주소(`/api/hooks/<토큰>`), 자동 실행·예약, 5분 주기 작업(`/api/cron`) — 설정은 `.env.example` | |
| Workflow 저장·목록·이름 바꾸기·삭제, 동시 저장 충돌 알림 (`/api/workflows`) | |
| Workflow 편집기: 노드 10종 추가(목록·끌어 놓기), 연결·재연결, 삭제, 실행 취소, 휴대폰 화면 | |
| Workflow 검증: Validate 버튼, 고칠 때마다 다시 검사, 문제 노드 표시 (`POST /api/workflows/:id/validate`) | |
| 노드 속성: 이름, 노드별 설정, 입력값 검사, Switch 갈래 추가·삭제 | |
| `GET /api/health` | |
| 로그인 화면, 서버 토큰 검증 `GET /api/me` | 초대 메일 (지금은 가입한 이메일로만 추가) |
| 그룹 만들기·멤버 추가·역할 변경 (`/api/groups`) | |

## 실행 방법 (Windows PowerShell)

```powershell
npm install
npm run dev      # http://localhost:5173
npm run build    # 배포용 파일을 dist 폴더에 생성
```

## 환경변수

| 이름 | 어디서 쓰나 | 공개 여부 |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | 화면(브라우저) | 공개돼도 됨 |
| `CLERK_SECRET_KEY` | 서버(API) | 비밀. 절대 `VITE_`를 붙이지 않음 |
| `MONGODB_URI` | 서버(API) | 비밀. MongoDB Atlas 접속 주소 |
| `MONGODB_DB` | 서버(API) | 선택. DB 이름 (기본 `flowbuilder`) |

내 PC에서는 `.env.example`을 `.env.local`로 복사해 채웁니다. 배포는 Vercel 프로젝트의 Environment Variables에 등록합니다.
키가 없으면 로그인 없이 화면만 뜨고 상단에 경고가 보입니다.

`/api` 주소까지 내 PC에서 확인하려면 Vercel CLI가 필요합니다: `npx vercel dev`

## 폴더 구조

```text
flowbuilder/
├── shared/              화면과 서버가 같이 쓰는 코드 (노드 종류·설정 규칙, 검증)
├── api/                 서버 API (Vercel Functions)
│   ├── _lib/                   공통 코드 (주소로 노출 안 됨)
│   │   ├── auth.js             토큰 검증
│   │   ├── db.js               MongoDB 연결
│   │   ├── roles.js            역할 권한표
│   │   ├── groups.js           그룹·멤버 처리
│   │   ├── workflows.js        Workflow 저장·검사
│   │   ├── executions.js       실행 엔진 (나눠서 진행·잠금·기록)
│   │   ├── engine/             노드별 실행, {{input}} 바꾸기
│   │   ├── runners/            Runner Adapter (HTTP, 9단계: GAS·GitHub)
│   │   ├── http.js             API 공통 처리 (로그인·DB·오류)
│   │   └── clerkUsers.js       Clerk 사용자 조회
│   ├── groups.js               /api/groups 전체
│   ├── workflows.js            /api/workflows 전체 (실행 시작 포함)
│   ├── executions.js           /api/executions 전체
│   ├── health.js
│   └── me.js
├── src/
│   ├── editor/                 Workflow 편집기 부품 (노드 목록, 노드 모양, 실행 취소)
│   ├── layout/AppShell.jsx     상단바 + 메뉴 틀
│   ├── pages/                  화면들
│   ├── components/             화면 조각
│   ├── lib/                    공통 함수 (API 호출, 인증 설정)
│   ├── menu.js                 메뉴 목록
│   ├── theme.js                색·글꼴
│   ├── App.jsx                 주소(라우팅) 연결
│   └── main.jsx                시작점
├── docs/                설계·변경관리 문서
├── .env.example         환경변수 견본
└── vercel.json          배포 설정
```

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/FLOWBUILDER_DESIGN.md](docs/FLOWBUILDER_DESIGN.md) | 통합 설계 문서 v1.0 (원본) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 현재 구현된 구조 |
| [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | API 명세 |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | DB 설계 |
| [docs/CHANGE_MANAGEMENT.md](docs/CHANGE_MANAGEMENT.md) | 변경 기록 (수정할 때마다 필수) |
| [docs/AI_HANDOFF_PROMPT.md](docs/AI_HANDOFF_PROMPT.md) | 후임 개발자·AI 전달 지침 |

## 주요 변경 사항

- 2026-11-17 · v0.10.1 · 자동 삭제 제거, 사용자가 직접 삭제하도록 변경
- 2026-11-17 · v0.10.0 · 10단계 실행 기록 화면
- 2026-11-17 · v0.9.0 · 9단계 외부 연동 (GAS · GitHub Actions · Webhook · 예약 실행)
- 2026-11-16 · v0.8.0 · 8단계 실행 엔진
- 2026-11-16 · v0.7.0 · 7단계 Workflow 검증 (Validator)
- 2026-11-16 · v0.6.0 · 6단계 Workflow 저장 (MongoDB)
- 2026-11-16 · v0.5.0 · 5단계 노드 속성 관리 (Properties)
- 2026-11-16 · v0.4.0 · 4단계 Workflow 편집기
- 2026-11-16 · v0.3.0 · 3단계 그룹·권한, MongoDB 연결
- 2026-11-16 · v0.2.0 · 2단계 인증(Clerk) 코드, DB 용량 정책 추가
- 2026-11-16 · v0.1.0 · 1단계 프로젝트 초기 구성
