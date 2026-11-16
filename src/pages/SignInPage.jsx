import { Box, Typography } from '@mui/material';
import { SignIn } from '@clerk/react';

// 로그인하지 않은 사람에게 보이는 화면. 이메일·Google 로그인 버튼은 Clerk가 그려 준다.
export default function SignInPage() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
        FlowBuilder
      </Typography>
      <SignIn routing="hash" />
    </Box>
  );
}
