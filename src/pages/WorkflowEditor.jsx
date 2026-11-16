import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Drawer, Typography, useMediaQuery } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
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
import PropertiesPanel from '../editor/PropertiesPanel.jsx';
import { useHistory } from '../editor/useHistory.js';
import { loadDraft, saveDraft } from '../editor/draftStorage.js';
import { CATEGORIES, createNode, outputLabel, outputsOf } from '../editor/nodeCatalog.js';

// Workflow 편집기 (4단계).
// 중요: 여기는 흐름을 "그리는" 곳이다. 노드를 놓아도 아무것도 실행되지 않는다.
// 실행은 서버의 실행 엔진(8단계)이 맡는다.

const PALETTE_WIDTH = 240;
const PROPERTIES_WIDTH = 320;

// 세 분류가 모두 같은 노드 모양을 쓴다. 차이는 data.kind 로 구분한다.
const NODE_TYPES = { trigger: WorkflowNode, condition: WorkflowNode, action: WorkflowNode };
// 연결선은 꺾인 선 + 화살표로 그린다(저장 데이터에는 넣지 않는다)
const EDGE_TYPES = { default: SmoothStepEdge };
const EDGE_OPTIONS = { markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 } };

// 설계 3.2 그림과 같은 예시 흐름
const EXAMPLE = {
  nodes: [
    { id: 'trigger_1', type: 'trigger', position: { x: 150, y: 0 }, data: { kind: 'manual', label: 'Manual' } },
    { id: 'condition_1', type: 'condition', position: { x: 150, y: 130 }, data: { kind: 'ifElse', label: 'If / Else', params: { left: '{{input.status}}', operator: 'equals', right: 'done' } } },
    { id: 'action_1', type: 'action', position: { x: 0, y: 290 }, data: { kind: 'http', label: 'HTTP Request', params: { method: 'GET', url: 'https://api.example.com/items' } } },
    { id: 'action_2', type: 'action', position: { x: 300, y: 290 }, data: { kind: 'gas', label: 'Google Apps Script', params: { url: 'https://script.google.com/macros/s/EXAMPLE/exec', functionName: 'main' } } },
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
  // 속성 패널을 옆에 붙일 만큼 넓은 화면 (아니면 아래에서 올라오는 창)
  const isWide = useMediaQuery(theme.breakpoints.up('lg'));
  const initial = useMemo(() => loadDraft() || EXAMPLE, []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const { screenToFlowPosition, deleteElements, fitView, setCenter, getZoom } = useReactFlow();
  const history = useHistory(nodes, edges, setNodes, setEdges);
  const canvasRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  // 같은 입력칸에 글자를 이어 치는 동안은 실행 취소 기록을 한 번만 남긴다
  const editSession = useRef(null);
  const endEdit = useCallback(() => {
    editSession.current = null;
  }, []);
  const undo = useCallback(() => {
    endEdit();
    history.undo();
  }, [endEdit, history]);
  const redo = useCallback(() => {
    endEdit();
    history.redo();
  }, [endEdit, history]);
  const historyControls = { ...history, undo, redo };

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
        const label = outputLabel(nodes.find((n) => n.id === connection.source), connection.sourceHandle);
        return addEdge({ ...connection, ...(label && { label }) }, es);
      });
    },
    [history, nodes, setEdges]
  );

  // 연결선 끝을 끌어 다른 노드로 옮기기 (설계 4.2: 연결선 재설정)
  const onReconnect = useCallback(
    (oldEdge, connection) => {
      history.record();
      const label = outputLabel(nodes.find((n) => n.id === connection.source), connection.sourceHandle);
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

  // 속성 패널에서 값 바꾸기. field 가 바뀌면 실행 취소 기록을 새로 남긴다.
  const editNode = useCallback(
    (nodeId, field, patch) => {
      const key = `${nodeId}:${field}`;
      if (editSession.current !== key) {
        history.record();
        editSession.current = key;
      }
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const updated = { ...target, data: { ...target.data, ...patch } };
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: updated.data } : n)));

      // Switch 갈래가 바뀌면: 없어진 갈래의 선은 지우고, 남은 선의 글자는 새 이름으로
      if (target.data.kind === 'switch' && patch.params) {
        const outputs = new Map(outputsOf(updated).map((o) => [o.id, o.label]));
        setEdges((es) =>
          es
            .filter((e) => e.source !== nodeId || outputs.has(e.sourceHandle))
            .map((e) => (e.source === nodeId ? { ...e, label: outputs.get(e.sourceHandle) } : e))
        );
      }
    },
    [history, nodes, setNodes, setEdges]
  );

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  // 선택이 풀리면 휴대폰의 속성 창도 닫는다
  useEffect(() => {
    if (!selectedNode) setPropertiesOpen(false);
  }, [selectedNode]);
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
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

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

  const properties = (
    <PropertiesPanel
      node={selectedNode}
      onEdit={(field, patch) => editNode(selectedNode.id, field, patch)}
      onEndEdit={endEdit}
      onDelete={() => deleteElements({ nodes: [selectedNode] })}
      onClose={isWide ? undefined : () => setPropertiesOpen(false)}
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
            이 기기에 임시 저장됩니다. 서버 저장은 6단계에서 추가됩니다. 노드를 누르면 설정을 바꿀 수 있습니다.
          </Typography>
        )}
      </Box>

      <EditorToolbar
        history={historyControls}
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

        <Box ref={canvasRef} sx={{ flexGrow: 1, minWidth: 0, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
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
            {isDesktop && <MiniMap nodeColor={nodeColor} pannable zoomable style={{ width: 140, height: 90 }} />}
          </ReactFlow>

          {!isWide && selectedNode && (
            <Button
              variant="contained"
              startIcon={<TuneIcon />}
              onClick={() => setPropertiesOpen(true)}
              sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 5, boxShadow: 3 }}
            >
              속성 편집
            </Button>
          )}
        </Box>

        {isWide && (
          <Box sx={{ width: PROPERTIES_WIDTH, flexShrink: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
            {properties}
          </Box>
        )}
      </Box>

      {!isWide && (
        <Drawer
          anchor="bottom"
          open={propertiesOpen && !!selectedNode}
          onClose={() => setPropertiesOpen(false)}
          PaperProps={{ sx: { height: '75dvh', borderTopLeftRadius: 12, borderTopRightRadius: 12 } }}
        >
          {properties}
        </Drawer>
      )}

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
