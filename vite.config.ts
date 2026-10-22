/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** 개발 서버에서만 종료된 환경 점검 세션 JSON을 보관한다. 이미지·영상은 수신하지 않는다. */
function yoloEventStoragePlugin() {
  return {
    name: 'yolo-local-event-storage',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/__dev/yolo-events',
        (request: IncomingMessage, response: ServerResponse) => {
          if (request.method !== 'POST') {
            response.statusCode = 405
            response.end()
            return
          }
          const chunks: Buffer[] = []
          let receivedBytes = 0
          request.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length
            if (receivedBytes <= 128_000) chunks.push(chunk)
          })
          request.on('end', () => {
            try {
              const payload = JSON.parse(Buffer.concat(chunks).toString()) as {
                session_id?: string
              }
              const directory = join(
                process.cwd(),
                'debug-artifacts',
                'yolo-environment-check',
              )
              mkdirSync(directory, { recursive: true })
              if (
                !payload.session_id ||
                !/^[0-9a-f-]{36}$/i.test(payload.session_id) ||
                receivedBytes > 128_000 ||
                'imageDataUrl' in payload ||
                'image' in payload ||
                'video' in payload
              )
                throw new Error('INVALID_EVENT_SESSION')
              const base = join(directory, `session-${payload.session_id}`)
              const temporary = `${base}.${process.pid}.tmp`
              writeFileSync(temporary, JSON.stringify(payload, null, 2))
              renameSync(temporary, `${base}.json`)
              response.statusCode = 201
              response.setHeader('Content-Type', 'application/json')
              response.end(
                JSON.stringify({ saved: true, path: `${base}.json` }),
              )
            } catch (error) {
              response.statusCode = 400
              response.end(
                JSON.stringify({ saved: false, error: String(error) }),
              )
            }
          })
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss(), yoloEventStoragePlugin()],
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
