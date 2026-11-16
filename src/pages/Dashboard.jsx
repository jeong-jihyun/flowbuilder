import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ServerAuthCheck from '../components/ServerAuthCheck.jsx';
import { useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { formatDate } from '../lib/format.js';

const RECENT = 5;

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

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    api('/workflows').then((r) => {
      if (r.ok) setWorkflows(r.body.workflows);
      else setFailed(true);
    });
  }, [api]);

  const count = workflows ? workflows.length : '–';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100 }}>
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
        {/* 실행 기록은 8단계(실행 엔진)부터 생긴다 */}
        <Stat label="Executions" value="–" note="실행 기능(8단계) 이후 표시" />
        <Stat label="Failures" value="–" note="실행 기능(8단계) 이후 표시" />
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
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Workflow Name</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Group</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(workflows || []).slice(0, RECENT).map((w) => (
                <TableRow key={w.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/workflows/${w.id}`} underline="hover">
                      {w.name}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{w.groupName}</TableCell>
                  <TableCell>
                    <Chip size="small" label={w.status === 'draft' ? 'Draft' : w.status} />
                  </TableCell>
                  <TableCell>{formatDate(w.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
