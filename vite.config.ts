/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // 운영(Vercel rewrites)과 같은 same-origin 구조를 개발에서도 유지한다.
      proxy: {
        // 챗봇은 백엔드와 별도 서비스라서 /api/chat만 따로 넘긴다. 더 구체적인 경로이므로 /api보다 먼저 둔다.
        '/api/chat': {
          target: env.CHATBOT_PROXY_TARGET || 'http://localhost:8100',
          changeOrigin: true,
        },
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      // userEvent로 화면 전체를 렌더하는 테스트가 많아, 느린 환경에서는 기본 5초가 부족하다.
      testTimeout: 15000,
    },
  }
})
