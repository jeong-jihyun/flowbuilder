// 저장용 모양(설계 6.1)으로 바꾸기. 화면 전용 값(선택 여부, 크기 등)은 뺀다.
// 서버 저장과 브라우저 임시 저장이 같은 모양을 쓰고, "바뀌었는지" 비교에도 쓴다.
export function toSavedNode(n) {
  return { id: n.id, type: n.type, position: n.position, data: n.data };
}

export function toSavedEdge(e) {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    ...(e.label && { label: e.label }),
  };
}

export function toSavedGraph(nodes, edges) {
  return { nodes: nodes.map(toSavedNode), edges: edges.map(toSavedEdge) };
}

// 두 흐름이 같은지 비교할 때 쓰는 문자열 (위치는 서버처럼 정수로 맞춘다)
export function graphKey(nodes, edges) {
  const g = toSavedGraph(nodes, edges);
  g.nodes = g.nodes.map((n) => ({ ...n, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) } }));
  return JSON.stringify(g);
}
