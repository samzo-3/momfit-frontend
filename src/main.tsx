import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupAuth } from './features/auth'

// 렌더링보다 먼저 API 클라이언트에 인증 상태를 연결한다.
setupAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
