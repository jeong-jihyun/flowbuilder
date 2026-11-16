import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { errorText, useApi } from '../lib/api.js';

// 새 Workflow를 서버에 만드는 창: 이름과 그룹을 고른다.
// graph 는 저장할 { nodes, edges }. 성공하면 onCreated(workflow).
// 편집 권한(Owner·Admin·Editor)이 있는 그룹만 고를 수 있다.
export default function SaveWorkflowDialog({ open, graph, title = 'Workflow 저장', defaultName = '', onClose, onCreated }) {
  const api = useApi();
  const [groups, setGroups] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setError('');
    setGroups(null);
    api('/groups').then((r) => {
      if (!r.ok) {
        setGroups([]);
        setError(errorText(r));
        return;
      }
      const editable = r.body.groups.filter((g) => g.permissions.edit);
      setGroups(editable);
      setGroupId((current) => (editable.some((g) => g.id === current) ? current : editable[0]?.id || ''));
    });
  }, [open, api, defaultName]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const r = await api('/workflows', { method: 'POST', json: { groupId, name, ...graph } });
    setSaving(false);
    if (r.ok) onCreated(r.body.workflow);
    else setError(errorText(r));
  }

  const noGroups = groups !== null && groups.length === 0 && !error;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          {groups === null ? (
            <CircularProgress size={24} sx={{ justifySelf: 'center' }} />
          ) : noGroups ? (
            <Alert severity="info">
              Workflow는 그룹 안에 저장됩니다. 편집할 수 있는 그룹이 없습니다.{' '}
              <RouterLink to="/groups">My Groups</RouterLink>에서 그룹을 먼저 만들어 주세요.
            </Alert>
          ) : (
            <>
              <TextField
                label="Workflow 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                inputProps={{ maxLength: 80 }}
              />
              <TextField select label="그룹" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !name.trim() || !groupId}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
