import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { errorText, useApi } from '../lib/api.js';

// Webhook 노드의 받을 주소 (9단계). 주소는 서버가 만든 무작위 토큰이 들어간 비밀 주소다.
// 새로 만들면 이전 주소는 더 이상 동작하지 않는다.
export default function WebhookAddress({ workflowId, nodeId, method, active }) {
  const api = useApi();
  const [path, setPath] = useState(undefined); // undefined: 불러오는 중, null: 아직 없음
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const r = await api(`/workflows/${workflowId}/webhook?nodeId=${encodeURIComponent(nodeId)}`);
    if (r.ok) setPath(r.body.path);
    else {
      setPath(null);
      setError(r.body?.error === 'WEBHOOK_NODE_NOT_FOUND' ? '이 노드는 아직 저장되지 않았습니다. 먼저 저장한 뒤 주소를 만드세요.' : errorText(r));
    }
  }, [api, workflowId, nodeId]);

  useEffect(() => {
    setPath(undefined);
    setCopied(false);
    load();
  }, [load]);

  async function create() {
    if (path && !window.confirm('새 주소를 만들면 지금 주소는 더 이상 동작하지 않습니다. 계속할까요?')) return;
    setBusy(true);
    setError('');
    const r = await api(`/workflows/${workflowId}/webhook`, { method: 'POST', json: { nodeId } });
    setBusy(false);
    if (r.ok) {
      setPath(r.body.path);
      setCopied(false);
    } else setError(r.body?.error === 'WEBHOOK_NODE_NOT_FOUND' ? '이 노드는 아직 저장되지 않았습니다. 먼저 저장한 뒤 주소를 만드세요.' : errorText(r));
  }

  const url = path ? `${window.location.origin}${path}` : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError('복사하지 못했습니다. 주소를 길게 눌러 직접 복사하세요.');
    }
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1 }}>
          받을 주소
        </Typography>
        <Chip size="small" color={active ? 'success' : 'default'} label={active ? '자동 실행 켜짐' : '자동 실행 꺼짐'} />
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
          {error}
        </Alert>
      )}
      {path && (
        <TextField
          size="small"
          fullWidth
          value={url}
          label={`${method || 'POST'} 요청을 보낼 주소`}
          InputProps={{
            readOnly: true,
            sx: { fontSize: 12, fontFamily: 'monospace' },
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={copied ? '복사됨' : '복사'}>
                  <IconButton size="small" onClick={copy} aria-label="주소 복사">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      )}
      <Button size="small" variant="outlined" onClick={create} disabled={busy || path === undefined} sx={{ mt: 1 }}>
        {path ? '새 주소로 바꾸기' : '주소 만들기'}
      </Button>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
        주소를 아는 사람은 누구나 이 워크플로우를 시작할 수 있으니 공개하지 마세요. {active ? '' : '"자동 실행"을 켜기 전에는 요청을 받아도 시작되지 않습니다.'}
      </Typography>
    </Box>
  );
}
