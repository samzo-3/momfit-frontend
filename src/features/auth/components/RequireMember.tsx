import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// 서비스를 이용하는 회원용 화면(홈·운동·기록·내 정보)을 감싼다. RequireAuth 안에 두므로 로그인과 온보딩은 이미 확인된 상태다.
// 관리자는 이 화면들을 쓰지 않으므로 관리자 대시보드로 보낸다. (로그인 직후 /home으로 가는 경우도 여기서 /admin으로 바뀐다)
function RequireMember() {
  const { user } = useAuth()

  if (user?.role === 'admin') return <Navigate to="/admin" replace />
  return <Outlet />
}

export default RequireMember
