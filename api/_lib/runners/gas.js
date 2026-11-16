// Google Apps Script 실행기 (9단계).
// 웹 앱 주소로 { function, payload, token } 을 보내고, 응답 JSON을 결과로 쓴다.
// Apps Script 쪽 코드 견본: docs/GAS_TEMPLATE.md
// Apps Script 웹 앱은 POST 응답을 script.googleusercontent.com 으로 넘기므로(302) 그 주소만 따라간다.
import { resolveDeep, resolveString } from '../engine/template.js';
import { HTTP_MAX_SECONDS, checkTarget } from './http.js';

const ALLOWED_REDIRECT = 'script.googleusercontent.com';

export async function runGas(params, ctx, { deadline, getCredential, fetchImpl = fetch, resolve } = {}) {
  const url = String(resolveString(params.url, ctx) || '');
  if (!/^https:\/\/script\.google\.com\//.test(url)) return { status: 'failed', error: '웹 앱 주소는 https://script.google.com/ 으로 시작해야 합니다.' };
  const problem = await checkTarget(url, resolve);
  if (problem) return { status: 'failed', error: problem };

  let payload = {};
  if (params.payload) {
    try {
      payload = resolveDeep(JSON.parse(params.payload), ctx);
    } catch {
      return { status: 'failed', error: '보낼 값(JSON)을 읽을 수 없습니다.' };
    }
  }
  let token;
  if (params.credentialId) {
    const cred = await getCredential(params.credentialId, 'gasSecret');
    if (!cred) return { status: 'failed', error: 'GAS 비밀값(인증정보)을 찾을 수 없습니다. Credentials 메뉴를 확인하세요.' };
    token = cred.secret;
  }

  const left = deadline ? Math.max(1000, deadline - Date.now()) : Infinity;
  const timeoutMs = Math.min(HTTP_MAX_SECONDS * 1000, left);
  const signal = AbortSignal.timeout(timeoutMs);

  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function: params.functionName || 'main', payload, ...(token && { token }) }),
      redirect: 'manual',
      signal,
    });
    if (res.status === 302 || res.status === 303) {
      const next = new URL(res.headers.get('location') || '', url);
      if (next.hostname !== ALLOWED_REDIRECT) return { status: 'failed', error: `예상하지 못한 주소로 넘어갔습니다: ${next.hostname}` };
      res = await fetchImpl(next.href, { method: 'GET', redirect: 'manual', signal });
    }
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return { status: 'failed', error: timedOut ? `${Math.round(timeoutMs / 1000)}초 안에 Apps Script가 응답하지 않았습니다.` : `Apps Script를 부르지 못했습니다: ${err?.message || err}` };
  }

  const text = (await res.text()).slice(0, 100_000);
  if (!res.ok) return { status: 'failed', error: `Apps Script 응답 코드 ${res.status}` };
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return { status: 'failed', error: 'Apps Script가 JSON이 아닌 응답을 보냈습니다 (웹 앱 배포·권한 설정을 확인하세요).' };
  }
  // 견본 코드는 { ok, result } 또는 { ok: false, error } 로 답한다
  if (body && body.ok === false) return { status: 'failed', error: `Apps Script 오류: ${body.error || '알 수 없음'}`, output: body };
  return { status: 'success', output: body && 'result' in body ? body.result : body };
}
