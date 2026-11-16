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
  Typography,
  useMediaQuery,
} from '@mui/material';
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

function Stat({ label, value, note }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      )}
    </Paper>
  );
}

export default function Dashboard() {
  const api = useApi();
  // null: 불러오는 중, 배열: 내 Workflow 목록
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
      headerName: 'Workflow Name',
      minWidth: 180,
      cellRenderer: ({ data }) => (
        <Link component={RouterLink} to={`/workflows/${data.id}`} underline="hover" sx={{ fontWeight: 650 }}>
          {data.name}
        </Link>
      ),
    },
    { field: 'groupName', headerName: 'Group', hide: compact, minWidth: 120 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 105,
      cellRenderer: ({ value }) => <Chip size="small" label={value === 'draft' ? 'Draft' : value} />,
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      minWidth: 125,
      valueFormatter: ({ value }) => formatDate(value),
    },
  ], [compact]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Dashboard
      </Typography>

      {AUTH_ENABLED && <ServerAuthCheck />}
      {failed && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Workflow 목록을 불러오지 못했습니다.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
        <Stat label="Workflows" value={count} note="내가 속한 그룹 전체" />
        <Stat label="Executions" value={runCounts ? runCounts.total : '–'} note="남아 있는 실행 기록 (Workflow마다 최근 50개)" />
        <Stat label="Failures" value={runCounts ? runCounts.failed : '–'} note="그중 실패한 실행" />
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Recent Workflows
      </Typography>
      {workflows && workflows.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            아직 저장된 Workflow가 없습니다. <Link component={RouterLink} to="/workflows">Workflows</Link>에서 만들어 보세요.
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
