import { Box, Typography } from '@mui/material';

export default function ComingSoon({ title, step }) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">
        {step ? `개발 ${step}단계에서 만들 화면입니다.` : '준비 중인 화면입니다.'}
      </Typography>
    </Box>
  );
}
