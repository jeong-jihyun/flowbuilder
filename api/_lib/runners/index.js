// Runner Adapter (설계 2장, 원칙 5): 바깥 시스템을 부르는 노드를 종류별 실행기로 보낸다.
// 실행기 모양: (params, ctx, options) → { status: 'success'|'waiting'|'failed', output?, error?, resumeAt?, state? }
// options: { deadline, state(지난번에 남긴 값), now, getCredential(id, type) }
import { runHttp } from './http.js';
import { runGas } from './gas.js';
import { runGithubActions } from './github.js';

const ADAPTERS = {
  http: runHttp,
  gas: runGas,
  githubActions: runGithubActions,
};

export async function runExternal(kind, params, ctx, options) {
  const adapter = ADAPTERS[kind];
  if (!adapter) return { status: 'failed', error: `실행기가 없는 노드입니다: ${kind}` };
  return adapter(params, ctx, options);
}
