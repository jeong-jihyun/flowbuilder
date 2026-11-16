import { useCallback } from 'react';
import { useAuth } from '@clerk/react';
import { AUTH_ENABLED } from './authConfig.js';

// 서버 API를 부르는 공통 함수. 로그인 토큰을 자동으로 붙인다.
// getToken 은 Clerk의 useAuth() 에서 받은 함수를 넘긴다.
// json 을 주면 JSON 본문으로 보낸다.
export async function apiFetch(path, { getToken, json, ...options } = {}) {
  const headers = { ...(options.headers || {}) };
  if (getToken) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(json);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    return { status: 0, ok: false, body: null };
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    // JSON이 아닌 응답(예: 내 PC의 vite dev 에서는 /api 가 없음)
  }
  return { status: res.status, ok: res.ok && body?.ok === true, body };
}

// 화면에서 쓰는 API 호출 함수. 토큰을 알아서 붙인다.
// AUTH_ENABLED 는 빌드할 때 정해지는 값이라 훅 호출 순서가 바뀌지 않는다.
export function useApi() {
  const getToken = AUTH_ENABLED ? useAuth().getToken : null;
  return useCallback((path, options) => apiFetch(path, { ...options, getToken }), [getToken]);
}

const ERROR_TEXT = {
  UNAUTHENTICATED: '로그인이 필요합니다.',
  INVALID_TOKEN: '로그인이 만료됐습니다. 다시 로그인해 주세요.',
  AUTH_NOT_CONFIGURED: '서버에 Clerk 비밀 키가 아직 등록되지 않았습니다.',
  DB_NOT_CONFIGURED: '서버에 DB 주소(MONGODB_URI)가 아직 등록되지 않았습니다.',
  DB_UNAVAILABLE: 'DB에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  GROUP_NOT_FOUND: '그룹이 없거나 이 그룹의 멤버가 아닙니다.',
  MEMBER_NOT_FOUND: '해당 멤버를 찾을 수 없습니다.',
  USER_NOT_FOUND: '이 이메일로 가입한 사람이 없습니다. 먼저 FlowBuilder에 가입해야 추가할 수 있습니다.',
  ALREADY_MEMBER: '이미 이 그룹의 멤버입니다.',
  LAST_OWNER: '그룹에는 소유자가 한 명 이상 있어야 합니다. 다른 사람을 소유자로 만든 뒤 다시 시도하세요.',
  FORBIDDEN: '이 작업을 할 권한이 없습니다.',
  NAME_REQUIRED: '이름을 입력해 주세요.',
  TEXT_TOO_LONG: '글자 수가 너무 많습니다. (그룹 이름 50자·설명 200자, 워크플로우 이름 80자·설명 300자까지)',
  INVALID_EMAIL: '이메일 형식이 올바르지 않습니다.',
  INVALID_ROLE: '역할 값이 올바르지 않습니다.',
  WORKFLOW_NOT_FOUND: '워크플로우가 없거나, 그 워크플로우가 속한 그룹의 멤버가 아닙니다.',
  VERSION_CONFLICT: '다른 사람이 먼저 저장했습니다. 최신 내용을 불러온 뒤 다시 고쳐 주세요.',
  VERSION_REQUIRED: '저장할 버전 정보가 없습니다. 화면을 새로고침해 주세요.',
  INVALID_WORKFLOW: '워크플로우 모양이 올바르지 않아 저장하지 못했습니다.',
  WORKFLOW_TOO_LARGE: '워크플로우가 너무 큽니다.',
  TOO_MANY_WORKFLOWS: '이 그룹에 워크플로우가 너무 많습니다. 안 쓰는 것을 지운 뒤 다시 시도하세요.',
  NOT_FOUND: '없는 주소입니다.',
  VALIDATION_FAILED: '검증 오류가 있어 실행하지 않았습니다. 아래 검증 결과를 확인하세요.',
  TOO_MANY_RUNNING: '이 워크플로우는 이미 여러 개가 실행 중입니다. 끝나거나 취소한 뒤 다시 실행하세요.',
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  INVALID_TRIGGER: '시작할 노드를 찾을 수 없습니다.',
  EXECUTION_NOT_FOUND: '실행 기록이 없거나, 그 워크플로우가 속한 그룹의 멤버가 아닙니다.',
  ALREADY_FINISHED: '이미 끝난 실행입니다.',
  EXECUTION_ACTIVE: '진행 중인 실행은 지울 수 없습니다. 먼저 취소하세요.',
  INVALID_DAYS: '7일 이상으로 정해 주세요.',
  INVALID_STATUS: '상태 값이 올바르지 않습니다.',
  INVALID_BEFORE: '날짜 값이 올바르지 않습니다.',
  CREDENTIALS_NOT_CONFIGURED: '서버에 CREDENTIALS_KEY가 아직 등록되지 않아 인증정보를 쓸 수 없습니다.',
  CREDENTIAL_NOT_FOUND: '인증정보가 없거나 삭제됐습니다.',
  INVALID_CREDENTIAL_TYPE: '인증정보 종류가 올바르지 않습니다.',
  SECRET_REQUIRED: '비밀값을 입력해 주세요.',
  INVALID_HEADER_NAME: '헤더 이름은 영문·숫자·하이픈(-)만 쓸 수 있습니다.',
  TOO_MANY_CREDENTIALS: '이 그룹에 인증정보가 너무 많습니다(최대 50개). 안 쓰는 것을 지운 뒤 다시 시도하세요.',
  INVALID_ACTIVE: '자동 실행 값이 올바르지 않습니다.',
  NODE_ID_REQUIRED: '노드를 찾을 수 없습니다.',
  WEBHOOK_NODE_NOT_FOUND: '웹훅 노드를 찾을 수 없습니다. 먼저 저장하세요.',
};

// apiFetch 결과를 사람이 읽을 문장으로 바꾼다.
export function errorText(result) {
  if (!result.body) return '이 환경에는 서버 API가 없습니다. (내 PC에서는 npx vercel dev 로 실행)';
  const text = ERROR_TEXT[result.body.error] || `요청을 처리하지 못했습니다. (${result.body.error || result.status})`;
  // 서버가 어디가 틀렸는지 알려 주면 덧붙인다 (예: nodes[3].position)
  return result.body.detail ? `${text} (${result.body.detail})` : text;
}
