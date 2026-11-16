import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import theme from './theme.js';
import { AUTH_ENABLED, CLERK_KEY } from './lib/authConfig.js';

const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* 키가 없으면 Clerk 없이 띄운다. (키 없이 ClerkProvider를 쓰면 앱이 멈춘다) */}
      {AUTH_ENABLED ? (
        <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
          {app}
        </ClerkProvider>
      ) : (
        app
      )}
    </ThemeProvider>
  </React.StrictMode>
);
