import { useLocation, useSearchParams } from 'react-router-dom'
import { kakaoErrorMessage, LoginForm } from '../features/auth'
import PageShell from '../shared/components/PageShell'

function LoginPage() {
  const state = useLocation().state as { notice?: string } | null
  const [searchParams] = useSearchParams()

  return (
    <PageShell
      title="로그인"
      description="momfit 계정으로 로그인하세요."
      tone="warm"
    >
      <LoginForm
        notice={state?.notice}
        providerError={kakaoErrorMessage(searchParams.get('error'))}
      />
    </PageShell>
  )
}

export default LoginPage
