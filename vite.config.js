import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 설명서 캡처용 demo 모드: 가짜 로그인으로 바꿔 끼운다 (운영 빌드에는 영향 없음)
  resolve: mode === 'demo' ? { alias: { '@clerk/react': fileURLToPath(new URL('./src/demo/clerkStub.jsx', import.meta.url)) } } : {},
  build: {
    rollupOptions: {
      output: {
        // 큰 라이브러리를 따로 나눠 첫 화면 로딩을 가볍게 한다.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          flow: ['@xyflow/react'],
          ...(mode === 'demo' ? {} : { clerk: ['@clerk/react'] }),
        },
      },
    },
  },
}));
