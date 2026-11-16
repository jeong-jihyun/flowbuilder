import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AllCommunityModule, themeQuartz } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import {
  Alert,
  Box,
  Chip,
  Link,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ServerAuthCheck from '../components/ServerAuthCheck.jsx';
import { useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { formatDate } from '../lib/format.js';

const RECENT = 5;
const GRID_MODULES = [AllCommunityModule];
const GRID_THEME = themeQuartz.withParams({
  accentColor: '#2864FF',
  backgroundColor: '#FFFFFF',
  borderColor: '#E3EAF3',
  borderRadius: 6,
  browserColorScheme: 'light',
  fontFamily: 'Pretendard, "Noto Sans KR", sans-serif',
  fontSize: 13,
  foregroundColor: '#0B2045',
  headerBackgroundColor: '#F7F9FC',
  headerFontFamily: 'Pretendard, "Noto Sans KR", sans-serif',
  headerFontSize: 11,
  headerFontWeight: 700,
  headerTextColor: '#64748B',
  headerVerticalPaddingScale: 1.25,
  rowHoverColor: '#F4F7FB',
  rowVerticalPaddingScale: 1.2,
  spacing: 8,
  subtleTextColor: '#64748B',
  textColor: '#0B2045',
  wrapperBackgroundColor: '#FFFFFF',
  wrapperBorderRadius: 16,
});
const DEFAULT_COL_DEF = { flex: 1, minWidth: 100, sortable: true, resizable: false };

function Stat({ label, value, note, color, tint, icon }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, minHeight: 144 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0B2045', mt: 0.75, letterSpacing: '-.04em' }}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 2, color, bgcolor: tint }}>
          {icon}
        </Box>
      </Stack>
      {note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{note}</Typography>}
    </Paper>
  );
}

function ExecutionChart({ counts }) {
  const total = counts?.total ?? null;
  const failed = counts?.failed ?? 0;
  const other = total === null ? 0 : Math.max(0, total - failed);
  const circumference = 2 * Math.PI * 43;
  const failedLength = total ? (failed / total) * circumference : 0;
  const otherLength = total ? (other / total) * circumference : 0;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 750, color: '#0B2045' }}>실행 기록 분포</Typography>
      <Typography variant="caption" color="text.secondary">최근 보관 중인 실행 기록의 실패 비중</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-around" gap={2} sx={{ mt: 2 }}>
        <Box sx={{ width: 148, height: 148, position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 120 120" role="img" aria-label={total === null ? '실행 통계를 불러오는 중' : `전체 ${total}건 중 실패 ${failed}건`}>
            <circle cx="60" cy="60" r="43" fill="none" stroke="#E3EAF3" strokeWidth="12" />
            {total > 0 && (
              <g transform="rotate(-90 60 60)">
                {other > 0 && <circle cx="60" cy="60" r="43" fill="none" stroke="#00BCD4" strokeWidth="12" strokeDasharray={`${otherLength} ${circumference - otherLength}`} />}
                {failed > 0 && <circle cx="60" cy="60" r="43" fill="none" stroke="#DC4545" strokeWidth="12" strokeDasharray={`${failedLength} ${circumference - failedLength}`} strokeDashoffset={-otherLength} />}
              </g>
            )}
          </svg>
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', alignContent: 'center', justifyItems: 'center' }}>
            <Typography variant="h5" sx={{ color: '#0B2045', fontWeight: 800, lineHeight: 1.1 }}>{total === null ? '–' : total}</Typography>
            <Typography variant="caption" color="text.secondary">전체 실행</Typography>
          </Box>
        </Box>
        <Stack spacing={1.5} sx={{ minWidth: { sm: 150 } }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00BCD4' }} />
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>실패 외 기록</Typography>
            <Typography variant="body2" sx={{ color: '#0B2045', fontWeight: 750 }}>{total === null ? '–' : other}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#DC4545' }} />
            <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>실패</Typography>
            <Typography variant="body2" sx={{ color: '#0B2045', fontWeight: 750 }}>{total === null ? '–' : failed}</Typography>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function WorkflowGroupChart({ workflows }) {
  const groups = useMemo(() => {
    const counts = new Map();
    (workflows || []).forEach((workflow) => {
      const name = workflow.groupName || '그룹 없음';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  }, [workflows]);
  const max = Math.max(1, ...groups.map(([, value]) => value));

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 750, color: '#0B2045' }}>그룹별 워크플로우</Typography>
      <Typography variant="caption" color="text.secondary">워크플로우가 많은 그룹 상위 5개</Typography>
      {workflows === null ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>데이터를 불러오는 중입니다.</Typography>
      ) : groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>표시할 워크플로우가 없습니다.</Typography>
      ) : (
        <Stack spacing={1.75} sx={{ mt: 2.5 }}>
          {groups.map(([name, value]) => (
            <Stack key={name} direction="row" alignItems="center" gap={1.25}>
              <Typography variant="body2" color="text.secondary" noWrap title={name} sx={{ width: 112, flexShrink: 0 }}>{name}</Typography>
              <Box role="progressbar" aria-label={`${name} 워크플로우 수`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} sx={{ height: 10, flexGrow: 1, bgcolor: '#F4F7FB', borderRadius: 99, overflow: 'hidden' }}>
                <Box sx={{ width: `${(value / max) * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #2864FF, #00BCD4)' }} />
              </Box>
              <Typography variant="body2" sx={{ width: 24, textAlign: 'right', color: '#0B2045', fontWeight: 750 }}>{value}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function Dashboard() {
  const api = useApi();
  // null: 불러오는 중, 배열: 내 워크플로우 목록
  const [workflows, setWorkflows] = useState(null);
  const [failed, setFailed] = useState(false);
  // 실행 개수 (8단계)
  const [runCounts, setRunCounts] = useState(null);
  const compact = useMediaQuery('(max-width:599.95px)');

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    api('/workflows').then((r) => {
      if (r.ok) setWorkflows(r.body.workflows);
      else setFailed(true);
    });
    api('/executions').then((r) => {
      if (r.ok) setRunCounts(r.body.counts);
    });
  }, [api]);

  const count = workflows ? workflows.length : '–';
  const recentWorkflows = useMemo(() => (workflows || []).slice(0, RECENT), [workflows]);
  const columnDefs = useMemo(() => [
    {
      field: 'name',
      headerName: '워크플로우 이름',
      minWidth: 180,
      cellRenderer: ({ data }) => (
        <Link component={RouterLink} to={`/workflows/${data.id}`} underline="hover" sx={{ fontWeight: 650 }}>
          {data.name}
        </Link>
      ),
    },
    { field: 'groupName', headerName: '그룹', hide: compact, minWidth: 120 },
    {
      field: 'status',
      headerName: '상태',
      minWidth: 105,
      cellRenderer: ({ value }) => <Chip size="small" label={value === 'draft' ? '초안' : '자동 실행 중'} />,
    },
    {
      field: 'updatedAt',
      headerName: '수정일',
      minWidth: 125,
      valueFormatter: ({ value }) => formatDate(value),
    },
  ], [compact]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        대시보드
      </Typography>

      {AUTH_ENABLED && <ServerAuthCheck />}
      {failed && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          워크플로우 목록을 불러오지 못했습니다.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, mb: 2 }}>
        <Stat label="워크플로우" value={count} note="내가 속한 그룹 전체" color="#2864FF" tint="#EAF1FF" icon={<AccountTreeOutlinedIcon />} />
        <Stat label="실행 기록" value={runCounts ? runCounts.total : '–'} note="보관 중인 실행 기록" color="#00A6BC" tint="#E5F9FB" icon={<PlayArrowRoundedIcon />} />
        <Stat label="실패" value={runCounts ? runCounts.failed : '–'} note="실패한 실행 기록" color="#DC4545" tint="#FFEEEE" icon={<ErrorOutlineRoundedIcon />} />
      </Box>

      <Typography variant="overline" sx={{ color: '#2864FF', letterSpacing: '.04em', fontWeight: 800 }}>한눈에 보기</Typography>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, mb: 3 }}>
        <ExecutionChart counts={runCounts} />
        <WorkflowGroupChart workflows={workflows} />
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        최근 워크플로우
      </Typography>
      {workflows && workflows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            아직 저장된 워크플로우가 없습니다. <Link component={RouterLink} to="/workflows">워크플로우</Link>에서 만들어 보세요.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(11,32,69,.06)' }}>
          <AgGridProvider modules={GRID_MODULES}>
            <AgGridReact
              rowData={recentWorkflows}
              columnDefs={columnDefs}
              defaultColDef={DEFAULT_COL_DEF}
              theme={GRID_THEME}
              domLayout="autoHeight"
              headerHeight={44}
              rowHeight={52}
              getRowId={({ data }) => data.id}
              suppressCellFocus
            />
          </AgGridProvider>
        </Paper>
      )}
    </Box>
  );
}
