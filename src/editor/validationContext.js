import { createContext, useContext } from 'react';

// 검증 결과를 노드에 표시하기 위한 값: nodeId → 'error' | 'warning'
// 검증을 하지 않았으면 빈 Map.
export const ValidationContext = createContext(new Map());

export function useNodeIssue(nodeId) {
  return useContext(ValidationContext).get(nodeId);
}

// 검증 결과 → nodeId 별 가장 심각한 수준
export function issuesByNode(result) {
  const map = new Map();
  if (!result) return map;
  for (const w of result.warnings) if (w.nodeId) map.set(w.nodeId, 'warning');
  for (const e of result.errors) if (e.nodeId) map.set(e.nodeId, 'error');
  return map;
}
