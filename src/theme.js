import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2864FF', light: '#4B8EFF', dark: '#0B2045' },
    secondary: { main: '#00BCD4' },
    success: { main: '#16A36A' },
    warning: { main: '#E9A23B' },
    error: { main: '#DC4545' },
    info: { main: '#2864FF' },
    text: { primary: '#0B2045', secondary: '#64748B', disabled: '#A0AEC0' },
    background: { default: '#F4F7FB', paper: '#FFFFFF' },
    divider: '#E3EAF3',
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      '"Pretendard", "Noto Sans KR", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        outlined: {
          borderRadius: 16,
          borderColor: '#E3EAF3',
          boxShadow: '0 2px 8px rgba(11, 32, 69, .06)',
        },
      },
    },
  },
});

export default theme;
