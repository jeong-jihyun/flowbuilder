import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AppShell from './layout/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import { MENU } from './menu.js';

// 편집기는 무거워서(React Flow) 그 화면에 들어갈 때만 불러온다.
const WorkflowEditor = lazy(() => import('./pages/WorkflowEditor.jsx'));

function Loading() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor" element={<WorkflowEditor />} />
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
