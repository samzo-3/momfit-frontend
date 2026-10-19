import { useLocation } from 'react-router-dom'
import { LoginForm } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function LoginPage() {
  const state = useLocation().state as { notice?: string } | null

  return (
    <PageShell title="로그인" description="맘핏 계정으로 로그인하세요.">
      <LoginForm notice={state?.notice} />
    </PageShell>
  )
}

export default LoginPage
