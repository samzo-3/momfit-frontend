import { AdminDashboard } from '../features/admin'
import { useAuth } from '../features/auth'
import PageShell from '../shared/components/PageShell'

// 관리자 대시보드. 회원관리는 다음 단계에서 이 화면에 붙인다.
function AdminPage() {
  const { user } = useAuth()

  return (
    <PageShell
      title="관리자"
      description={`${user?.nickname ?? ''}님, 서비스 현황을 확인하세요.`}
      wide
    >
      <AdminDashboard />
    </PageShell>
  )
}

export default AdminPage
