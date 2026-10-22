import { useParams } from 'react-router-dom'
import AdminTabs from '../features/admin/components/AdminTabs'
import MemberDetailView from '../features/admin/components/MemberDetailView'
import PageShell from '../shared/components/PageShell'
import NotFoundPage from './NotFoundPage'

function AdminMemberDetailPage() {
  const { id } = useParams()
  const memberId = Number(id)
  if (!Number.isInteger(memberId) || memberId <= 0) return <NotFoundPage />

  return (
    <PageShell title="회원관리" wide>
      <div className="flex flex-col gap-6">
        <AdminTabs />
        <MemberDetailView id={memberId} />
      </div>
    </PageShell>
  )
}

export default AdminMemberDetailPage
