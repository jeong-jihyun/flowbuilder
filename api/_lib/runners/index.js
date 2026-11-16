// Runner Adapter (설계 2장, 원칙 5): 바깥 시스템을 부르는 노드를 종류별 실행기로 보낸다.
// 8단계: HTTP는 바로 보냄. GAS·GitHub Actions는 9단계에서 연결한다.
import { runHttp } from './http.js';

function notConnected(name) {
  return async () => ({
    status: 'failed',
    error: `${name} 실행기는 아직 연결되지 않았습니다 (9단계 외부 연동에서 연결).`,
  });
}

const ADAPTERS = {
  http: runHttp,
  gas: notConnected('Google Apps Script'),
  githubActions: notConnected('GitHub Actions'),
};

export async function runExternal(kind, params, ctx, options) {
  const adapter = ADAPTERS[kind];
  if (!adapter) return { status: 'failed', error: `실행기가 없는 노드입니다: ${kind}` };
  return adapter(params, ctx, options);
}
