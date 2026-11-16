import { createContext, useContext } from 'react';

// 실행 결과를 노드에 표시하기 위한 값: nodeId → 'running' | 'waiting' | 'success' | 'failed' | 'skipped' | 'cancelled'
// 실행 결과 창을 보고 있지 않으면 빈 Map.
export const RunStatusContext = createContext(new Map());

export function useNodeRunStatus(nodeId) {
  return useContext(RunStatusContext).get(nodeId);
}

export function runStatusByNode(execution) {
  return new Map((execution?.steps || []).map((s) => [s.nodeId, s.status]));
}
