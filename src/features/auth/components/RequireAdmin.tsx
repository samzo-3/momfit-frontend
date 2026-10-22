import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// 관리자만 통과시킨다. RequireAuth 안에 두므로 로그인과 온보딩은 이미 확인된 상태다.
// 관리자가 아니면 이 경로가 있다는 것을 알리지 않고 홈으로 보낸다. (화면 안내일 뿐, 데이터 보호는 서버가 한다)
function RequireAdmin() {
  const { user } = useAuth()

  if (user?.role !== 'admin') return <Navigate to="/home" replace />
  return <Outlet />
}

export default RequireAdmin
