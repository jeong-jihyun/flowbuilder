import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { ClerkLoaded, ClerkLoading, Show } from '@clerk/react';
import AppShell from './layout/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import SignInPage from './pages/SignInPage.jsx';
import Groups from './pages/Groups.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import Workflows from './pages/Workflows.jsx';
import Credentials from './pages/Credentials.jsx';
import Executions from './pages/Executions.jsx';
import Settings from './pages/Settings.jsx';
import { MENU } from './menu.js';
import { AUTH_ENABLED } from './lib/authConfig.js';

// 편집기는 무거워서(React Flow) 그 화면에 들어갈 때만 불러온다.
const WorkflowEditor = lazy(() => import('./pages/WorkflowEditor.jsx'));
const WorkflowDetail = lazy(() => import('./pages/WorkflowDetail.jsx'));

function Loading() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: '50dvh' }}>
      <CircularProgress />
    </Box>
  );
}

function Pages() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<WorkflowEditor />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:id" element={<GroupDetail />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/workflows/:id" element={<WorkflowDetail />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/executions" element={<Executions />} />
          <Route path="/settings" element={<Settings />} />
          {MENU.filter((m) => !m.ready).map((m) => (
            <Route
              key={m.path}
              path={m.path}
              element={<ComingSoon title={m.label} step={m.step} />}
            />
          ))}
          <Route path="*" element={<ComingSoon title="페이지를 찾을 수 없습니다" />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  // Clerk 키가 없는 환경: 로그인 없이 화면만 보여 준다(상단에 안내 표시).
  if (!AUTH_ENABLED) return <Pages />;

  return (
    <>
      <ClerkLoading>
        <Loading />
      </ClerkLoading>
      <ClerkLoaded>
        <Show when="signed-out">
          <SignInPage />
        </Show>
        <Show when="signed-in">
          <Pages />
        </Show>
      </ClerkLoaded>
    </>
  );
}
