import { AccountRestore } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function AccountRestorePage() {
  return (
    <PageShell
      tone="warm"
      title="탈퇴 처리된 계정이에요"
      description="탈퇴를 취소하고 계정을 되살릴 수 있어요."
    >
      <AccountRestore />
    </PageShell>
  )
}

export default AccountRestorePage
