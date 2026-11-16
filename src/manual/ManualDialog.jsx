import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { MANUALS, RECIPES } from './manuals.js';

function Shot({ src, alt }) {
  return (
    <Box
      component="img" src={src} alt={alt} loading="lazy"
      sx={{ width: '100%', display: 'block', borderRadius: 1.5, border: 1, borderColor: 'divider', mb: 2 }}
    />
  );
}

// 누르면 클립보드에 복사. 복사가 막힌 환경에서는 글자를 선택해 두어 길게 눌러 복사할 수 있게 한다.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* 아래 방법으로 */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch { return false; }
}

export function CopyBlock({ label, text, code }) {
  const [state, setState] = useState('idle');
  const onCopy = async () => {
    const ok = await copyText(text);
    setState(ok ? 'done' : 'fail');
    setTimeout(() => setState('idle'), 2000);
  };
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', mt: 0.75 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1.25, py: 0.5, bgcolor: 'action.hover' }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>
        <Button size="small" onClick={onCopy} startIcon={state === 'done' ? <CheckIcon /> : <ContentCopyIcon />} color={state === 'fail' ? 'error' : 'primary'}>
          {state === 'done' ? '복사됨' : state === 'fail' ? '복사 안 됨: 직접 선택' : '복사'}
        </Button>
      </Stack>
      <Box component="pre" sx={{ m: 0, p: 1.25, fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: code ? 220 : 'none', overflow: 'auto', userSelect: 'all', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
        {text}
      </Box>
    </Box>
  );
}

// 무작위 비밀값(Apps Script TOKEN 용). 브라우저 안에서만 만들고 어디에도 저장·전송하지 않는다.
export function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
function TokenBlock() {
  const [token, setToken] = useState('');
  return token ? <CopyBlock label="새로 만든 비밀값 (이 창을 닫으면 사라집니다)" text={token} /> : (
    <Button size="small" variant="outlined" sx={{ mt: 0.75 }} onClick={() => setToken(makeToken())}>무작위 비밀값 만들기</Button>
  );
}

// text 가 빈 단계는 앞 단계에 붙은 복사칸으로 합친다(번호가 헛도는 것을 막는다)
function mergeSteps(steps) {
  const out = [];
  for (const st of steps) {
    if (!st.text && out.length) out[out.length - 1].copies.push(st.copy);
    else out.push({ ...st, copies: st.copy ? [st.copy] : [] });
  }
  return out;
}

function Recipes({ list }) {
  return list.map((r) => (
    <Box key={r.title} sx={{ mb: 3, p: 1.5, border: 1, borderColor: 'primary.light', borderRadius: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{r.title}</Typography>
      {r.note && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{r.note}</Typography>}
      <Stack component="ol" sx={{ m: 0, pl: 2.5, gap: 1.25 }}>
        {mergeSteps(r.steps).map((st, i) => (
          <Typography component="li" variant="body2" key={i} sx={{ display: 'list-item', whiteSpace: 'pre-line' }}>
            {st.text}
            {st.copies.map((c, j) => <CopyBlock key={j} {...c} />)}
            {st.token && <TokenBlock />}
          </Typography>
        ))}
      </Stack>
      {r.fixes && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>막혔을 때</Typography>
          <Stack component="ul" sx={{ m: 0, pl: 2.5, gap: 0.25 }}>
            {r.fixes.map((f, i) => (<Typography component="li" variant="caption" key={i}>{f}</Typography>))}
          </Stack>
        </Box>
      )}
    </Box>
  ));
}

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.75 }}>{title}</Typography>
      {children}
    </Box>
  );
}

// 현재 메뉴의 사용 설명서. 위쪽 칩으로 다른 메뉴 설명서로 바꿔 볼 수 있다.
export default function ManualDialog({ open, onClose, startKey = '/' }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [key, setKey] = useState(startKey);
  useEffect(() => { if (open) setKey(startKey); }, [open, startKey]);
  const m = MANUALS[key] || MANUALS['/'];

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        사용 설명서 · {m.title}
        <IconButton aria-label="닫기" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
          {Object.entries(MANUALS).map(([k, v]) => (
            <Chip key={k} label={v.title} size="small" clickable color={k === key ? 'primary' : 'default'} variant={k === key ? 'filled' : 'outlined'} onClick={() => setKey(k)} />
          ))}
        </Stack>

        <Shot src={m.image} alt={`${m.title} 화면`} />
        {m.image2 && <Shot src={m.image2} alt={`${m.title} 화면 2`} />}

        <Section title="이런 때 쓰세요">
          <Typography variant="body2">{m.purpose}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>언제: {m.when}</Typography>
        </Section>

        <Section title="사용법 (사진의 빨간 번호와 같습니다)">
          <Stack component="ol" sx={{ m: 0, pl: 2.5, gap: 0.75 }}>
            {m.steps.map((s, i) => (
              <Typography component="li" variant="body2" key={i}>{s}</Typography>
            ))}
          </Stack>
        </Section>

        <Section title="예제">
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1.5, p: 1.5 }}>
            <Typography variant="body2">{m.example}</Typography>
          </Box>
        </Section>

        {RECIPES[key] && (
          <Section title="따라 하기 · 복사해서 붙여 넣기">
            <Recipes list={RECIPES[key]} />
          </Section>
        )}

        <Section title="알아두면 좋은 점">
          <Stack component="ul" sx={{ m: 0, pl: 2.5, gap: 0.5 }}>
            {m.tips.map((t, i) => (<Typography component="li" variant="body2" key={i}>{t}</Typography>))}
          </Stack>
        </Section>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
    </Dialog>
  );
}
