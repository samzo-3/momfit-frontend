import { useEffect, type ReactNode } from 'react'
import { initializeAuth } from '../auth-session'

// 앱이 시작될 때 한 번 세션 복구를 시작한다. 복구가 끝나기 전에는 status가 initializing이다.
function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initializeAuth()
  }, [])

  return children
}

export default AuthBootstrap
