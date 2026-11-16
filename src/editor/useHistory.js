import { useCallback, useRef, useState } from 'react';

const LIMIT = 50;

// 실행 취소·다시 실행.
// 바꾸기 "직전에" record() 를 부르면 그때 모습을 기억해 둔다.
// (노드 끌기는 시작할 때, 추가·삭제·연결은 바꾸기 전에 부른다)
export function useHistory(nodes, edges, setNodes, setEdges) {
  const past = useRef([]);
  const future = useRef([]);
  const current = useRef({ nodes, edges });
  current.current = { nodes, edges };
  // 버튼 활성 상태를 다시 그리기 위한 값
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const record = useCallback(() => {
    past.current = [...past.current.slice(-(LIMIT - 1)), current.current];
    future.current = [];
    bump();
  }, []);

  const restore = useCallback(
    (snapshot) => {
      setNodes(snapshot.nodes);
      setEdges(snapshot.edges);
      bump();
    },
    [setNodes, setEdges]
  );

  const undo = useCallback(() => {
    const prev = past.current.at(-1);
    if (!prev) return;
    past.current = past.current.slice(0, -1);
    future.current = [current.current, ...future.current];
    restore(prev);
  }, [restore]);

  const redo = useCallback(() => {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    past.current = [...past.current, current.current];
    restore(next);
  }, [restore]);

  return { record, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
