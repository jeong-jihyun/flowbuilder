// 아직 서버에 저장하지 않은 "새 Workflow"를 이 브라우저에 임시로 남긴다.
// 화면을 옮기거나 새로고침해도 그리던 흐름이 사라지지 않게 하려는 용도다.
// 서버에 저장하면(6단계) 지운다.
import { NODE_KINDS } from './nodeCatalog.js';
import { toSavedGraph } from './graph.js';

const KEY = 'flowbuilder.editorDraft.v1';

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
    localStorage.setItem(KEY, JSON.stringify(toSavedGraph(nodes, edges)));
  } catch {
    // 저장 공간이 꽉 찼거나 막힌 브라우저: 임시 저장만 못 할 뿐 편집은 계속된다
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
