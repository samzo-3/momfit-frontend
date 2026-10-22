import AdminTabs from '../features/admin/components/AdminTabs'
import MemberListView from '../features/admin/components/MemberListView'
import PageShell from '../shared/components/PageShell'

function AdminMembersPage() {
  return (
    <PageShell
      title="회원관리"
      description="가입한 회원을 찾고, 상태를 확인하고, 필요하면 처리해요."
      wide
    >
      <div className="flex flex-col gap-6">
        <AdminTabs />
        <MemberListView />
      </div>
    </PageShell>
  )
}

export default AdminMembersPage
