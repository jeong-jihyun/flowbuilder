// GitHub Actions 실행기 (9단계).
// 1) workflow_dispatch 로 실행을 시작하고 실행 번호(run id)를 받는다.
// 2) 끝날 때까지 "기다리는 중"으로 두고, 정해진 간격마다 상태를 확인한다 (실행 엔진이 이어서 부름).
// 토큰은 Credentials의 "GitHub 토큰". Actions 쓰기 권한이 필요하다.
import { resolveDeep, resolveString } from '../engine/template.js';

const API = 'https://api.github.com';
const CHECK_EVERY_MS = 15_000;
export const GITHUB_MAX_WAIT_MS = 6 * 3600 * 1000;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'FlowBuilder',
  };
}

function reason(status) {
  if (status === 401) return '토큰이 맞지 않거나 만료됐습니다.';
  if (status === 403) return '토큰에 Actions 실행 권한이 없습니다.';
  if (status === 404) return '저장소나 Workflow 파일을 찾을 수 없습니다 (토큰 권한도 확인).';
  if (status === 422) return 'Workflow 파일에 workflow_dispatch 가 없거나, 브랜치·입력값이 맞지 않습니다.';
  return `GitHub 응답 코드 ${status}`;
}

// GitHub 입력값은 글자·숫자·참거짓만 받는다. 객체는 JSON 글자로 바꾼다.
function toInputs(raw, ctx) {
  if (!raw) return undefined;
  const value = resolveDeep(JSON.parse(raw), ctx);
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : v])
  );
}

export async function runGithubActions(params, ctx, { state = {}, now = Date.now(), getCredential, fetchImpl = fetch } = {}) {
  const cred = await getCredential(params.credentialId, 'githubToken');
  if (!cred) return { status: 'failed', error: 'GitHub 토큰(인증정보)을 찾을 수 없습니다. Credentials 메뉴를 확인하세요.' };
  const repo = String(resolveString(params.repo, ctx) || '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { status: 'failed', error: '저장소는 owner/repo 모양이어야 합니다.' };

  // 이미 시작했으면 상태 확인
  if (state.runId) {
    if (now - state.dispatchedAt > GITHUB_MAX_WAIT_MS) {
      return { status: 'failed', error: '6시간이 지나도 끝나지 않아 기다리기를 멈췄습니다.', output: { runId: state.runId, htmlUrl: state.htmlUrl } };
    }
    const res = await fetchImpl(`${API}/repos/${repo}/actions/runs/${state.runId}`, {
      headers: headers(cred.secret),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { status: 'failed', error: reason(res.status) };
    const run = await res.json();
    const output = { runId: state.runId, htmlUrl: run.html_url || state.htmlUrl, status: run.status, conclusion: run.conclusion };
    if (run.status !== 'completed') return { status: 'waiting', resumeAt: now + CHECK_EVERY_MS, state };
    if (run.conclusion === 'success') return { status: 'success', output };
    return { status: 'failed', error: `GitHub 실행 결과: ${run.conclusion}`, output };
  }

  // 처음: 실행 시작
  let inputs;
  try {
    inputs = toInputs(params.inputs, ctx);
  } catch {
    return { status: 'failed', error: '입력값(JSON)을 읽을 수 없습니다.' };
  }
  const workflow = encodeURIComponent(String(resolveString(params.workflow, ctx) || ''));
  const res = await fetchImpl(`${API}/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: { ...headers(cred.secret), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: String(resolveString(params.ref, ctx) || 'main'), inputs, return_run_details: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 204) {
    // 실행 번호를 주지 않는 경우: 시작만 확인하고 끝난 것으로 본다
    return { status: 'success', output: { dispatched: true, note: '실행 번호를 받지 못해 결과는 확인하지 않았습니다.' } };
  }
  if (!res.ok) return { status: 'failed', error: reason(res.status) };
  const body = await res.json();
  if (!body.workflow_run_id) return { status: 'success', output: { dispatched: true } };
  return {
    status: 'waiting',
    resumeAt: now + CHECK_EVERY_MS,
    state: { runId: body.workflow_run_id, htmlUrl: body.html_url, dispatchedAt: now },
  };
}
