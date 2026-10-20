import { MyInfoSection, useAuth } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function MePage() {
  const { user } = useAuth()

  // RequireAuth가 로그인 상태를 보장하지만, 타입상 user는 null일 수 있다.
  if (!user) return null

  return (
    <PageShell
      title="내 정보"
      wide
      tone="warm"
      description="프로필을 확인하고, 필요하면 수정하거나 탈퇴할 수 있어요."
    >
      <MyInfoSection user={user} />
    </PageShell>
  )
}

export default MePage
