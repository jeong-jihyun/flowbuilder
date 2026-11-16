// HTTP Request 노드 실행. 짧은 요청이라 서버 함수 안에서 바로 보낸다.
// 보안: 서버 내부·사설망 주소로는 보내지 않는다 (남의 서버를 거쳐 내부를 들여다보는 공격 막기).
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { resolveDeep, resolveString } from '../engine/template.js';

// 한 번에 이 시간까지만 기다린다 (Vercel 함수 시간 안에서 끝나야 함)
export const HTTP_MAX_SECONDS = 15;
const BODY_LIMIT = 100_000;

function isPrivateAddress(ip) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:');
}

// 보낼 수 있는 주소인지 확인. 문제가 있으면 이유 글자, 없으면 ''.
export async function checkTarget(rawUrl, resolve = lookup) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return '주소 형식이 맞지 않습니다.';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'http:// 또는 https:// 주소만 쓸 수 있습니다.';
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return '내부 주소로는 보낼 수 없습니다.';
  let addresses;
  try {
    addresses = isIP(host) ? [{ address: host }] : await resolve(host, { all: true });
  } catch {
    return `주소(${host})를 찾을 수 없습니다.`;
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) return '내부·사설망 주소로는 보낼 수 없습니다.';
  return '';
}

export async function runHttp(params, ctx, { deadline, getCredential } = {}) {
  const url = String(resolveString(params.url, ctx) ?? '');
  const problem = await checkTarget(url);
  if (problem) return { status: 'failed', error: problem };

  let headers = {};
  if (params.headers) {
    try {
      headers = resolveDeep(JSON.parse(params.headers), ctx);
    } catch {
      return { status: 'failed', error: '헤더(JSON)를 읽을 수 없습니다.' };
    }
  }
  // 인증 헤더는 Credentials에서 꺼내 붙인다 (Workflow에는 비밀값이 남지 않음)
  if (params.credentialId) {
    const cred = await getCredential(params.credentialId, 'httpHeader');
    if (!cred) return { status: 'failed', error: '인증 헤더(인증정보)를 찾을 수 없습니다. Credentials 메뉴를 확인하세요.' };
    headers[cred.headerName] = cred.secret;
  }
  const body = params.method !== 'GET' && params.body ? resolveString(params.body, ctx) : undefined;

  // 노드 설정 시간, 15초, 이번 실행 단계에 남은 시간 중 가장 짧은 것
  const left = deadline ? Math.max(1000, deadline - Date.now()) : Infinity;
  const timeoutMs = Math.min(Number(params.timeoutSeconds || 30) * 1000, HTTP_MAX_SECONDS * 1000, left);

  let res;
  try {
    res = await fetch(url, {
      method: params.method,
      headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, String(v)])),
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      redirect: 'manual', // 다른 주소로 넘기는 응답은 따라가지 않는다 (내부 주소 우회 막기)
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return { status: 'failed', error: timedOut ? `${Math.round(timeoutMs / 1000)}초 안에 응답이 없습니다.` : `요청을 보내지 못했습니다: ${err?.message || err}` };
  }

  const text = (await res.text()).slice(0, BODY_LIMIT);
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // JSON이 아니면 글자 그대로
  }
  const output = { status: res.status, body: data };
  if (res.status >= 300) return { status: 'failed', error: `응답 코드 ${res.status}`, output };
  return { status: 'success', output };
}
