import { logout } from '../auth-session'
import { useAuthStore } from '../store/auth-store'

export function useAuth() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)

  return {
    status,
    user,
    isAuthenticated: status === 'authenticated',
    logout,
  }
}
