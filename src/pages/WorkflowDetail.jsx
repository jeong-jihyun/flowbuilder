import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlowEditor from '../editor/FlowEditor.jsx';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { ROLE_LABELS } from '../lib/roles.js';

function RenameDialog({ open, name, onClose, onSubmit }) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setValue(name);
  }, [open, name]);
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await onSubmit(value);
          setSaving(false);
        }}
      >
        <DialogTitle>이름 바꾸기</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField label="Workflow 이름" fullWidth required autoFocus value={value} onChange={(e) => setValue(e.target.value)} inputProps={{ maxLength: 80 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !value.trim()}>
            저장
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 저장된 Workflow 편집 (/workflows/:id)
export default function WorkflowDetail() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [wf, setWf] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 불러올 때마다 바뀌는 값. 편집기를 새로 그려 불러온 내용으로 시작하게 한다.
  const [loadCount, setLoadCount] = useState(0);

  const load = useCallback(async () => {
    setLoadError('');
    setError('');
    setConflict(false);
    const r = await api(`/workflows/${id}`);
    if (r.ok) {
      setWf(r.body.workflow);
      setLoadCount((n) => n + 1);
    } else setLoadError(errorText(r));
  }, [api, id]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  // 이름 바꾸기·저장 모두 서버의 version 을 따라간다
  const put = useCallback(
    async (changes) => {
      setError('');
      const r = await api(`/workflows/${id}`, { method: 'PUT', json: { version: wf.version, ...changes } });
      if (r.ok) {
        setWf((cur) => ({ ...cur, ...r.body.workflow, groupName: cur.groupName }));
        setSavedAt(new Date());
        return true;
      }
      if (r.body?.error === 'VERSION_CONFLICT') setConflict(true);
      else setError(errorText(r));
      return false;
    },
    [api, id, wf]
  );

  const onSave = useCallback((graph) => put(graph), [put]);

  async function remove() {
    const r = await api(`/workflows/${id}`, { method: 'DELETE' });
    if (r.ok) navigate('/workflows', { replace: true });
    else {
      setDeleting(false);
      setError(errorText(r));
    }
  }

  const back = (
    <Button component={RouterLink} to="/workflows" startIcon={<ArrowBackIcon />} size="small">
      Workflows
    </Button>
  );

  if (!AUTH_ENABLED || loadError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {back}
        <Alert severity={AUTH_ENABLED ? 'error' : 'warning'} sx={{ mt: 1 }}>
          {AUTH_ENABLED ? loadError : '저장된 Workflow는 로그인이 켜져 있어야 볼 수 있습니다.'}
        </Alert>
      </Box>
    );
  }
  if (!wf) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const canEdit = wf.permissions.edit;
  const status = !canEdit
    ? `보기 전용 (${ROLE_LABELS[wf.myRole]})`
    : dirty
      ? '저장 안 된 변경 있음'
      : savedAt
        ? `저장됨 ${savedAt.toLocaleTimeString()}`
        : `버전 ${wf.version}`;

  const header = (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <IconButton component={RouterLink} to="/workflows" size="small" aria-label="Workflows 목록으로">
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, minWidth: 0 }}>
          {wf.name}
        </Typography>
        {canEdit && (
          <Tooltip title="이름 바꾸기">
            <IconButton size="small" onClick={() => setRenaming(true)} aria-label="이름 바꾸기">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Chip size="small" label={wf.groupName || '그룹'} variant="outlined" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color={dirty && canEdit ? 'warning.dark' : 'text.secondary'} noWrap>
          {status}
        </Typography>
        {canEdit && (
          <Tooltip title="Workflow 삭제">
            <IconButton size="small" onClick={() => setDeleting(true)} aria-label="Workflow 삭제">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {conflict && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              최신 불러오기
            </Button>
          }
        >
          다른 사람이 먼저 저장해서 덮어쓰지 않았습니다. 최신 내용을 불러오면 지금 화면의 저장 안 된 변경은 사라집니다.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
    </Box>
  );

  return (
    <>
      <FlowEditor
        key={`${wf.id}-${loadCount}`}
        initial={{ nodes: wf.nodes, edges: wf.edges }}
        readOnly={!canEdit}
        onSave={canEdit ? onSave : undefined}
        onDirtyChange={setDirty}
        header={header}
      />
      <RenameDialog
        open={renaming}
        name={wf.name}
        onClose={() => setRenaming(false)}
        onSubmit={async (name) => {
          // 실패하면 창을 닫고 위쪽에 오류(또는 충돌 안내)를 보여 준다
          await put({ name });
          setRenaming(false);
        }}
      />
      <Dialog open={deleting} onClose={() => setDeleting(false)} fullWidth maxWidth="xs">
        <DialogTitle>Workflow 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>"{wf.name}"을(를) 지웁니다. 되돌릴 수 없습니다.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(false)}>취소</Button>
          <Button color="error" variant="contained" onClick={remove}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
