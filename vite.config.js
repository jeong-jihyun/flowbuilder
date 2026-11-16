import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // 큰 라이브러리를 따로 나눠 첫 화면 로딩을 가볍게 한다.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
          flow: ['@xyflow/react'],
        },
      },
    },
  },
});
