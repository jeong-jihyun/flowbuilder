import { Box } from '@mui/material';
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
      <Box component="img" src="/logo.png" alt="FlowBuilder" sx={{ height: 56, maxWidth: '90%', width: 'auto' }} />
      <SignIn routing="hash" />
    </Box>
  );
}
