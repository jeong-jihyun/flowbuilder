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
  LAST_OWNER: '그룹에는 Owner가 한 명 이상 있어야 합니다. 다른 사람을 Owner로 만든 뒤 다시 시도하세요.',
  FORBIDDEN: '이 작업을 할 권한이 없습니다.',
  NAME_REQUIRED: '이름을 입력해 주세요.',
  TEXT_TOO_LONG: '글자 수가 너무 많습니다. (이름 50자, 설명 200자까지)',
  INVALID_EMAIL: '이메일 형식이 올바르지 않습니다.',
  INVALID_ROLE: '역할 값이 올바르지 않습니다.',
};

// apiFetch 결과를 사람이 읽을 문장으로 바꾼다.
export function errorText(result) {
  if (!result.body) return '이 환경에는 서버 API가 없습니다. (내 PC에서는 npx vercel dev 로 실행)';
  return ERROR_TEXT[result.body.error] || `요청을 처리하지 못했습니다. (${result.body.error || result.status})`;
}
