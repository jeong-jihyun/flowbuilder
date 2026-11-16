import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import { formatDate } from '../lib/format.js';

export const RUN_STATUS = {
  running: { label: '실행 중', color: 'info' },
  waiting: { label: '기다리는 중', color: 'warning' },
  success: { label: '성공', color: 'success' },
  failed: { label: '실패', color: 'error' },
  cancelled: { label: '취소됨', color: 'default' },
  skipped: { label: '건너뜀', color: 'default' },
};

export function StepIcon({ status, size = 'small' }) {
  if (status === 'running') return <CircularProgress size={16} />;
  if (status === 'waiting') return <HourglassBottomIcon color="warning" fontSize={size} />;
  if (status === 'success') return <CheckCircleIcon color="success" fontSize={size} />;
  if (status === 'failed') return <CancelIcon color="error" fontSize={size} />;
  if (status === 'cancelled') return <BlockIcon color="disabled" fontSize={size} />;
  return <RemoveCircleOutlineIcon color="disabled" fontSize={size} />;
}

function duration(step) {
  if (!step.startedAt || !step.finishedAt) return '';
  const ms = new Date(step.finishedAt) - new Date(step.startedAt);
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}초`;
}

function preview(value) {
  if (value === undefined) return '';
  const text = JSON.stringify(value, null, 2);
  return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
}

export function StepRow({ step, branchLabel, onPick }) {
  const [open, setOpen] = useState(false);
  const hasDetail = step.output !== undefined || step.error;
  const secondary = [
    RUN_STATUS[step.status]?.label,
    duration(step),
    branchLabel && `→ ${branchLabel}`,
    step.status === 'waiting' && step.resumeAt && `${formatDate(step.resumeAt)}까지`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <ListItemButton
        onClick={() => {
          onPick(step.nodeId);
          if (hasDetail) setOpen((v) => !v);
        }}
        sx={{ borderRadius: 1, py: 0.25 }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <StepIcon status={step.status} />
        </ListItemIcon>
        <ListItemText
          primary={step.label}
          secondary={step.error ? `${secondary} · ${step.error}` : secondary}
          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          secondaryTypographyProps={{ color: step.error ? 'error' : 'text.secondary' }}
        />
      </ListItemButton>
      {hasDetail && (
        <Collapse in={open} unmountOnExit>
          <Box
            component="pre"
            sx={{ m: 0, ml: 5, mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: 12, overflow: 'auto', maxHeight: 200 }}
          >
            {preview(step.output) || '(결과 없음)'}
          </Box>
        </Collapse>
      )}
    </>
  );
}

// 아래쪽 실행 결과 패널 (설계 3.2 하단 "Execution History / Logs / Results").
// execution: 보고 있는 실행. history: 이 Workflow의 최근 실행 목록(고르면 onSelect).
export default function ExecutionPanel({ execution, history, loading, branchLabel, canCancel, onCancel, onSelect, onClose, onPick }) {
  const active = execution && (execution.status === 'running' || execution.status === 'waiting');
  // 실행한 순서대로, 건너뛴 노드는 뒤에
  const steps = execution ? [...execution.steps].sort((a, b) => (a.status === 'skipped') - (b.status === 'skipped')) : [];

  return (
    <Box
      sx={{
        flexShrink: 0,
        height: { xs: '42dvh', md: 240 },
        display: 'flex',
        flexDirection: 'column',
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          실행 결과
        </Typography>
        {execution && <Chip size="small" color={RUN_STATUS[execution.status]?.color} label={RUN_STATUS[execution.status]?.label} />}
        {active && <CircularProgress size={14} />}
        <Box sx={{ flexGrow: 1 }} />
        {history?.length > 0 && (
          <TextField
            select
            size="small"
            value={execution?.id || ''}
            onChange={(e) => onSelect(e.target.value)}
            sx={{ minWidth: 180, '& .MuiInputBase-input': { py: 0.5, fontSize: 13 } }}
            inputProps={{ 'aria-label': '최근 실행 고르기' }}
          >
            {history.map((h) => (
              <MenuItem key={h.id} value={h.id} sx={{ fontSize: 13 }}>
                {formatDate(h.createdAt)} · {RUN_STATUS[h.status]?.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        {active && canCancel && (
          <Button size="small" color="error" onClick={onCancel}>
            취소
          </Button>
        )}
        <IconButton size="small" aria-label="실행 결과 닫기" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ overflowY: 'auto', flexGrow: 1, px: 1, pb: 1 }}>
        {loading && !execution ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : !execution ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            아직 실행한 기록이 없습니다. Run을 누르면 저장된 버전으로 실행합니다.
          </Typography>
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ px: 1, pb: 0.5 }}>
              {formatDate(execution.createdAt)} 시작 · 버전 {execution.workflowVersion}
              {execution.finishedAt && ` · ${formatDate(execution.finishedAt)} 끝`}
              {execution.status === 'waiting' && ' · 이 화면을 열어 두면 시간이 되었을 때 이어서 실행합니다'}
            </Typography>
            {execution.error && (
              <Typography variant="body2" color="error" sx={{ px: 1, pb: 0.5 }}>
                {execution.error}
              </Typography>
            )}
            <List dense disablePadding>
              {steps.map((s) => (
                <StepRow key={s.nodeId} step={s} branchLabel={s.branch !== undefined ? branchLabel(s) : ''} onPick={onPick} />
              ))}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
}
