import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextLink from '../../../shared/components/TextLink'
import TextField from '../../../shared/components/TextField'
import { errorMessage } from '../form-errors'
import SocialLoginSection from './SocialLoginSection'
import { useLogin } from '../hooks/useAuthMutations'

interface LoginFormProps {
  notice?: string
  // 카카오 로그인 실패 등 폼 밖에서 전달된 오류
  providerError?: string | null
}

function LoginForm({ notice, providerError }: LoginFormProps) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const login = useLogin()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!loginId.trim() || !password) {
      setValidationError('아이디와 비밀번호를 입력해 주세요.')
      return
    }
    setValidationError(null)
    // 성공하면 세션이 시작되어 라우트 가드가 화면을 이동시킨다.
    login.mutate({ loginId: loginId.trim(), password })
  }

  const formError =
    validationError ??
    (login.isError ? errorMessage(login.error) : null) ??
    providerError ??
    null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {notice && <Notice kind="success">{notice}</Notice>}
      <SocialLoginSection />
      <TextField
        label="아이디"
        autoComplete="username"
        autoCapitalize="none"
        value={loginId}
        onChange={(event) => setLoginId(event.target.value)}
      />
      <TextField
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {formError && <Notice kind="error">{formError}</Notice>}
      <Button type="submit" fullWidth disabled={login.isPending}>
        {login.isPending ? '로그인 중...' : '로그인'}
      </Button>
      <div className="flex justify-between text-sm">
        <TextLink to="/signup">회원가입</TextLink>
        <TextLink to="/password/reset">비밀번호 찾기</TextLink>
      </div>
    </form>
  )
}

export default LoginForm
