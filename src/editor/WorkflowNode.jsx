import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import { CATEGORIES, NODE_KINDS } from './nodeCatalog.js';

// 캔버스에 그려지는 노드 한 개.
// 위쪽 점(들어오는 선)은 Trigger에는 없다. 아래쪽 점(나가는 선)은 노드 종류마다 개수가 다르다.
function WorkflowNode({ data, selected }) {
  const def = NODE_KINDS[data.kind];
  if (!def) {
    return (
      <Box className="fb-node" sx={{ borderColor: 'error.main' }}>
        <Typography variant="body2" color="error">
          알 수 없는 노드: {String(data.kind)}
        </Typography>
      </Box>
    );
  }

  const category = CATEGORIES[def.category];
  const Icon = def.icon;
  const outputs = def.outputs;

  return (
    <Box
      className="fb-node"
      sx={{
        borderColor: selected ? category.color : 'divider',
        boxShadow: selected ? `0 0 0 2px ${category.color}40` : 1,
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
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: category.color, fontWeight: 700, lineHeight: 1.2 }}>
            {category.label}
          </Typography>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {data.label}
          </Typography>
        </Box>
      </Box>

      {outputs.length > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
          {outputs.map((o) => (
            <Typography key={o.id} variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
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
