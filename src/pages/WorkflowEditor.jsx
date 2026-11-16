import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Drawer, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  addEdge,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  SmoothStepEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../editor/editor.css';
import WorkflowNode from '../editor/WorkflowNode.jsx';
import NodePalette, { DRAG_TYPE } from '../editor/NodePalette.jsx';
import EditorToolbar from '../editor/EditorToolbar.jsx';
import { useHistory } from '../editor/useHistory.js';
import { loadDraft, saveDraft } from '../editor/draftStorage.js';
import { CATEGORIES, createNode, outputLabel } from '../editor/nodeCatalog.js';

// Workflow 편집기 (4단계).
// 중요: 여기는 흐름을 "그리는" 곳이다. 노드를 놓아도 아무것도 실행되지 않는다.
// 실행은 서버의 실행 엔진(8단계)이 맡는다.

const PALETTE_WIDTH = 240;

// 세 분류가 모두 같은 노드 모양을 쓴다. 차이는 data.kind 로 구분한다.
const NODE_TYPES = { trigger: WorkflowNode, condition: WorkflowNode, action: WorkflowNode };
// 연결선은 꺾인 선 + 화살표로 그린다(저장 데이터에는 넣지 않는다)
const EDGE_TYPES = { default: SmoothStepEdge };
const EDGE_OPTIONS = { markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 } };

// 설계 3.2 그림과 같은 예시 흐름
const EXAMPLE = {
  nodes: [
    { id: 'trigger_1', type: 'trigger', position: { x: 150, y: 0 }, data: { kind: 'manual', label: 'Manual' } },
    { id: 'condition_1', type: 'condition', position: { x: 150, y: 130 }, data: { kind: 'ifElse', label: 'If / Else' } },
    { id: 'action_1', type: 'action', position: { x: 0, y: 290 }, data: { kind: 'http', label: 'HTTP Request' } },
    { id: 'action_2', type: 'action', position: { x: 300, y: 290 }, data: { kind: 'gas', label: 'Google Apps Script' } },
  ],
  edges: [
    { id: 'edge_1', source: 'trigger_1', target: 'condition_1' },
    { id: 'edge_2', source: 'condition_1', sourceHandle: 'yes', target: 'action_1', label: 'YES' },
    { id: 'edge_3', source: 'condition_1', sourceHandle: 'no', target: 'action_2', label: 'NO' },
  ],
};

function nodeColor(node) {
  return CATEGORIES[node.type]?.color || '#999';
}

// 노드 크기(200 x 약 70, 출구 이름이 있으면 약 100) + 여백
const SLOT_W = 230;
const SLOT_H = 130;

// start 근처에서 다른 노드와 겹치지 않는 자리를 찾는다. 가까운 칸부터 바깥으로 넓혀 간다.
function freeSpot(start, nodes) {
  const taken = (p) =>
    nodes.some((n) => Math.abs(n.position.x - p.x) < SLOT_W - 20 && Math.abs(n.position.y - p.y) < SLOT_H - 20);
  for (let ring = 0; ring <= 4; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const p = { x: start.x + dx * SLOT_W, y: start.y + dy * SLOT_H };
        if (!taken(p)) return p;
      }
    }
  }
  return start;
}

// 글자 입력 중에는 단축키를 가로채지 않는다
function isTyping(e) {
  const el = e.target;
  return el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName);
}

