import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { errorText, useApi } from '../lib/api.js';
import { AUTH_ENABLED } from '../lib/authConfig.js';
import { ROLE_COLORS, ROLE_LABELS } from '../lib/roles.js';

function CreateGroupDialog({ open, onClose, onCreated }) {
  const api = useApi();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError('');
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const r = await api('/groups', { method: 'POST', json: { name, description } });
    setSaving(false);
    if (r.ok) onCreated(r.body.group);
    else setError(errorText(r));
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>새 그룹</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="그룹 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            inputProps={{ maxLength: 50 }}
          />
          <TextField
            label="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
            inputProps={{ maxLength: 200 }}
          />
          <Typography variant="body2" color="text.secondary">
            만든 사람이 Owner가 됩니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim()}>
            {saving ? '만드는 중…' : '만들기'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 내가 속한 그룹 목록: /groups
export default function Groups() {
  const api = useApi();
  const navigate = useNavigate();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const r = await api('/groups');
    if (r.ok) setGroups(r.body.groups);
    else {
      setGroups([]);
      setError(errorText(r));
    }
  }, [api]);

  useEffect(() => {
    if (AUTH_ENABLED) load();
  }, [load]);

  if (!AUTH_ENABLED) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          My Groups
        </Typography>
        <Alert severity="warning">그룹은 로그인이 켜져 있어야 쓸 수 있습니다.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          My Groups
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} disabled={!!error}>
          새 그룹
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {groups === null ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        !error && (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ mb: 1 }}>아직 속한 그룹이 없습니다.</Typography>
            <Typography variant="body2" color="text.secondary">
              그룹을 만들거나, 다른 사람이 나를 그룹에 추가하면 여기에 보입니다.
            </Typography>
          </Paper>
        )
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {groups.map((g, i) => (
              <ListItemButton
                key={g.id}
                component={RouterLink}
                to={`/groups/${g.id}`}
                divider={i < groups.length - 1}
                sx={{ minHeight: 56, gap: 1 }}
              >
                <ListItemText
                  primary={g.name}
                  secondary={g.description || `멤버 ${g.memberCount}명`}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Chip size="small" label={ROLE_LABELS[g.myRole]} color={ROLE_COLORS[g.myRole]} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      <CreateGroupDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(g) => {
          setCreating(false);
          navigate(`/groups/${g.id}`);
        }}
      />
    </Box>
  );
}
