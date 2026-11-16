import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { useAuth } from '@clerk/react';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { ROLE_COLORS, ROLE_HELP, ROLE_LABELS, assignableRoles } from '../lib/roles.js';

// 확인 창. window.confirm 대신 쓴다(모바일에서도 같은 모양).
function ConfirmDialog({ confirm, onClose }) {
  const [busy, setBusy] = useState(false);
  if (!confirm) return null;
  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{confirm.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{confirm.text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          취소
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await confirm.action();
            setBusy(false);
            onClose();
          }}
        >
          {confirm.button}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditGroupDialog({ group, open, onClose, onSaved }) {
  const api = useApi();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(group.name);
      setDescription(group.description || '');
      setError('');
    }
  }, [open, group]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const r = await api(`/groups/${group.id}`, { method: 'PATCH', json: { name, description } });
    setSaving(false);
    if (r.ok) onSaved(r.body.group);
    else setError(errorText(r));
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>그룹 정보 수정</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="그룹 이름" value={name} onChange={(e) => setName(e.target.value)} required inputProps={{ maxLength: 50 }} />
          <TextField
            label="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            inputProps={{ maxLength: 200 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>
            저장
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function AddMemberForm({ groupId, myRole, onAdded }) {
  const api = useApi();
  const roles = assignableRoles(myRole);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const r = await api(`/groups/${groupId}/members`, { method: 'POST', json: { email, role } });
    setSaving(false);
    if (r.ok) {
      setEmail('');
      onAdded(r.body.member);
    } else setError(errorText(r));
  }

  return (
    <Paper variant="outlined" component="form" onSubmit={submit} sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        멤버 추가
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 140px auto' } }}>
        <TextField
          label="가입한 이메일"
          type="email"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField select label="역할" size="small" value={role} onChange={(e) => setRole(e.target.value)}>
          {roles.map((r) => (
            <MenuItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="contained" disabled={saving || !email.trim()} sx={{ minHeight: 40 }}>
          추가
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        FlowBuilder에 먼저 가입한 사람만 추가할 수 있습니다.
      </Typography>
    </Paper>
  );
}

// 그룹 상세: /groups/:id — 멤버와 역할 관리
export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  // AUTH_ENABLED 는 빌드할 때 정해지는 값이라 훅 호출 순서가 바뀌지 않는다
  const myId = AUTH_ENABLED ? useAuth().userId : null;

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    const [g, m] = await Promise.all([api(`/groups/${id}`), api(`/groups/${id}/members`)]);
    if (!g.ok) return setLoadError(errorText(g));
    if (!m.ok) return setLoadError(errorText(m));
    setLoadError('');
    setGroup(g.body.group);
    setMembers(m.body.members);
  }, [api, id]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  // 변경 후에는 목록을 다시 읽어 서버 상태를 그대로 보여 준다
  // 나가기·삭제처럼 성공하면 이 화면을 떠나는 작업은 reload=false 로 부른다
  async function run(request, { reload = true } = {}) {
    setError('');
    const r = await request;
    if (!r.ok) setError(errorText(r));
    if (reload || !r.ok) await load();
    return r;
  }

  const back = (
    <Button component={RouterLink} to="/groups" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
      My Groups
    </Button>
  );

  if (!AUTH_ENABLED || loadError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {back}
        <Alert severity={AUTH_ENABLED ? 'error' : 'warning'}>
          {AUTH_ENABLED ? loadError : '그룹은 로그인이 켜져 있어야 쓸 수 있습니다.'}
        </Alert>
      </Box>
    );
  }

  if (!group) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const canManage = group.permissions.manageMembers;
  const roles = assignableRoles(group.myRole);
  // 이 멤버의 역할을 내가 바꾸거나 내보낼 수 있는지 (서버가 최종 확인한다)
  const canTouch = (m) => canManage && roles.includes(m.role);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {back}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {group.name}
        </Typography>
        {canManage && (
          <IconButton size="small" aria-label="그룹 정보 수정" onClick={() => setEditing(true)}>
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        <Chip size="small" label={`내 역할: ${ROLE_LABELS[group.myRole]}`} color={ROLE_COLORS[group.myRole]} />
      </Box>
      {group.description && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {group.description}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {ROLE_HELP[group.myRole]}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {canManage && <AddMemberForm groupId={group.id} myRole={group.myRole} onAdded={load} />}

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        멤버 {members.length}명
      </Typography>
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <List disablePadding>
          {members.map((m, i) => {
            const isMe = m.userId === myId;
            return (
              <ListItem key={m.userId} divider={i < members.length - 1} sx={{ gap: 1, flexWrap: 'wrap' }}>
                <ListItemText
                  primary={`${m.name || m.email}${isMe ? ' (나)' : ''}`}
                  secondary={m.name ? m.email : null}
                  sx={{ minWidth: 160 }}
                />
                {canTouch(m) ? (
                  <TextField
                    select
                    size="small"
                    value={m.role}
                    onChange={(e) =>
                      run(api(`/groups/${group.id}/members/${m.userId}`, { method: 'PATCH', json: { role: e.target.value } }))
                    }
                    sx={{ width: 120 }}
                    inputProps={{ 'aria-label': `${m.email} 역할` }}
                  >
                    {roles.map((r) => (
                      <MenuItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Chip size="small" label={ROLE_LABELS[m.role]} color={ROLE_COLORS[m.role]} />
                )}
                {canTouch(m) && !isMe && (
                  <IconButton
                    aria-label={`${m.email} 내보내기`}
                    onClick={() =>
                      setConfirm({
                        title: '멤버 내보내기',
                        text: `${m.name || m.email} 님을 이 그룹에서 내보낼까요?`,
                        button: '내보내기',
                        action: () => run(api(`/groups/${group.id}/members/${m.userId}`, { method: 'DELETE' })),
                      })
                    }
                  >
                    <PersonRemoveIcon />
                  </IconButton>
                )}
              </ListItem>
            );
          })}
        </List>
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          color="error"
          variant="outlined"
          onClick={() =>
            setConfirm({
              title: '그룹 나가기',
              text: `"${group.name}" 그룹에서 나갈까요? 다시 들어오려면 Owner나 Admin이 추가해야 합니다.`,
              button: '나가기',
              action: async () => {
                const r = await run(api(`/groups/${group.id}/members/${myId}`, { method: 'DELETE' }), { reload: false });
                if (r.ok) navigate('/groups');
              },
            })
          }
        >
          그룹 나가기
        </Button>
        {group.myRole === 'owner' && (
          <Button
            color="error"
            variant="contained"
            onClick={() =>
              setConfirm({
                title: '그룹 삭제',
                text: `"${group.name}" 그룹과 멤버 정보가 모두 지워집니다. 되돌릴 수 없습니다.`,
                button: '삭제',
                action: async () => {
                  const r = await run(api(`/groups/${group.id}`, { method: 'DELETE' }), { reload: false });
                  if (r.ok) navigate('/groups');
                },
              })
            }
          >
            그룹 삭제
          </Button>
        )}
      </Box>

      <EditGroupDialog
        group={group}
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={(g) => {
          setGroup(g);
          setEditing(false);
        }}
      />
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </Box>
  );
}
