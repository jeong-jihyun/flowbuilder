import { useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import { useAuth } from '@clerk/react';
import { apiFetch } from '../lib/api.js';

const MESSAGES = {
  loading: { severity: 'info', text: '서버에서 로그인 확인 중…' },
  ok: { severity: 'success', text: '서버가 로그인을 확인했습니다.' },
  AUTH_NOT_CONFIGURED: {
    severity: 'warning',
    text: '서버에 Clerk 비밀 키(CLERK_SECRET_KEY)가 아직 등록되지 않았습니다.',
  },
  fail: { severity: 'error', text: '서버가 로그인을 확인하지 못했습니다.' },
  noapi: { severity: 'info', text: '이 환경에는 서버 API가 없습니다. (내 PC의 npm run dev)' },
};

// 화면 로그인만 믿지 않고, 서버(/api/me)도 같은 사람으로 인정하는지 보여 준다.
export default function ServerAuthCheck() {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (!isSignedIn) return;
    let alive = true;
    apiFetch('/me', { getToken }).then((r) => {
      if (!alive) return;
      if (r.ok) setState('ok');
      else if (!r.body) setState('noapi');
      else setState(MESSAGES[r.body.error] ? r.body.error : 'fail');
    });
    return () => {
      alive = false;
    };
  }, [getToken, isSignedIn]);

  const m = MESSAGES[state];
  return (
    <Alert severity={m.severity} sx={{ mb: 2 }}>
      {m.text}
    </Alert>
  );
}