function Editor() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const initial = useMemo(() => loadDraft() || EXAMPLE, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const { screenToFlowPosition, deleteElements, fitView, setCenter, getZoom } = useReactFlow();
  const history = useHistory(nodes, edges, setNodes, setEdges);
  const canvasRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // 바뀔 때마다 이 기기에 임시 저장 (0.5초 모아서)
  useEffect(() => {
    const t = setTimeout(() => saveDraft(nodes, edges), 500);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  const addNode = useCallback(
    (kind, position) => {
      let pos = position;
      if (!pos) {
        // 위치를 안 주면 보이는 화면 가운데에 놓는다 (노드 크기만큼 왼쪽 위로 당김)
        const rect = canvasRef.current.getBoundingClientRect();
        pos = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        pos = { x: pos.x - 100, y: pos.y - 30 };
      }
      history.record();
      const node = { ...createNode(kind, position ? pos : freeSpot(pos, nodes), nodes), selected: true };
      setNodes((ns) => [...ns.map((n) => (n.selected ? { ...n, selected: false } : n)), node]);
      // 빈자리가 화면 밖일 수 있으니 새 노드가 보이게 화면을 옮긴다 (확대 비율은 그대로)
      if (!position) setCenter(node.position.x + 100, node.position.y + 40, { zoom: getZoom(), duration: 300 });
    },
    [history, nodes, screenToFlowPosition, setNodes, setCenter, getZoom]
  );

  const onConnect = useCallback(
    (connection) => {
      history.record();
      setEdges((es) => {
        const source = nodes.find((n) => n.id === connection.source);
        const label = outputLabel(source?.data.kind, connection.sourceHandle);
        return addEdge({ ...connection, ...(label && { label }) }, es);
      });
    },
    [history, nodes, setEdges]
  );

  // 연결선 끝을 끌어 다른 노드로 옮기기 (설계 4.2: 연결선 재설정)
  const onReconnect = useCallback(
    (oldEdge, connection) => {
      history.record();
      const source = nodes.find((n) => n.id === connection.source);
      const label = outputLabel(source?.data.kind, connection.sourceHandle);
      setEdges((es) =>
        reconnectEdge(oldEdge, connection, es, { shouldReplaceId: false }).map((e) =>
          e.id === oldEdge.id ? { ...e, label } : e
        )
      );
    },
    [history, nodes, setEdges]
  );

  // 자기 자신에게 잇는 선은 막는다. 나머지 규칙은 7단계 검증에서 확인한다.
  const isValidConnection = useCallback((c) => c.source !== c.target, []);

  const onBeforeDelete = useCallback(async () => {
    history.record();
    return true;
  }, [history]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const hasSelection = selectedNodes.length + selectedEdges.length > 0;

  const deleteSelected = useCallback(() => {
    deleteElements({ nodes: selectedNodes, edges: selectedEdges });
  }, [deleteElements, selectedNodes, selectedEdges]);

  const resetToExample = useCallback(() => {
    history.record();
    setNodes(EXAMPLE.nodes);
    setEdges(EXAMPLE.edges);
    requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [history, setNodes, setEdges, fitView]);

  // Ctrl+Z 실행 취소, Ctrl+Y / Ctrl+Shift+Z 다시 실행
  useEffect(() => {
    function onKey(e) {
      if (isTyping(e) || !(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        history.redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history]);

  const onDragOver = useCallback((e) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e) => {
      const kind = e.dataTransfer.getData(DRAG_TYPE);
      if (!kind) return;
      e.preventDefault();
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, { x: p.x - 100, y: p.y - 20 });
    },
    [addNode, screenToFlowPosition]
  );

  const palette = (
    <NodePalette
      onPick={(kind) => {
        addNode(kind);
        setPaletteOpen(false);
      }}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
          Workflow Editor · 새 Workflow
        </Typography>
        {isDesktop && (
          <Typography variant="caption" color="text.secondary">
            이 기기에 임시 저장됩니다. 서버 저장은 6단계, 노드 속성 편집은 5단계에서 추가됩니다.
          </Typography>
        )}
      </Box>

      <EditorToolbar
        history={history}
        hasSelection={hasSelection}
        onDelete={deleteSelected}
        onFit={() => fitView({ duration: 300 })}
        onReset={resetToExample}
        onAddNode={() => setPaletteOpen(true)}
      />

      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {isDesktop && (
          <Box sx={{ width: PALETTE_WIDTH, flexShrink: 0, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
            {palette}
          </Box>
        )}

        <Box ref={canvasRef} sx={{ flexGrow: 1, minWidth: 0 }} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            defaultEdgeOptions={EDGE_OPTIONS}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            isValidConnection={isValidConnection}
            onBeforeDelete={onBeforeDelete}
            onNodeDragStart={history.record}
            deleteKeyCode={['Delete', 'Backspace']}
            connectionRadius={30}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
            {isDesktop && <MiniMap nodeColor={nodeColor} pannable zoomable />}
          </ReactFlow>
        </Box>
      </Box>

      {!isDesktop && (
        <Drawer
          anchor="bottom"
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          PaperProps={{ sx: { height: '70dvh', borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 2, pt: 1.5 }}>
            노드 추가
          </Typography>
          {palette}
        </Drawer>
      )}
    </Box>
  );
}

// useReactFlow() 를 쓰려면 바깥을 ReactFlowProvider 로 감싸야 한다
export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
