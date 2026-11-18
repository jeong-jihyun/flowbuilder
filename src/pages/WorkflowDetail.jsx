import { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import FlowEditor from '../editor/FlowEditor.jsx';
import ExecutionPanel from '../editor/ExecutionPanel.jsx';
import RunDialog from '../editor/RunDialog.jsx';
import { runStatusByNode } from '../editor/runContext.js';
import { NODE_KINDS, outputLabel } from '../editor/nodeCatalog.js';
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
          <TextField label="워크플로우 이름" fullWidth required autoFocus value={value} onChange={(e) => setValue(e.target.value)} inputProps={{ maxLength: 80 }} />
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

// 저장된 워크플로우 편집 (/workflows/:id)
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

  // 실행 (8단계)
  const [runOpen, setRunOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [execution, setExecution] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [validationRequest, setValidationRequest] = useState(0);

  // 자동 실행·인증정보 (9단계)
  const [credentials, setCredentials] = useState([]);
  // 하위 워크플로우 노드에서 고를 같은 그룹의 워크플로우 목록
  const [workflows, setWorkflows] = useState([]);
  const [activating, setActivating] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    setError('');
    setConflict(false);
    const r = await api(`/workflows/${id}`);
    if (r.ok) {
      setWf(r.body.workflow);
      setLoadCount((n) => n + 1);
      const c = await api(`/credentials?groupId=${r.body.workflow.groupId}`);
      setCredentials(c.ok ? c.body.credentials : []);
      const w = await api(`/workflows?groupId=${r.body.workflow.groupId}`);
      setWorkflows(w.ok ? w.body.workflows : []);
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
        // 자동 실행 중이던 워크플로우에 검증 오류가 생기면 서버가 자동 실행을 끈다
        if (wf.status === 'active' && r.body.workflow.status !== 'active') {
          setNotice('검증 오류가 있는 모양으로 저장되어 자동 실행이 꺼졌습니다. 오류를 고친 뒤 다시 켜세요.');
        }
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

  const loadHistory = useCallback(async () => {
    const r = await api(`/executions?workflowId=${id}`);
    if (r.ok) setHistory(r.body.executions);
    return r.ok ? r.body.executions : [];
  }, [api, id]);

  // "실행 기록" 버튼: 창을 열고 가장 최근 실행을 보여 준다
  async function openHistory() {
    setPanelOpen(true);
    setHistoryLoading(true);
    const list = await loadHistory();
    if (list[0]) await selectExecution(list[0].id);
    setHistoryLoading(false);
  }

  async function selectExecution(executionId) {
    const r = await api(`/executions/${executionId}`);
    if (r.ok) setExecution(r.body.execution);
    else setError(errorText(r));
  }

  // Run 창에서 실행. 실패 문구를 돌려주면 창에 보여 준다.
  async function run({ input, triggerNodeId }) {
    const r = await api(`/workflows/${id}/run`, { method: 'POST', json: { input, triggerNodeId } });
    if (r.ok) {
      setRunOpen(false);
      setExecution(r.body.execution);
      setPanelOpen(true);
      loadHistory();
      return '';
    }
    if (r.body?.error === 'VALIDATION_FAILED') {
      // 검증 오류: 창을 닫고 검증 결과를 보여 준다
      setRunOpen(false);
      setPanelOpen(false);
      setValidationRequest((n) => n + 1);
      setError(errorText(r));
      return '';
    }
    return errorText(r);
  }

  async function cancelRun() {
    const r = await api(`/executions/${execution.id}/cancel`, { method: 'POST' });
    if (r.ok) {
      setExecution(r.body.execution);
      loadHistory();
    } else setError(errorText(r));
  }

  // 진행 중인 실행은 주기적으로 상태를 물어본다 (서버는 물어볼 때 이어서 처리한다)
  const executionId = execution?.id;
  const executionStatus = execution?.status;
  useEffect(() => {
    if (!panelOpen || !executionId || (executionStatus !== 'running' && executionStatus !== 'waiting')) return undefined;
    let alive = true;
    const t = setTimeout(
      async () => {
        const r = await api(`/executions/${executionId}`);
        if (!alive || !r.ok) return;
        setExecution(r.body.execution);
        if (r.body.execution.status !== 'running' && r.body.execution.status !== 'waiting') loadHistory();
      },
      executionStatus === 'waiting' ? 5000 : 1500
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [api, panelOpen, executionId, executionStatus, execution, loadHistory]);

  async function toggleActive(active) {
    setActivating(true);
    setError('');
    setNotice('');
    const r = await api(`/workflows/${id}/activate`, { method: 'POST', json: { active } });
    setActivating(false);
    if (r.ok) setWf((cur) => ({ ...cur, status: r.body.status }));
    else if (r.body?.error === 'VALIDATION_FAILED') {
      setPanelOpen(false);
      setValidationRequest((n) => n + 1);
      setError('검증 오류가 있어 자동 실행을 켜지 못했습니다. 아래 검증 결과를 확인하세요. (저장한 내용으로 검사합니다)');
    } else setError(errorText(r));
  }

  const runStatus = useMemo(() => (panelOpen ? runStatusByNode(execution) : null), [panelOpen, execution]);
  const triggers = useMemo(() => (wf ? wf.nodes.filter((n) => NODE_KINDS[n.data.kind]?.category === 'trigger') : []), [wf]);

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
      워크플로우
    </Button>
  );

  if (!AUTH_ENABLED || loadError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {back}
        <Alert severity={AUTH_ENABLED ? 'error' : 'warning'} sx={{ mt: 1 }}>
          {AUTH_ENABLED ? loadError : '저장된 워크플로우는 로그인이 켜져 있어야 볼 수 있습니다.'}
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
        <IconButton component={RouterLink} to="/workflows" size="small" aria-label="워크플로우 목록으로">
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
        {canEdit && (
          <Tooltip title="켜면 웹훅·예약 노드가 저장된 내용대로 자동으로 시작합니다">
            <FormControlLabel
              sx={{ mr: 0, ml: 0 }}
              control={
                <Switch
                  size="small"
                  checked={wf.status === 'active'}
                  disabled={activating}
                  onChange={(e) => toggleActive(e.target.checked)}
                  inputProps={{ 'aria-label': '자동 실행' }}
                />
              }
              label={<Typography variant="caption">자동 실행</Typography>}
            />
          </Tooltip>
        )}
        <Typography variant="caption" color={dirty && canEdit ? 'warning.dark' : 'text.secondary'} noWrap>
          {status}
        </Typography>
        <Tooltip title="실행 기록">
          <IconButton size="small" onClick={openHistory} aria-label="실행 기록">
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {canEdit && (
          <Tooltip title="워크플로우 삭제">
            <IconButton size="small" onClick={() => setDeleting(true)} aria-label="워크플로우 삭제">
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
      {notice && (
        <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setNotice('')}>
          {notice}
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
        onRun={wf.permissions.run ? () => setRunOpen(true) : undefined}
        runTip={wf.permissions.run ? '' : `보기 전용입니다 (${ROLE_LABELS[wf.myRole]}). 실행 기록은 볼 수 있습니다.`}
        runStatus={runStatus}
        credentials={credentials}
        workflows={workflows}
        currentWorkflowId={wf.id}
        exportMeta={{ name: wf.name, description: wf.description }}
        automation={{ workflowId: wf.id, active: wf.status === 'active' }}
        validationRequest={validationRequest}
        onValidationOpen={() => setPanelOpen(false)}
        bottomPanel={
          panelOpen
            ? (focusNode) => (
                <ExecutionPanel
                  execution={execution}
                  history={history}
                  loading={historyLoading}
                  canCancel={wf.permissions.run}
                  onCancel={cancelRun}
                  onSelect={selectExecution}
                  onClose={() => setPanelOpen(false)}
                  onPick={focusNode}
                  branchLabel={(step) => {
                    const node = wf.nodes.find((n) => n.id === step.nodeId);
                    return outputLabel(node, step.branch) || step.branch;
                  }}
                />
              )
            : null
        }
      />
      <RunDialog open={runOpen} triggers={triggers} onClose={() => setRunOpen(false)} onRun={run} />
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
        <DialogTitle>워크플로우 삭제</DialogTitle>
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
