// 서버 API를 부르는 공통 함수. 로그인 토큰을 자동으로 붙인다.
// getToken 은 Clerk의 useAuth() 에서 받은 함수를 넘긴다.
export async function apiFetch(path, { getToken, ...options } = {}) {
  const headers = { ...(options.headers || {}) };
  if (getToken) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // JSON이 아닌 응답(예: 내 PC의 vite dev 에서는 /api 가 없음)
  }
  return { status: res.status, ok: res.ok && body?.ok === true, body };
}
