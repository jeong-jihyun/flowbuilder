// 6단계(DB 저장) 전까지 쓰는 임시 저장. 이 브라우저에만 남는다.
// 화면을 옮기거나 새로고침해도 그리던 흐름이 사라지지 않게 하려는 용도다.
import { NODE_KINDS } from './nodeCatalog.js';

const KEY = 'flowbuilder.editorDraft.v1';

// 저장할 때는 설계 6.1 모양(id, type, position, data)만 남긴다.
function pickNode(n) {
  return { id: n.id, type: n.type, position: n.position, data: n.data };
}

function pickEdge(e) {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    ...(e.label && { label: e.label }),
  };
}

export function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(saved?.nodes) || !Array.isArray(saved?.edges)) return null;
    // 모르는 노드 종류가 섞여 있으면(코드가 바뀐 경우) 버리고 예시로 시작한다
    if (!saved.nodes.every((n) => n?.id && n.position && NODE_KINDS[n.data?.kind])) return null;
    return { nodes: saved.nodes, edges: saved.edges };
  } catch {
    return null;
  }
}

export function saveDraft(nodes, edges) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ nodes: nodes.map(pickNode), edges: edges.map(pickEdge) }));
  } catch {
    // 저장 공간이 꽉 찼거나 막힌 브라우저: 임시 저장만 못 할 뿐 편집은 계속된다
  }
}
