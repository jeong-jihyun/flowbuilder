# CHANGE MANAGEMENT

프로그램을 수정하는 모든 개발자와 AI는 이 문서에 기록을 남깁니다.
기록이 없는 작업은 완료로 처리하지 않습니다. 최근 기록을 맨 위에 둡니다.

규칙

- 실제로 하지 않은 테스트를 통과했다고 적지 않습니다.
- 긴급 수정도 기록합니다.
- 설계와 구현이 달라지면 설계 문서도 같이 고칩니다.

---

## 2026-11-16 · v0.2.0 · 2단계 인증 구현 (Clerk)

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 2단계(Clerk 로그인). DB 용량 정책(로그 30일 자동 삭제, 결과 2KB 제한)을 설계에 추가 |
| 변경 파일 | 신규: `api/_lib/auth.js`, `api/me.js`, `src/lib/authConfig.js`, `src/lib/api.js`, `src/pages/SignInPage.jsx`, `src/components/ServerAuthCheck.jsx` / 수정: `src/main.jsx`, `src/App.jsx`, `src/layout/AppShell.jsx`, `src/pages/Dashboard.jsx`, `vite.config.js`, `package.json`, `package-lock.json`, `README.md`, `docs/ARCHITECTURE.md`, `docs/API_SPECIFICATION.md`, `docs/DATABASE_DESIGN.md`, `docs/FLOWBUILDER_DESIGN.md`, `docs/AI_HANDOFF_PROMPT.md` |
| 영향 범위 | 전체 화면(로그인해야 보임), 이후 만들 모든 API(토큰 검증 공통 함수 사용) |
| 배포 상태 | 운영 배포 완료 (2026-11-16) · https://flowbuilder-roan.vercel.app · 커밋 92c1fde. Clerk 앱 `FlowBuilder`(개발용, 무료) 생성, 키 2개를 Vercel 환경변수에 등록 |
| 롤백 방법 | Vercel에서 이전 배포(커밋 95255d4)로 되돌리기, 또는 `git revert` |

설계와 달라진 점 (설계 문서에도 반영함)

| 항목 | 설계 | 구현 | 이유 |
| --- | --- | --- | --- |
| Clerk 패키지 | `@clerk/clerk-react` 가정 | `@clerk/react` 6.x + `@clerk/backend` 3.x | 예전 패키지는 지원 종료(설치 시 경고 확인) |
| 키가 없을 때 | 정의 없음 | 로그인 없이 화면을 띄우고 상단에 경고 표시 | 키 없이 Clerk를 켜면 앱이 아예 뜨지 않음 |
| DB 용량 | "한도 확인 필요"(미확정) | 실행 로그 30일 뒤 자동 삭제, 노드 결과는 2KB까지만 저장 (10단계에서 구현) | 무료 512MB 안에서 계속 쓰기 위해 |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm install`, `npm run build` | 통과 |
| 수행함 | 키 없는 상태: PC 폭·모바일 폭 화면 표시, 경고 띠 표시, 편집기 노드 4개, 콘솔 오류 0건 | 통과 |
| 수행함 | `/api/me` 함수 직접 호출: 서버 키 없음 503, 토큰 없음 401, 가짜 토큰 401, POST 405 | 통과 |
| 수행함 | 배포 주소에서 로그인 화면 표시 (이메일 입력칸, Continue with Google 버튼) | 통과 |
| 수행함 | 배포 주소 `/api/me`: 키 등록 전 503 → 등록 후 토큰 없이 401 `UNAUTHENTICATED` | 통과 |
| 수행 안 함 | 실제 가입·로그인·로그아웃, 로그인 후 `/api/me` 200 | 미확인 (사용자 계정으로 직접 해야 함) |
| 수행 안 함 | 실제 휴대폰에서 로그인 화면 표시 | 미확인 |

미완료 항목

- Clerk는 개발용(Development) 상태입니다. 로그인 화면에 "Development mode"가 표시됩니다. 운영용 전환은 자기 도메인이 필요해 보류합니다.
- GitHub에 올려도 Vercel이 자동 배포하지 않습니다. 배포는 따로 실행해야 합니다.
- `CLERK_SECRET_KEY`는 Production 환경에만 등록돼 있습니다.
- `users` 컬렉션 저장은 DB가 연결되는 6단계에서 합니다. 지금은 Clerk가 사용자 정보를 보관합니다.

다음 작업

- 실제 가입·로그인 검증
- 3단계: 그룹 관리 (그룹·권한) — DB가 필요하므로 MongoDB 연결을 함께 진행

---

## 2026-11-16 · v0.1.0 · 1단계 프로젝트 초기 구성

| 항목 | 내용 |
| --- | --- |
| 변경일 | 2026-11-16 |
| 작업자 | Claude (AI), 요청: 정지현 |
| 변경 목적 | 설계 문서 12장 개발 순서의 1단계(React + Vite 초기 구성) |
| 변경 파일 | 신규: `package.json`, `vite.config.js`, `index.html`, `vercel.json`, `.gitignore`, `.env.example`, `api/health.js`, `src/main.jsx`, `src/App.jsx`, `src/theme.js`, `src/menu.js`, `src/layout/AppShell.jsx`, `src/pages/Dashboard.jsx`, `src/pages/WorkflowEditor.jsx`, `src/pages/ComingSoon.jsx`, `README.md`, `docs/*` |
| 영향 범위 | 신규 프로젝트라 기존 기능 영향 없음 |
| 배포 상태 | 운영 배포 완료 (Vercel Hobby) · https://flowbuilder-roan.vercel.app · 커밋 e74ff99 |
| 롤백 방법 | 첫 배포라 되돌릴 이전 버전 없음. 이후에는 Vercel에서 이전 배포로 되돌리기 |
| 비고 | `docs/FLOWBUILDER_DESIGN.md`는 원본에서 외부 참고 이미지 링크 1개만 뺐습니다 (남의 디자인 시안, 링크 만료 가능) |

검증 결과

| 구분 | 항목 | 결과 |
| --- | --- | --- |
| 수행함 | `npm install` | 통과 |
| 수행함 | `npm run build` | 통과 |
| 수행함 | PC 폭(1280px) Dashboard·Editor 화면 표시 | 통과 |
| 수행함 | PC에서 마우스로 노드 끌어 옮기기 | 통과 |
| 수행함 | 모바일 폭(390px) 화면 표시, 메뉴 Drawer 열림 | 통과 |
| 수행함 | `api/health.js` 함수 직접 호출 (GET 200, POST 405) | 통과 |
| 수행 안 함 | 실제 휴대폰에서 노드 끌기·선 잇기(터치) | 미확인 |
| 수행함 | 배포 주소에서 `/api/health` 응답 200 | 통과 |
| 수행함 | 배포 주소에서 `/editor` 직접 열기 시 화면 파일 응답 200 | 통과 |
| 수행 안 함 | 배포 주소를 실제 브라우저로 열어 화면 눈으로 확인 | 미확인 |

미완료 항목

- Dashboard 숫자·목록은 예시 데이터입니다.
- 편집기는 미리보기입니다. Node Palette, Properties, 저장이 없습니다.

다음 작업

- 2단계: Clerk 로그인 (이메일, Google)
