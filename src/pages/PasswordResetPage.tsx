import { PasswordResetForm } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function PasswordResetPage() {
  return (
    <PageShell
      title="비밀번호 재설정"
      description="가입한 이메일로 본인을 확인한 뒤 새 비밀번호를 설정합니다."
    >
      <PasswordResetForm />
    </PageShell>
  )
}

export default PasswordResetPage
