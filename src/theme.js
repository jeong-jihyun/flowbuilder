import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2f5bea' },
    background: { default: '#f5f6f8' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      '"Pretendard", "Noto Sans KR", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
});

export default theme;
