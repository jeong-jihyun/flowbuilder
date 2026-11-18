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
import './editor.css';
import WorkflowNode from './WorkflowNode.jsx';
import NodePalette, { DRAG_TYPE } from './NodePalette.jsx';
import EditorToolbar from './EditorToolbar.jsx';
import PropertiesPanel from './PropertiesPanel.jsx';
import ValidationPanel from './ValidationPanel.jsx';
import { ValidationContext, issuesByNode } from './validationContext.js';
import { RunStatusContext } from './runContext.js';
import { validateWorkflow } from '../../shared/validator.js';
import { useHistory } from './useHistory.js';
import { CATEGORIES, createNode, localizeNode, outputLabel, outputsOf } from './nodeCatalog.js';
import { graphKey, toSavedGraph } from './graph.js';

// 워크플로우 편집기 본체. "새 워크플로우"(/editor)와 "저장된 워크플로우"(/workflows/:id)가 같이 쓴다.
// 중요: 여기는 흐름을 "그리는" 곳이다. 노드를 놓아도 아무것도 실행되지 않는다.
// 실행은 서버의 실행 엔진(8단계)이 맡는다.
//
// props
//   initial        처음 그릴 { nodes, edges } (처음 한 번만 읽는다)
//   header         위쪽 제목 영역
//   readOnly       보기 전용 (조회자)
//   onChange       바뀔 때마다 (nodes, edges) — 임시 저장용
//   onSave         저장 버튼·Ctrl+S. 저장용 { nodes, edges } 를 받아 성공하면 true 를 돌려준다
//   alwaysSavable  바뀐 것이 없어도 저장 버튼을 켠다 (새 워크플로우)
//   resetGraph     "예시로 되돌리기" 버튼에 쓸 흐름 (없으면 버튼 숨김)
//   onDirtyChange  저장 안 된 변경이 생기거나 없어질 때
//   onRun          Run 버튼 (8단계). 없거나 runTip 이 있으면 버튼을 끈다
//   runTip         Run을 못 누르는 이유 (예: 보기 전용)
//   runStatus      노드별 실행 상태 Map (실행 결과 창을 볼 때)
//   bottomPanel    아래쪽에 붙일 창 (실행 결과). 검증 결과 창과 함께 열리지 않는다
//   validationRequest  값이 바뀌면 검증 결과 창을 연다 (실행이 검증 오류로 거절됐을 때)
//   onValidationOpen   검증 결과 창이 열릴 때 (바깥에서 실행 결과 창을 닫게)
//   credentials    이 워크플로우 그룹의 인증정보 목록 (노드 설정에서 고르기, 9단계)
//   automation     { workflowId, active } 저장된 워크플로우일 때만 (Webhook 주소 표시, 9단계)
//   workflows      이 워크플로우 그룹의 워크플로우 목록 [{id,name}] (하위 워크플로우 노드에서 고르기)
//   currentWorkflowId  지금 이 워크플로우의 id (하위 워크플로우 목록에서 자기 자신은 뺀다)
//   exportMeta     { name, description } 있으면 "내보내기" 버튼이 켜진다 (JSON 파일로 다운로드)

const PALETTE_WIDTH = 240;
const PROPERTIES_WIDTH = 320;

// 세 분류가 모두 같은 노드 모양을 쓴다. 차이는 data.kind 로 구분한다.
const NODE_TYPES = { trigger: WorkflowNode, condition: WorkflowNode, action: WorkflowNode };
// 연결선은 꺾인 선 + 화살표로 그린다(저장 데이터에는 넣지 않는다)
const EDGE_TYPES = { default: SmoothStepEdge };
const EDGE_OPTIONS = { markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 } };

// 설계 3.2 그림과 같은 예시 흐름
export const EXAMPLE = {
  nodes: [
    { id: 'trigger_1', type: 'trigger', position: { x: 150, y: 0 }, data: { kind: 'manual', label: '수동 실행' } },
    { id: 'condition_1', type: 'condition', position: { x: 150, y: 130 }, data: { kind: 'ifElse', label: '조건 분기', params: { left: '{{input.status}}', operator: 'equals', right: 'done' } } },
    { id: 'action_1', type: 'action', position: { x: 0, y: 290 }, data: { kind: 'http', label: 'HTTP 요청', params: { method: 'GET', url: 'https://api.example.com/items' } } },
    { id: 'action_2', type: 'action', position: { x: 300, y: 290 }, data: { kind: 'gas', label: '구글 앱스 스크립트', params: { url: 'https://script.google.com/macros/s/EXAMPLE/exec', functionName: 'main' } } },
  ],
  edges: [
    { id: 'edge_1', source: 'trigger_1', target: 'condition_1' },
    { id: 'edge_2', source: 'condition_1', sourceHandle: 'yes', target: 'action_1', label: '예' },
    { id: 'edge_3', source: 'condition_1', sourceHandle: 'no', target: 'action_2', label: '아니오' },
  ],
};

