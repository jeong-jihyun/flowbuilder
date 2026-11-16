import { useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 1단계에서는 "편집기가 뜨고, 노드를 끌고 선을 이을 수 있다"까지만 확인한다.
// 노드 목록(Palette)·속성(Properties)·저장·실행은 4~8단계에서 붙인다.
// 중요: 여기는 그림을 그리는 곳일 뿐이고, 실제 실행은 서버의 실행 엔진이 맡는다.
const START_NODES = [
  { id: 'trigger_1', type: 'input', position: { x: 120, y: 40 }, data: { label: 'Manual Trigger' } },
  { id: 'condition_1', position: { x: 120, y: 150 }, data: { label: 'If / Else' } },
  { id: 'action_1', type: 'output', position: { x: 10, y: 270 }, data: { label: 'HTTP Request' } },
  { id: 'action_2', type: 'output', position: { x: 230, y: 270 }, data: { label: 'Google Apps Script' } },
];

const START_EDGES = [
  { id: 'edge_1', source: 'trigger_1', target: 'condition_1' },
  { id: 'edge_2', source: 'condition_1', target: 'action_1', label: 'YES' },
  { id: 'edge_3', source: 'condition_1', target: 'action_2', label: 'NO' },
];

export default function WorkflowEditor() {
  const [nodes, , onNodesChange] = useNodesState(START_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(START_EDGES);
  const onConnect = useCallback((c) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Workflow Editor (미리보기)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          노드를 끌어 옮기고, 점을 끌어 선을 이어 보세요. 아직 저장되지 않습니다.
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Box>
    </Box>
  );
}
