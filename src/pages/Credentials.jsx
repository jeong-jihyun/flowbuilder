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
            helperText="저장하면 암호화되어 다시 볼 수 없습니다. 바꾸려면 새로 등록하세요."
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

// 인증정보 (/credentials): 토큰·키를 암호화해 보관하고, 노드에서는 이름으로 골라 쓴다.
export default function Credentials() {
  const api = useApi();
  const [groups, setGroups] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);

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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Credentials
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            등록
          </Button>
        )}
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        GitHub 토큰·GAS 비밀값·HTTP 인증 헤더를 그룹별로 보관합니다. 비밀값은 암호화되어 저장되고 화면에는 끝 4글자만 보입니다. 등록·삭제는 Owner·Admin만 할 수 있습니다.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {list === null && !error ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : list && list.length === 0 ? (
        <Alert severity="info">등록된 인증정보가 없습니다. {canManage ? '"등록"을 눌러 추가하세요.' : '그룹의 Owner·Admin에게 등록을 요청하세요.'}</Alert>
      ) : (
        list && (
          <Paper variant="outlined">
            <List disablePadding>
              {list.map((c, i) => {
                const group = groups.find((g) => g.id === c.groupId);
                return (
                  <ListItem
                    key={c.id}
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