const EMPTY_STATUS = new Map();

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

const YES_NO = { YES: '예', NO: '아니오' };

function Editor({
  initial,
  header,
  readOnly = false,
  onChange,
  onSave,
  alwaysSavable = false,
  resetGraph,
  onDirtyChange,
  onRun,
  runTip,
  runStatus,
  bottomPanel,
  validationRequest,
  onValidationOpen,
  credentials,
  automation,
  workflows,
  currentWorkflowId,
  exportMeta,
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  // 속성 패널을 옆에 붙일 만큼 넓은 화면 (아니면 아래에서 올라오는 창)
  const isWide = useMediaQuery(theme.breakpoints.up('lg'));
  // 예전에 저장된 YES/NO 연결선 글자도 한글로 보인다 (다음 저장 때 같이 바뀐다)
  const startEdges = useMemo(() => initial.edges.map((e) => (YES_NO[e.label] ? { ...e, label: YES_NO[e.label] } : e)), [initial.edges]);
  const startNodes = useMemo(() => initial.nodes.map(localizeNode), [initial.nodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(startNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);
  const { screenToFlowPosition, deleteElements, fitView, setCenter, getZoom } = useReactFlow();
  const history = useHistory(nodes, edges, setNodes, setEdges);
  const canvasRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Validate를 누르면 결과 창이 열리고, 열려 있는 동안은 고칠 때마다 다시 검사한다
  const [validationOpen, setValidationOpen] = useState(false);
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

  // 바뀔 때마다 알려 준다 (0.5초 모아서)
  useEffect(() => {
    if (!onChange) return undefined;
    const t = setTimeout(() => onChange(nodes, edges), 500);
    return () => clearTimeout(t);
  }, [nodes, edges, onChange]);

  // 저장 안 된 변경: 마지막으로 저장한(또는 불러온) 모습과 비교한다
  const [baseline, setBaseline] = useState(() => graphKey(startNodes, startEdges));
  const currentKey = useMemo(() => graphKey(nodes, edges), [nodes, edges]);
  const dirty = currentKey !== baseline;
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // 저장하지 않고 창을 닫거나 새로고침하면 브라우저가 한 번 묻게 한다
  useEffect(() => {
    if (!dirty || !onSave || alwaysSavable) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, onSave, alwaysSavable]);

  const validation = useMemo(
    () => (validationOpen ? validateWorkflow(nodes, edges) : null),
    [validationOpen, nodes, edges]
  );
  const nodeIssues = useMemo(() => issuesByNode(validation), [validation]);
  const openValidation = useCallback(() => {
    setValidationOpen(true);
    onValidationOpen?.();
  }, [onValidationOpen]);

  // 바깥에서 검증 결과 창을 열어 달라고 할 때
  useEffect(() => {
    if (validationRequest) setValidationOpen(true);
  }, [validationRequest]);

  // 실행 결과 창이 열리면 검증 결과 창은 닫는다 (아래쪽 자리를 하나만 쓴다)
  const hasBottomPanel = !!bottomPanel;
  useEffect(() => {
    if (hasBottomPanel) setValidationOpen(false);
  }, [hasBottomPanel]);

  // Run: 저장하지 않은 변경이 있으면 먼저 저장해야 한다 (서버는 저장된 버전을 실행)
  const runBlockedReason = runTip || (dirty ? '저장한 뒤 실행할 수 있습니다 (Ctrl+S)' : '');

  // 결과 목록에서 누른 노드를 선택하고 화면 가운데로
  const focusNode = useCallback(
    (nodeId) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === nodeId })));
      setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
      setCenter(target.position.x + 100, target.position.y + 40, { zoom: Math.max(getZoom(), 0.8), duration: 300 });
    },
    [nodes, setNodes, setEdges, setCenter, getZoom]
  );

  const canSave = !!onSave && !readOnly && !saving && (alwaysSavable || dirty);
  const save = useCallback(async () => {
    if (!canSave) return;
    const keyAtSave = currentKey;
    setSaving(true);
    const ok = await onSave(toSavedGraph(nodes, edges));
    setSaving(false);
    if (ok) setBaseline(keyAtSave);
  }, [canSave, currentKey, onSave, nodes, edges]);

  // 내보내기: 지금 캔버스 모습을 { name, description, nodes, edges } JSON 파일로 내려받는다.
  // 저장 안 한 변경도 그대로 내려받는다(실제로 실행되는 저장본과 다를 수 있음에 주의).
  const doExport = useCallback(() => {
    if (!exportMeta) return;
    const graph = toSavedGraph(nodes, edges);
    const payload = { name: exportMeta.name, description: exportMeta.description || '', ...graph };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(exportMeta.name || '워크플로우').replace(/[\\/:*?"<>|]/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [exportMeta, nodes, edges]);

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
    setNodes(resetGraph.nodes);
    setEdges(resetGraph.edges);
    requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [history, setNodes, setEdges, fitView, resetGraph]);

  // Ctrl+S 저장(입력 중에도), Ctrl+Z 실행 취소, Ctrl+Y / Ctrl+Shift+Z 다시 실행
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        save();
        return;
      }
      if (isTyping(e) || readOnly) return;
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
  }, [undo, redo, save, readOnly]);

  const onDragOver = useCallback((e) => {
    if (readOnly || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, [readOnly]);

  const onDrop = useCallback(
    (e) => {
      const kind = e.dataTransfer.getData(DRAG_TYPE);
      if (readOnly || !kind) return;
      e.preventDefault();
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, { x: p.x - 100, y: p.y - 20 });
    },
    [addNode, screenToFlowPosition, readOnly]
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
      readOnly={readOnly}
      credentials={credentials}
      workflows={workflows}
      currentWorkflowId={currentWorkflowId}
      automation={automation}
      onClose={isWide ? undefined : () => setPropertiesOpen(false)}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        {header}
      </Box>

      <EditorToolbar
        history={historyControls}
        hasSelection={hasSelection}
        readOnly={readOnly}
        onSave={onSave ? save : undefined}
        canSave={canSave}
        onValidate={openValidation}
        issueCount={validation?.errors.length || 0}
        onRun={onRun}
        canRun={!!onRun && !runBlockedReason}
        runTip={runBlockedReason}
        saving={saving}
        dirty={dirty}
        onDelete={deleteSelected}
        onFit={() => fitView({ duration: 300 })}
        onReset={resetGraph ? resetToExample : undefined}
        onAddNode={() => setPaletteOpen(true)}
        onExport={exportMeta ? doExport : undefined}
      />

      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {isDesktop && !readOnly && (
          <Box sx={{ width: PALETTE_WIDTH, flexShrink: 0, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
            {palette}
          </Box>
        )}

        <Box ref={canvasRef} sx={{ flexGrow: 1, minWidth: 0, position: 'relative' }} onDragOver={onDragOver} onDrop={onDrop}>
          <ValidationContext.Provider value={nodeIssues}>
            <RunStatusContext.Provider value={runStatus || EMPTY_STATUS}>
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
                nodesDraggable={!readOnly}
                nodesConnectable={!readOnly}
                edgesReconnectable={!readOnly}
                deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
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
            </RunStatusContext.Provider>
          </ValidationContext.Provider>

          {!isWide && selectedNode && (
            <Button
              variant="contained"
              startIcon={<TuneIcon />}
              onClick={() => setPropertiesOpen(true)}
              sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 5, boxShadow: 3 }}
            >
              {readOnly ? '속성 보기' : '속성 편집'}
            </Button>
          )}
        </Box>

        {isWide && (
          <Box sx={{ width: PROPERTIES_WIDTH, flexShrink: 0, bgcolor: 'background.paper', borderLeft: 1, borderColor: 'divider' }}>
            {properties}
          </Box>
        )}
      </Box>

      {validation && (
        <ValidationPanel result={validation} onClose={() => setValidationOpen(false)} onPick={focusNode} />
      )}
      {!validation && bottomPanel && bottomPanel(focusNode)}

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

      {!isDesktop && !readOnly && (
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
export default function FlowEditor(props) {
  return (
    <ReactFlowProvider>
      <Editor {...props} />
    </ReactFlowProvider>
  );
}
