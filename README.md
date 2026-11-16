# FlowBuilder

노드를 화면에 놓고 선으로 이어서 업무 자동화 흐름(Workflow)을 만드는 웹 앱입니다.

- 화면에서는 흐름을 **그리기만** 합니다.
- 실제 **실행**은 서버의 실행 엔진이 맡고, 일은 외부 실행기(Google Apps Script, GitHub Actions, Webhook)가 합니다.

## 현재 상태

접속 주소: https://flowbuilder-roan.vercel.app

**2단계(인증) 완료** — 전체 12단계 중 2단계. 로그인해야 화면이 보입니다(이메일, Google).

| 되는 것 | 아직 안 되는 것 |
| --- | --- |
| 화면 틀(상단바, 메뉴, PC/모바일 전환) | 그룹·권한 (3단계) |
| Dashboard 화면 (예시 데이터) | |
| 편집기 미리보기 (노드 이동, 선 연결) | 저장·검증·실행 (6~8단계) |
| `GET /api/health` | 외부 연동 (9단계) |
| 로그인 화면, 서버 토큰 검증 `GET /api/me` | |

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

내 PC에서는 `.env.example`을 `.env.local`로 복사해 채웁니다. 배포는 Vercel 프로젝트의 Environment Variables에 등록합니다.
키가 없으면 로그인 없이 화면만 뜨고 상단에 경고가 보입니다.

`/api` 주소까지 내 PC에서 확인하려면 Vercel CLI가 필요합니다: `npx vercel dev`

## 폴더 구조

```text
flowbuilder/
├── api/                 서버 API (Vercel Functions)
│   ├── _lib/auth.js            토큰 검증 공통 함수
│   ├── health.js
│   └── me.js
├── src/
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

- 2026-11-16 · v0.2.0 · 2단계 인증(Clerk) 코드, DB 용량 정책 추가
- 2026-11-16 · v0.1.0 · 1단계 프로젝트 초기 구성
