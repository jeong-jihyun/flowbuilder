import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from '@mui/material';

// 실행 버튼을 누르면 뜨는 창: 시작할 노드와 첫 입력값(JSON)을 정한다.
// 입력값은 Trigger 노드의 출력이 되어 다음 노드에서 {{input.이름}} 으로 쓸 수 있다.
export default function RunDialog({ open, triggers, onClose, onRun }) {
  const [triggerId, setTriggerId] = useState('');
  const [text, setText] = useState('{}');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setRunning(false);
    setTriggerId((current) =>
      triggers.some((t) => t.id === current) ? current : (triggers.find((t) => t.data.kind === 'manual') || triggers[0])?.id || ''
    );
  }, [open, triggers]);

  async function submit(e) {
    e.preventDefault();
    let input;
    try {
      input = JSON.parse(text || '{}');
    } catch {
      setError('입력값이 JSON 형식이 아닙니다.');
      return;
    }
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      setError('입력값은 { } 로 감싼 JSON이어야 합니다.');
      return;
    }
    setRunning(true);
    const message = await onRun({ input, triggerNodeId: triggerId });
    setRunning(false);
    if (message) setError(message);
  }

  return (
    <Dialog open={open} onClose={running ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>워크플로우 실행</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            저장된 버전으로 실행합니다. HTTP Request 노드는 실제로 요청을 보냅니다.
          </Typography>
          {triggers.length > 1 && (
            <TextField select label="시작할 노드" value={triggerId} onChange={(e) => setTriggerId(e.target.value)}>
              {triggers.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.data.label} ({t.id})
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="입력값 (JSON)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={4}
            maxRows={12}
            helperText='다음 노드에서 {{input.이름}} 으로 씁니다. 예: { "amount": 150 }'
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={running}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={running || !triggerId}>
            {running ? '실행 중…' : '실행'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
