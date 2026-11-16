import {
  Alert,
  Box,
  Chip,
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
import { AUTH_ENABLED } from '../lib/authConfig.js';

// 아직 DB가 연결되지 않아 화면 모양만 보여주는 예시 값이다.
// 6단계(Workflow 저장)에서 실제 데이터로 바꾼다.
const SAMPLE_STATS = [
  { label: 'Workflows', value: 12 },
  { label: 'Executions', value: 128 },
  { label: 'Failures', value: 3 },
];

const SAMPLE_WORKFLOWS = [
  { name: 'Email Automation', status: 'Active', updated: '2026-11-16' },
  { name: 'Data Collection', status: 'Draft', updated: '2026-11-15' },
];

export default function Dashboard() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Dashboard
      </Typography>

      {AUTH_ENABLED && <ServerAuthCheck />}

      <Alert severity="info" sx={{ mb: 2 }}>
        지금 보이는 숫자와 목록은 화면 모양 확인용 예시입니다.
      </Alert>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
        {SAMPLE_STATS.map((s) => (
          <Paper key={s.label} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {s.label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {s.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Recent Workflows
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Workflow Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SAMPLE_WORKFLOWS.map((w) => (
              <TableRow key={w.name}>
                <TableCell>{w.name}</TableCell>
                <TableCell>
                  <Chip size="small" label={w.status} color={w.status === 'Active' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>{w.updated}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
