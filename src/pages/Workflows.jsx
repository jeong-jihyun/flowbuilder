import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { ROLE_LABELS } from '../lib/roles.js';
import ConnectDialog from '../components/ConnectDialog.jsx';
import SaveWorkflowDialog from '../components/SaveWorkflowDialog.jsx';
import { formatDate } from '../lib/format.js';

// 새로 만들 때 넣어 두는 시작 노드
const STARTER = {
  nodes: [{ id: 'trigger_1', type: 'trigger', position: { x: 0, y: 0 }, data: { kind: 'manual', label: '수동 실행', params: {} } }],
  edges: [],
};

// 워크플로우 목록 (/workflows): 내가 속한 그룹들의 워크플로우
export default function Workflows() {
  const api = useApi();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [group, setGroup] = useState('all');
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // JSON 가져오기: 읽은 파일의 { nodes, edges } 와 이름(그대로 SaveWorkflowDialog에서 그룹을 골라 저장)
  const [importing, setImporting] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

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

  // "JSON 가져오기"로 고른 파일을 읽어서 { nodes, edges } 모양만 가볍게 확인한다.
  // 자세한 검사(노드 종류·연결 등)는 서버의 cleanGraph·validateWorkflow가 저장할 때 한다.
  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 일어나게
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        setImportError('JSON 파일을 읽을 수 없습니다. 모양이 올바른지 확인하세요.');
        return;
      }
      if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
        setImportError('이 파일에는 워크플로우의 nodes·edges가 없습니다. FlowBuilder에서 "내보내기"로 만든 파일인지 확인하세요.');
        return;
      }
      setImporting({
        graph: { nodes: parsed.nodes, edges: parsed.edges },
        defaultName: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.slice(0, 80) : file.name.replace(/\.json$/i, ''),
      });
    };
    reader.onerror = () => setImportError('파일을 읽는 중 오류가 났습니다.');
    reader.readAsText(file);
  }, []);

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
          저장된 워크플로우는 로그인이 켜져 있어야 볼 수 있습니다. <RouterLink to="/editor">새 워크플로우</RouterLink>는 이 기기에서 그려 볼 수 있습니다.
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
        <Button variant="outlined" onClick={() => setConnecting(true)} disabled={!!error}>
          연동 추가 (GAS·깃허브 액션)
        </Button>
        <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={() => fileInputRef.current?.click()} disabled={!!error}>
          JSON 가져오기
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} disabled={!!error}>
          새 워크플로우
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {importError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setImportError('')}>
          {importError}
        </Alert>
      )}

      {list === null ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : shown.length === 0 ? (
        !error && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ mb: 1 }}>아직 저장된 워크플로우가 없습니다.</Typography>
            <Typography variant="body2" color="text.secondary">
              "새 워크플로우"로 만들거나, <RouterLink to="/editor">워크플로우 편집기</RouterLink>에서 그린 흐름을 저장 버튼으로 저장하세요.
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
                <Chip size="small" label={w.status === 'draft' ? '초안' : '자동 실행 중'} color={w.status === 'draft' ? 'default' : 'success'} />
                {!w.permissions.edit && <Chip size="small" variant="outlined" label={`${ROLE_LABELS[w.myRole]} · 보기 전용`} />}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      <ConnectDialog
        open={connecting}
        onClose={() => setConnecting(false)}
        onDone={({ workflow, openEditor }) => {
          if (workflow && openEditor) navigate(`/workflows/${workflow.id}`);
        }}
      />
      <SaveWorkflowDialog
        open={creating}
        graph={STARTER}
        title="새 워크플로우"
        onClose={() => setCreating(false)}
        onCreated={(wf) => navigate(`/workflows/${wf.id}`)}
      />
      <SaveWorkflowDialog
        open={!!importing}
        graph={importing?.graph}
        defaultName={importing?.defaultName}
        title="워크플로우 가져오기"
        onClose={() => setImporting(null)}
        onCreated={(wf) => {
          setImporting(null);
          navigate(`/workflows/${wf.id}`);
        }}
      />
    </Box>
  );
}
