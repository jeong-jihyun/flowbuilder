// 노드 하나를 실행하는 함수들 (8단계).
// 실행 결과 모양:
//   { status: 'success', output, branch? }   branch: 다음으로 갈 출구 id (조건 노드)
//   { status: 'waiting', resumeAt }           Delay처럼 나중에 이어서 할 때
//   { status: 'failed', error }
// 바깥 시스템을 부르는 노드(HTTP·GAS·GitHub)는 runners/ 의 Runner Adapter가 맡는다.
import { paramsOf } from '../../../shared/nodeFields.js';
import { resolveDeep, resolveString } from './template.js';
import { runExternal } from '../runners/index.js';

const DELAY_SECONDS = { seconds: 1, minutes: 60, hours: 3600 };

function isEmpty(v) {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

// If/Else 조건 계산
export function compare(left, operator, right) {
  switch (operator) {
    case 'equals':
      return String(left ?? '') === String(right ?? '');
    case 'notEquals':
      return String(left ?? '') !== String(right ?? '');
    case 'contains':
      return Array.isArray(left) ? left.map(String).includes(String(right)) : String(left ?? '').includes(String(right ?? ''));
    case 'greaterThan':
      return Number(left) > Number(right);
    case 'lessThan':
      return Number(left) < Number(right);
    case 'isEmpty':
      return isEmpty(left);
    case 'isNotEmpty':
      return !isEmpty(left);
    default:
      throw new Error(`모르는 조건: ${operator}`);
  }
}

// state: 이 노드의 지난 기록(Delay가 다시 불렸을 때 쓰임). now: 현재 시각(ms)
export async function executeNode(node, input, { state = {}, now = Date.now(), deadline } = {}) {
  const params = paramsOf(node);
  const ctx = { input };

  switch (node.data.kind) {
    // Trigger: 실행할 때 받은 입력을 그대로 다음으로 넘긴다
    case 'manual':
    case 'schedule':
    case 'webhook':
      return { status: 'success', output: input };

    case 'ifElse': {
      const ok = compare(resolveString(params.left, ctx), params.operator, resolveString(params.right, ctx));
      return { status: 'success', output: input, branch: ok ? 'yes' : 'no' };
    }

    case 'switch': {
      const value = String(resolveString(params.value, ctx) ?? '');
      const hit = params.cases.find((c) => String(resolveString(c.match, ctx) ?? '') === value);
      return { status: 'success', output: input, branch: hit ? hit.id : 'default' };
    }

    case 'transform': {
      let mapping;
      try {
        mapping = JSON.parse(params.mapping);
      } catch {
        return { status: 'failed', error: '결과 모양(JSON)을 읽을 수 없습니다.' };
      }
      return { status: 'success', output: resolveDeep(mapping, ctx) };
    }

    case 'delay': {
      // 처음 오면 언제까지 기다릴지 정하고, 그 시각이 지나서 다시 불리면 통과
      if (state.resumeAt) {
        return state.resumeAt <= now ? { status: 'success', output: input } : { status: 'waiting', resumeAt: state.resumeAt };
      }
      const seconds = Number(params.amount) * (DELAY_SECONDS[params.unit] || 60);
      return { status: 'waiting', resumeAt: now + seconds * 1000 };
    }

    case 'http':
    case 'gas':
    case 'githubActions':
      return runExternal(node.data.kind, params, ctx, { deadline });

    default:
      return { status: 'failed', error: `실행할 수 없는 노드 종류입니다: ${node.data.kind}` };
  }
}
