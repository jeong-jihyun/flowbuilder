import { useCallback, useEffect, useState } from 'react';
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
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import ConnectDialog from '../components/ConnectDialog.jsx';
import QuickLinks from '../components/QuickLinks.jsx';
import { GAS_HOME_URL, GAS_NEW_URL, GITHUB_TOKEN_URL } from '../manual/snippets.js';

// 종류별로 새 값을 만들러 갈 수 있는 링크 (새 탭)
const EDIT_LINKS = {
  githubToken: [
    ['새 토큰 만들기 (이름·권한 미리 채움)', GITHUB_TOKEN_URL],
    ['내 토큰 목록·만료일 확인', 'https://github.com/settings/personal-access-tokens'],
  ],
  gasSecret: [
    ['내 앱스 스크립트 프로젝트 열기 (TOKEN 속성 바꾸기)', GAS_HOME_URL],
    ['새 앱스 스크립트 프로젝트 만들기', GAS_NEW_URL],
  ],
  httpHeader: [],
};
import { useNavigate } from 'react-router-dom';

// 인증정보 종류 (서버 api/_lib/credentials.js 의 CREDENTIAL_TYPES 와 같은 목록)
export const CREDENTIAL_TYPE_INFO = {
  githubToken: { label: 'GitHub 토큰', help: 'Actions 쓰기 권한이 있는 Fine-grained 토큰' },
  gasSecret: { label: 'GAS 비밀값', help: 'Apps Script 쪽 TOKEN과 같은 값' },
  httpHeader: { label: 'HTTP 인증 헤더', help: '예: 이름 Authorization, 값 Bearer xxx' },
};

