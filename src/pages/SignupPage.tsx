import { SignupForm } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function SignupPage() {
  return (
    <PageShell
      title="회원가입"
      description="이메일 인증 후 몇 가지 정보만 입력하면 시작할 수 있어요."
    >
      <SignupForm />
    </PageShell>
  )
}

export default SignupPage
