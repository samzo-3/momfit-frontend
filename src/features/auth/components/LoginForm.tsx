import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../../shared/api'
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

function isWithdrawn(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'ACCOUNT_WITHDRAWN'
}

function LoginForm({ notice, providerError }: LoginFormProps) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const login = useLogin()
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!loginId.trim() || !password) {
      setValidationError('아이디와 비밀번호를 입력해 주세요.')
      return
    }
    setValidationError(null)
    // 성공하면 세션이 시작되어 라우트 가드가 화면을 이동시킨다.
    login.mutate(
      { loginId: loginId.trim(), password },
      {
        onError: (error) => {
          // 탈퇴 유예 중인 계정이면 오류 대신 복구 화면으로 이어 준다.
          if (error instanceof ApiError && error.code === 'ACCOUNT_WITHDRAWN') {
            void navigate('/account/restore')
          }
        },
      },
    )
  }

  const formError =
    validationError ??
    (login.isError && !isWithdrawn(login.error)
      ? errorMessage(login.error)
      : null) ??
    providerError ??
    null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {notice && <Notice kind="success">{notice}</Notice>}
      <TextField
        label="아이디"
        floatingLabel
        autoComplete="username"
        autoCapitalize="none"
        value={loginId}
        onChange={(event) => setLoginId(event.target.value)}
      />
      <TextField
        label="비밀번호"
        floatingLabel
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {formError && <Notice kind="error">{formError}</Notice>}
      <Button
        type="submit"
        variant="brand"
        fullWidth
        disabled={login.isPending}
      >
        {login.isPending ? '로그인 중...' : '로그인'}
      </Button>
      <SocialLoginSection />
      <div className="flex justify-between text-sm">
        <TextLink to="/signup" tone="brand">
          회원가입
        </TextLink>
        <TextLink to="/password/reset" tone="brand">
          비밀번호 찾기
        </TextLink>
      </div>
    </form>
  )
}

export default LoginForm
