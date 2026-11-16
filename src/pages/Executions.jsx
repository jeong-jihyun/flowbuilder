import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { RUN_STATUS, StepRow } from '../editor/ExecutionPanel.jsx';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { formatDate } from '../lib/format.js';

const SOURCE_LABEL = { manual: '수동', webhook: 'Webhook', schedule: '예약' };
const FINISHED = ['success', 'failed', 'cancelled'];
const STATUS_OPTIONS = ['running', 'waiting', 'success', 'failed', 'cancelled'];

function seconds(ex) {
  if (!ex.finishedAt) return '';
  const ms = new Date(ex.finishedAt) - new Date(ex.createdAt);
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}초`;
}

// 실행 기록 (/executions): 내가 속한 그룹의 모든 실행을 최신순으로.
// 시스템은 기록을 자동으로 지우지 않는다. 오래된 기록이 쌓이면 알려 주고, 삭제는 사용자가 직접 한다.
export default function Executions() {
  const api = useApi();
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'old' 또는 삭제할 실행
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    setRows(null);
    const r = await api(`/executions?limit=20${status ? `&status=${status}` : ''}`);
    if (r.ok) {
      setRows(r.body.executions);
      setCounts(r.body.counts);
      setHasMore(r.body.hasMore);
    } else {
      setRows([]);
      setError(errorText(r));
    }
  }, [api, status]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  async function more() {
    setLoadingMore(true);
    const last = rows[rows.length - 1];
    const r = await api(`/executions?limit=20&before=${encodeURIComponent(last.createdAt)}${status ? `&status=${status}` : ''}`);
    setLoadingMore(false);
    if (r.ok) {
      setRows((cur) => [...cur, ...r.body.executions]);
      setHasMore(r.body.hasMore);
    } else setError(errorText(r));
  }

  async function removeOld() {
    setConfirm(null);
    const r = await api('/executions?olderThanDays=30', { method: 'DELETE' });
    if (r.ok) {
      setNotice(`30일 지난 기록 ${r.body.deleted}건을 삭제했습니다.`);
      load();
    } else setError(errorText(r));
  }

  async function removeOne(ex) {
    setConfirm(null);
    const r = await api(`/executions/${ex.id}`, { method: 'DELETE' });
    if (r.ok) {
      setDetail(null);
      setNotice('기록을 삭제했습니다.');
      load();
    } else setError(errorText(r));
  }

  async function retry(ex) {
    const r = await api(`/executions/${ex.id}/retry`, { method: 'POST' });
    if (r.ok) {
      setDetail(null);
      setNotice('같은 입력으로 다시 실행했습니다. 목록 맨 위에서 확인하세요.');
      load();
    } else setError(errorText(r));
  }

  async function open(ex) {
    setDetail({ ...ex, steps: null });
    setDetailLoading(true);
    const r = await api(`/executions/${ex.id}`);
    setDetailLoading(false);
    if (r.ok) setDetail(r.body.execution);
    else {
      setDetail(null);
      setError(errorText(r));
    }
  }

  if (!AUTH_ENABLED) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="warning">실행 기록은 로그인이 켜져 있어야 볼 수 있습니다.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          실행 기록
        </Typography>
        <TextField
          select
          size="small"
          label="상태"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">전체</MenuItem>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {RUN_STATUS[s].label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        내가 속한 그룹의 실행 기록입니다. 기록은 자동으로 지워지지 않으니, 오래된 것은 직접 삭제해 용량을 아껴 주세요.
        {counts && ` 현재 전체 ${counts.total}건, 실패 ${counts.failed}건.`}
      </Typography>

      {counts?.old > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setConfirm('old')}>
              삭제
            </Button>
          }
        >
          30일이 지난 실행 기록이 {counts.old}건 있습니다. 무료 DB 용량을 위해 삭제를 권합니다. (Owner·Admin만 한꺼번에 삭제할 수 있습니다)
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {rows === null ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">{status ? '이 상태의 실행 기록이 없습니다.' : '아직 실행한 기록이 없습니다. Workflow에서 Run을 눌러 보세요.'}</Alert>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {rows.map((ex, i) => (
              <ListItemButton key={ex.id} divider={i < rows.length - 1} onClick={() => open(ex)}>
                <ListItemText
                  primary={ex.workflowName}
                  secondary={
                    <Box component="span" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                      <Chip size="small" color={RUN_STATUS[ex.status]?.color} label={RUN_STATUS[ex.status]?.label || ex.status} />
                      <Chip size="small" variant="outlined" label={SOURCE_LABEL[ex.source] || ex.source} />
                      <Typography variant="caption" color="text.secondary" component="span">
                        {formatDate(ex.createdAt)}
                        {seconds(ex) && ` · ${seconds(ex)}`} · 노드 {ex.stepCount}개
                      </Typography>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
      {hasMore && (
        <Button onClick={more} disabled={loadingMore} sx={{ mt: 1 }}>
          {loadingMore ? '불러오는 중…' : '더 보기'}
        </Button>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 0.5 }}>
          {detail?.workflowName}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
            {detail && <Chip size="small" color={RUN_STATUS[detail.status]?.color} label={RUN_STATUS[detail.status]?.label} />}
            <Typography variant="caption" color="text.secondary">
              {detail && `${formatDate(detail.createdAt)} 시작 · 버전 ${detail.workflowVersion}`}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {detail?.error && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {detail.error}
            </Typography>
          )}
          {detailLoading || !detail?.steps ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List dense disablePadding>
              {[...detail.steps]
                .sort((a, b) => (a.status === 'skipped') - (b.status === 'skipped'))
                .map((s) => (
                  <StepRow key={s.nodeId} step={s} branchLabel="" onPick={() => {}} />
                ))}
            </List>
          )}
          {detail && FINISHED.includes(detail.status) && (
            <Button size="small" variant="outlined" sx={{ mt: 1, mr: 1 }} onClick={() => retry(detail)}>
              다시 실행
            </Button>
          )}
          {detail && (
            <Button color="error" size="small" sx={{ mt: 1, mr: 1 }} onClick={() => setConfirm(detail)}>
              이 기록 삭제
            </Button>
          )}
          {detail && (
            <Button component={RouterLink} to={`/workflows/${detail.workflowId}`} size="small" sx={{ mt: 1 }}>
              Workflow 열기
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>실행 기록 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirm === 'old' ? `30일이 지난 끝난 실행 기록 ${counts?.old ?? ''}건을 모두 지웁니다.` : `"${confirm?.workflowName}" 기록 1건을 지웁니다.`} 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>취소</Button>
          <Button color="error" variant="contained" onClick={() => (confirm === 'old' ? removeOld() : removeOne(confirm))}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