function CreateDialog({ open, groups, defaultGroupId, onClose, onCreated }) {
  const api = useApi();
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('githubToken');
  const [headerName, setHeaderName] = useState('Authorization');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setGroupId(defaultGroupId || groups[0]?.id || '');
      setName('');
      setType('githubToken');
      setHeaderName('Authorization');
      setSecret('');
      setError('');
    }
  }, [open, defaultGroupId, groups]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const r = await api('/credentials', {
      method: 'POST',
      json: { groupId, name, type, secret, ...(type === 'httpHeader' && { headerName }) },
    });
    setSaving(false);
    if (r.ok) {
      setSecret(''); // 비밀값은 화면에 남기지 않는다
      onCreated(r.body.credential);
    } else setError(errorText(r));
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} autoComplete="off">
        <DialogTitle>인증정보 등록</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select label="그룹" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="종류" value={type} onChange={(e) => setType(e.target.value)} helperText={CREDENTIAL_TYPE_INFO[type].help}>
            {Object.entries(CREDENTIAL_TYPE_INFO).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="이름 (노드에서 고를 때 보임)" value={name} onChange={(e) => setName(e.target.value)} required inputProps={{ maxLength: 50 }} />
          {type === 'httpHeader' && (
            <TextField
              label="헤더 이름"
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
              required
              inputProps={{ maxLength: 64 }}
            />
          )}
          <TextField
            label="비밀값"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoComplete="new-password"
            helperText="저장하면 암호화되어 다시 볼 수 없습니다. 나중에 목록에서 눌러 새 값으로 바꿀 수 있습니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !groupId || !name.trim() || !secret.trim()}>
            등록
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 목록에서 항목을 눌러 수정: 이름·(헤더 이름)·비밀값. 종류는 못 바꾼다. 비밀값은 비워 두면 그대로.
function EditDialog({ credential, onClose, onSaved }) {
  const api = useApi();
  const [name, setName] = useState('');
  const [headerName, setHeaderName] = useState('');
  const [secret, setSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (credential) {
      setName(credential.name);
      setHeaderName(credential.headerName || '');
      setSecret('');
      setError('');
    }
  }, [credential]);

  if (!credential) return null;
  const changed = name.trim() !== credential.name || secret.trim() !== '' || (credential.type === 'httpHeader' && headerName.trim() !== (credential.headerName || ''));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const json = { name: name.trim() };
    if (credential.type === 'httpHeader') json.headerName = headerName.trim();
    if (secret.trim()) json.secret = secret.trim();
    const r = await api(`/credentials/${credential.id}`, { method: 'PUT', json });
    setSaving(false);
    if (r.ok) {
      setSecret(''); // 비밀값은 화면에 남기지 않는다
      onSaved(r.body.credential);
    } else setError(errorText(r));
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} autoComplete="off">
        <DialogTitle sx={{ fontWeight: 800 }}>인증정보 수정</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip size="small" label={CREDENTIAL_TYPE_INFO[credential.type]?.label || credential.type} />
            <Typography variant="caption" color="text.secondary">종류는 바꿀 수 없습니다 · 현재 비밀값 {credential.hint}</Typography>
          </Box>
          <TextField label="이름" value={name} onChange={(e) => setName(e.target.value)} required inputProps={{ maxLength: 50 }} />
          {credential.type === 'httpHeader' && (
            <TextField label="헤더 이름" value={headerName} onChange={(e) => setHeaderName(e.target.value)} required inputProps={{ maxLength: 64 }} />
          )}
          {(EDIT_LINKS[credential.type] || []).length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">새 값이 필요하면 여기서 만드세요</Typography>
              {EDIT_LINKS[credential.type].map(([label, href]) => (
                <Button key={href} size="small" variant="outlined" component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                  {label}
                </Button>
              ))}
            </Box>
          )}
          <TextField
            label="새 비밀값 (바꿀 때만)"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="new-password"
            helperText="비워 두면 지금 값이 그대로 유지됩니다. 넣으면 암호화되어 교체됩니다."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>취소</Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim() || !changed}>{saving ? '저장 중…' : '저장'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 인증정보 (/credentials): 토큰·키를 암호화해 보관하고, 노드에서는 이름으로 골라 쓴다.
export default function Credentials() {
  const api = useApi();
  const [groups, setGroups] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectKind, setConnectKind] = useState(undefined);
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setError('');
    const [g, c] = await Promise.all([api('/groups'), api('/credentials')]);
    if (g.ok && c.ok) {
      setGroups(g.body.groups);
      setList(c.body.credentials);
    } else setError(errorText(g.ok ? c : g));
  }, [api]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  async function remove() {
    const r = await api(`/credentials/${removing.id}`, { method: 'DELETE' });
    setRemoving(null);
    if (r.ok) load();
    else setError(errorText(r));
  }

  if (!AUTH_ENABLED) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="warning">인증정보는 로그인이 켜져 있어야 쓸 수 있습니다.</Alert>
      </Box>
    );
  }

  const canManage = groups?.some((g) => g.permissions?.manageMembers);
  const manageable = (groupId) => groups?.find((g) => g.id === groupId)?.permissions?.manageMembers;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          인증정보
        </Typography>
        {canManage && (
          <>
            <Button variant="outlined" onClick={() => { setConnectKind(undefined); setConnecting(true); }}>
              연동 추가 (GAS·깃허브 액션)
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
              등록
            </Button>
          </>
        )}
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        GitHub 토큰·GAS 비밀값·HTTP 인증 헤더를 그룹별로 보관합니다. 비밀값은 암호화되어 저장되고 화면에는 끝 4글자만 보입니다. 항목을 누르면 이름·비밀값을 수정할 수 있습니다. 등록·수정·삭제는 소유자·관리자만 할 수 있습니다.
      </Typography>
      {/* 깃허브 액션·GAS 관련 페이지 바로가기 (아이콘, 이름은 마우스를 올리면 표시, 새 창으로 열림) */}
      <QuickLinks sx={{ mb: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {canManage && list && !list.some((c) => c.type === 'gasSecret' || c.type === 'githubToken') && (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mb: 2 }}>
          {[
            ['gas', '구글 앱스 스크립트 견본', '구글 시트·메일 등을 다루는 가벼운 작업. 코드는 복사해서 붙여 넣기만 하면 됩니다.'],
            ['github', '깃허브 액션 견본', '내 저장소의 빌드·배포 같은 긴 작업 실행. yml 파일도 복사해서 쓸 수 있습니다.'],
          ].map(([k, t, d]) => (
            <Paper key={k} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>{t}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>{d}</Typography>
              <Typography variant="caption" color="text.secondary">이름만 정하면 견본 워크플로우가 만들어지고, 주소·비밀값은 나중에 채워도 됩니다.</Typography>
              <Button variant="contained" onClick={() => { setConnectKind(k); setConnecting(true); }}>견본으로 시작</Button>
            </Paper>
          ))}
        </Box>
      )}

      {list === null && !error ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : list && list.length === 0 ? (
        <Alert severity="info">등록된 인증정보가 없습니다. {canManage ? '위 견본으로 시작하세요.' : '그룹의 소유자·관리자에게 등록을 요청하세요.'}</Alert>
      ) : (
        list && (
          <Paper variant="outlined">
            <List disablePadding>
              {list.map((c, i) => {
                const group = groups.find((g) => g.id === c.groupId);
                return (
                  <ListItem
                    key={c.id}
                    disablePadding
                    divider={i < list.length - 1}
                    secondaryAction={
                      manageable(c.groupId) && (
                        <Tooltip title="삭제">
                          <IconButton edge="end" aria-label={`${c.name} 삭제`} onClick={() => setRemoving(c)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  >
                    <ListItemButton
                      disabled={!manageable(c.groupId)}
                      onClick={() => setEditing(c)}
                      aria-label={`${c.name} 수정`}
                      sx={{ pr: 8, '&.Mui-disabled': { opacity: 1 } }}
                    >
                    <ListItemText
                      primary={c.name}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                          <Chip size="small" label={CREDENTIAL_TYPE_INFO[c.type]?.label || c.type} />
                          <Chip size="small" variant="outlined" label={group?.name || '그룹'} />
                          {c.headerName && <Chip size="small" variant="outlined" label={`헤더 ${c.headerName}`} />}
                          <Typography variant="caption" color="text.secondary" component="span">
                            {c.hint}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        )
      )}

      <CreateDialog
        open={creating}
        groups={(groups || []).filter((g) => g.permissions?.manageMembers)}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          load();
        }}
      />
      <EditDialog
        credential={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
      <ConnectDialog
        open={connecting}
        initialKind={connectKind}
        onClose={() => setConnecting(false)}
        onDone={({ workflow, openEditor }) => {
          load();
          if (workflow && openEditor) navigate(`/workflows/${workflow.id}`);
        }}
      />
      <Dialog open={!!removing} onClose={() => setRemoving(null)} fullWidth maxWidth="xs">
        <DialogTitle>인증정보 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{removing?.name}"을(를) 지웁니다. 이 인증정보를 쓰는 노드는 다음 실행에서 실패합니다. 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>취소</Button>
          <Button color="error" variant="contained" onClick={remove}>
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
