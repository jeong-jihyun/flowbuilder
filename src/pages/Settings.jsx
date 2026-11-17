import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { Alert, Box, Button, Chip, CircularProgress, Collapse, Divider, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
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

// 빠진 항목은 "뭔지 / 없으면 어떻게 되는지 / 누가 어디서 넣는지"를 쉬운 말로 풀어서 보여 준다.
function StatusRow({ ok, label, what, effect, steps, extra }) {
  const [open, setOpen] = useState(false);
  return (
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      {ok ? <CheckCircleIcon color="success" fontSize="small" sx={{ mt: 0.5, mr: 1 }} /> : <ErrorOutlineIcon color="warning" fontSize="small" sx={{ mt: 0.5, mr: 1 }} />}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="body2" color="text.secondary">{what}</Typography>
        {ok ? (
          <Typography variant="caption" color="success.main">✔ 설정됨</Typography>
        ) : (
          <>
            <Typography variant="body2" color="warning.dark" sx={{ mt: 0.5 }}>아직 설정되지 않았습니다. {effect}</Typography>
            <Button size="small" onClick={() => setOpen(!open)} sx={{ px: 0 }}>{open ? '접기' : '어떻게 하나요?'}</Button>
            <Collapse in={open}>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
                이 설정은 FlowBuilder를 운영하는 사람(관리자)이 한 번만 합니다. 일반 사용자는 하지 않아도 되며, 필요하면 관리자에게 요청하세요.
              </Typography>
              <Box component="ol" sx={{ pl: 2.5, my: 0.5, '& li': { mb: 0.5, fontSize: 14 } }}>
                {steps.map((t, i) => <li key={i}>{t}</li>)}
              </Box>
              {extra}
            </Collapse>
          </>
        )}
      </Box>
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
          멤버 추가·역할 변경은 그룹 화면에서 합니다 (소유자·관리자).
        </Typography>
      </Section>

      <Section title="시스템">
        {!health ? (
          <Alert severity="warning">서버 상태를 가져오지 못했습니다. (내 PC에서는 npx vercel dev 로 실행해야 서버가 있습니다)</Alert>
        ) : (
          <List dense disablePadding>
            <StatusRow ok={health.db === 'ok'} label="데이터베이스 (MongoDB)" what="워크플로우·그룹·실행 기록이 저장되는 곳입니다."
              effect={health.db === 'not_configured' ? '이 주소가 없으면 아무것도 저장되지 않습니다.' : '연결이 잠깐 안 됐을 수 있습니다. "다시 확인"을 눌러 보세요.'}
              steps={['Vercel 대시보드 → flowbuilder 프로젝트 → Settings → Environment Variables 로 갑니다.', '이름 MONGODB_URI, 값에 MongoDB Atlas의 연결 주소(mongodb+srv://…)를 넣고 Save 합니다.', 'Deployments 에서 맨 위 배포의 ⋯ → Redeploy 를 누릅니다.']} />
            <StatusRow ok={!!health.config?.auth} label="로그인 확인용 키 (Clerk)" what="로그인한 사람이 맞는지 서버가 확인할 때 쓰는 키입니다."
              effect="이 키가 없으면 로그인한 사람의 요청을 서버가 받아 주지 않습니다."
              steps={['Clerk 대시보드 → 내 앱 → API keys 에서 Secret keys 를 복사합니다.', 'Vercel → flowbuilder → Settings → Environment Variables 에 이름 CLERK_SECRET_KEY 로 넣고 Save 합니다.', '맨 위 배포를 Redeploy 합니다.']} />
            <StatusRow ok={!!health.config?.credentialsKey} label="인증정보 암호화 키" what="앱스 스크립트 비밀값·깃허브 토큰을 저장할 때 잠그는 열쇠입니다."
              effect="이 열쇠가 없으면 인증정보를 등록할 수 없습니다."
              steps={['터미널에서 openssl rand -base64 32 를 실행해 나온 글자를 복사합니다.', 'Vercel → flowbuilder → Settings → Environment Variables 에 이름 CREDENTIALS_KEY 로 넣고 Save(Sensitive 체크)합니다.', '맨 위 배포를 Redeploy 합니다.']} />
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
