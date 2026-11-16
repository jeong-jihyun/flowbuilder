import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { Alert, Box, Button, Chip, CircularProgress, Divider, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import pkg from '../../package.json';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { ROLE_COLORS, ROLE_LABELS } from '../lib/roles.js';

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function StatusRow({ ok, label, help }) {
  return (
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      {ok ? <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.5, mr: 1 }} /> : <ErrorOutlineIcon color="warning" fontSize="small" sx={{ mt: 0.5, mr: 1 }} />}
      <ListItemText primary={label} secondary={ok ? '설정됨' : help} secondaryTypographyProps={{ color: ok ? 'text.secondary' : 'warning.dark' }} />
    </ListItem>
  );
}

// 사용자 → 워크스페이스(내 그룹) → 시스템(서버 설정 상태). 설계 5장 설정(Settings).
// 서버 설정 값은 보여 주지 않고 "설정됨/안 됨"만 보여 준다.
export default function Settings() {
  const api = useApi();
  const user = AUTH_ENABLED ? useUser().user : null;
  const [groups, setGroups] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const h = await fetch('/api/health').then((r) => r.json()).catch(() => null);
    setHealth(h);
    if (AUTH_ENABLED) {
      const g = await api('/groups');
      if (g.ok) setGroups(g.body.groups);
      else setError(errorText(g));
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        설정
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Section title="사용자">
        {AUTH_ENABLED ? (
          user ? (
            <List dense disablePadding>
              <ListItem disableGutters>
                <ListItemText primary="이름" secondary={user.fullName || user.username || '(이름 없음)'} />
              </ListItem>
              <ListItem disableGutters>
                <ListItemText primary="이메일" secondary={user.primaryEmailAddress?.emailAddress || '(없음)'} />
              </ListItem>
            </List>
          ) : (
            <CircularProgress size={20} />
          )
        ) : (
          <Alert severity="warning">로그인이 꺼져 있어 사용자 정보가 없습니다.</Alert>
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          이름·비밀번호·로그인 방법은 오른쪽 위 계정 버튼 → "계정 관리"에서 바꿉니다.
        </Typography>
      </Section>

      <Section title="워크스페이스 (내 그룹)">
        {!AUTH_ENABLED ? (
          <Alert severity="warning">로그인이 켜져 있어야 그룹을 볼 수 있습니다.</Alert>
        ) : groups === null ? (
          <CircularProgress size={20} />
        ) : groups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            속한 그룹이 없습니다. <RouterLink to="/groups">내 그룹</RouterLink>에서 만들어 보세요.
          </Typography>
        ) : (
          <List dense disablePadding>
            {groups.map((g, i) => (
              <Box key={g.id}>
                {i > 0 && <Divider />}
                <ListItem disableGutters secondaryAction={<Chip size="small" color={ROLE_COLORS[g.myRole]} label={ROLE_LABELS[g.myRole]} />}>
                  <ListItemText primary={<RouterLink to={`/groups/${g.id}`}>{g.name}</RouterLink>} secondary={g.description || undefined} sx={{ pr: 8 }} />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          멤버 추가·역할 변경은 그룹 화면에서 합니다 (Owner·Admin).
        </Typography>
      </Section>

      <Section title="시스템">
        {!health ? (
          <Alert severity="warning">서버 상태를 가져오지 못했습니다. (내 PC에서는 npx vercel dev 로 실행해야 서버가 있습니다)</Alert>
        ) : (
          <List dense disablePadding>
            <StatusRow ok={health.db === 'ok'} label="데이터베이스 (MongoDB)" help={health.db === 'not_configured' ? 'MONGODB_URI 가 서버에 없습니다.' : '연결하지 못했습니다. 잠시 뒤 다시 확인하세요.'} />
            <StatusRow ok={!!health.config?.auth} label="로그인 검증 (Clerk 비밀 키)" help="CLERK_SECRET_KEY 가 서버에 없습니다." />
            <StatusRow ok={!!health.config?.credentialsKey} label="인증정보 암호화 키" help="CREDENTIALS_KEY(32바이트 base64)가 없거나 길이가 맞지 않습니다. 이 키가 없으면 인증정보 등록이 안 됩니다." />
            <StatusRow ok={!!health.config?.cronSecret} label="주기 작업 비밀 값" help="CRON_SECRET 이 없습니다. 이 값이 없으면 예약 실행과 기다리는 실행 이어가기가 멈춥니다." />
          </List>
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          버전 {pkg.version}. 설정 값은 화면에 보이지 않고 "설정됨/안 됨"만 보입니다. 환경변수는 Vercel 프로젝트 설정에서 바꿉니다.
        </Typography>
        <Button size="small" onClick={load} sx={{ mt: 1 }}>
          다시 확인
        </Button>
      </Section>
    </Box>
  );
}
