import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { ROLE_LABELS } from '../lib/roles.js';
import SaveWorkflowDialog from '../components/SaveWorkflowDialog.jsx';
import { formatDate } from '../lib/format.js';

// 새로 만들 때 넣어 두는 시작 노드
const STARTER = {
  nodes: [{ id: 'trigger_1', type: 'trigger', position: { x: 0, y: 0 }, data: { kind: 'manual', label: 'Manual', params: {} } }],
  edges: [],
};

// Workflow 목록 (/workflows): 내가 속한 그룹들의 Workflow
export default function Workflows() {
  const api = useApi();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('all');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const r = await api('/workflows');
    if (r.ok) setList(r.body.workflows);
    else {
      setList([]);
      setError(errorText(r));
    }
  }, [api]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  // 목록에 나온 그룹으로 거르기
  const groups = useMemo(() => {
    const map = new Map((list || []).map((w) => [w.groupId, w.groupName]));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [list]);
  const shown = (list || []).filter((w) => group === 'all' || w.groupId === group);

  if (!AUTH_ENABLED) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          워크플로우
        </Typography>
        <Alert severity="warning">
          저장된 Workflow는 로그인이 켜져 있어야 볼 수 있습니다. <RouterLink to="/editor">새 Workflow</RouterLink>는 이 기기에서 그려 볼 수 있습니다.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          워크플로우
        </Typography>
        {groups.length > 1 && (
          <TextField select size="small" label="그룹" value={group} onChange={(e) => setGroup(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">전체</MenuItem>
            {groups.map(([gid, name]) => (
              <MenuItem key={gid} value={gid}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} disabled={!!error}>
          새 Workflow
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {list === null ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : shown.length === 0 ? (
        !error && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ mb: 1 }}>아직 저장된 Workflow가 없습니다.</Typography>
            <Typography variant="body2" color="text.secondary">
              "새 Workflow"로 만들거나, <RouterLink to="/editor">Workflow Editor</RouterLink>에서 그린 흐름을 Save로 저장하세요.
            </Typography>
          </Paper>
        )
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {shown.map((w, i) => (
              <ListItemButton
                key={w.id}
                component={RouterLink}
                to={`/workflows/${w.id}`}
                divider={i < shown.length - 1}
                sx={{ minHeight: 60, gap: 1, flexWrap: 'wrap' }}
              >
                <ListItemText
                  primary={w.name}
                  secondary={`${w.groupName} · 노드 ${w.nodeCount}개 · ${formatDate(w.updatedAt)} 수정`}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  sx={{ minWidth: 200 }}
                />
                <Chip size="small" label={w.status === 'draft' ? 'Draft' : '자동 실행 중'} color={w.status === 'draft' ? 'default' : 'success'} />
                {!w.permissions.edit && <Chip size="small" variant="outlined" label={`${ROLE_LABELS[w.myRole]} · 보기 전용`} />}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      <SaveWorkflowDialog
        open={creating}
        graph={STARTER}
        title="새 Workflow"
        onClose={() => setCreating(false)}
        onCreated={(wf) => navigate(`/workflows/${wf.id}`)}
      />
    </Box>
  );
}
