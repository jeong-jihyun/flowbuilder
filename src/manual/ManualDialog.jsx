import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { MANUALS } from './manuals.js';

function Shot({ src, alt }) {
  return (
    <Box
      component="img" src={src} alt={alt} loading="lazy"
      sx={{ width: '100%', display: 'block', borderRadius: 1.5, border: 1, borderColor: 'divider', mb: 2 }}
    />
  );
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
