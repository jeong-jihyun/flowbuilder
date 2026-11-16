import { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { CATEGORIES, NODE_KINDS, outputsOf } from './nodeCatalog.js';
import { countProblems, summaryOf } from '../../shared/nodeFields.js';
import { useNodeIssue } from './validationContext.js';
import { useNodeRunStatus } from './runContext.js';
import { StepIcon } from './ExecutionPanel.jsx';

// 캔버스에 그려지는 노드 한 개.
// 위쪽 점(들어오는 선)은 Trigger에는 없다. 아래쪽 점(나가는 선)은 노드 종류마다 개수가 다르다.
function WorkflowNode({ id, data, selected }) {
  const def = NODE_KINDS[data.kind];
  const node = { id, data };
  const outputs = def ? outputsOf(node) : [];
  const outputKey = outputs.map((o) => o.id).join('|');
  // 검증(Validate)에서 문제가 나온 노드는 빨강(오류)·주황(경고) 테두리
  const issue = useNodeIssue(id);
  // 실행 결과 창을 보고 있으면 노드마다 실행 상태 아이콘
  const runStatus = useNodeRunStatus(id);

  // Switch 갈래가 늘거나 줄면 React Flow에 연결점이 바뀌었다고 알려야 선이 제자리에 붙는다
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, outputKey, updateNodeInternals]);

  if (!def) {
    return (
      <Box className="fb-node" sx={{ border: 2, borderColor: 'error.main' }}>
        <Typography variant="body2" color="error">
          알 수 없는 노드: {String(data.kind)}
        </Typography>
      </Box>
    );
  }

  const category = CATEGORIES[def.category];
  const Icon = def.icon;
  const summary = summaryOf(node);
  const problems = countProblems(node);

  return (
    <Box
      className="fb-node"
      sx={{
        borderColor: issue === 'error' ? 'error.main' : issue === 'warning' ? 'warning.main' : selected ? category.color : 'divider',
        boxShadow: selected ? `0 0 0 2px ${category.color}40` : 1,
        opacity: runStatus === 'skipped' ? 0.55 : 1,
        borderWidth: 2,
        borderStyle: issue ? 'dashed' : 'solid',
        minWidth: outputs.length > 3 ? outputs.length * 52 : undefined,
      }}
    >
      {def.category !== 'trigger' && <Handle type="target" position={Position.Top} />}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: category.color,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="caption" sx={{ color: category.color, fontWeight: 700, lineHeight: 1.2 }}>
            {category.label}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {data.label}
          </Typography>
        </Box>
        {problems > 0 && (
          <WarningAmberIcon fontSize="small" color="warning" titleAccess={`설정 필요 ${problems}곳`} />
        )}
        {runStatus && <StepIcon status={runStatus} />}
      </Box>

      {(summary || problems > 0) && (
        <Typography
          variant="caption"
          noWrap
          component="div"
          color={problems > 0 ? 'warning.dark' : 'text.secondary'}
          sx={{ mt: 0.5 }}
        >
          {problems > 0 ? `설정 필요 ${problems}곳` : summary}
        </Typography>
      )}

      {outputs.length > 1 && (
        <Box sx={{ display: 'flex', mt: 1 }}>
          {outputs.map((o) => (
            <Typography
              key={o.id}
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ flex: 1, textAlign: 'center', fontWeight: 700, px: 0.25 }}
            >
              {o.label}
            </Typography>
          ))}
        </Box>
      )}

      {outputs.map((o, i) => (
        <Handle
          key={o.id ?? 'out'}
          type="source"
          position={Position.Bottom}
          id={o.id ?? undefined}
          // 출구가 여러 개면 아래쪽에 고르게 나눠 놓는다
          style={outputs.length > 1 ? { left: `${((i + 0.5) / outputs.length) * 100}%` } : undefined}
        />
      ))}
    </Box>
  );
}

export default memo(WorkflowNode);
