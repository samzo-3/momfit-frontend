import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../../shared/api'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextLink from '../../../shared/components/TextLink'
import TextField from '../../../shared/components/TextField'
import { errorMessage, serverFieldErrors } from '../form-errors'
import { useResetPassword } from '../hooks/useAuthMutations'
import { validatePassword } from '../validation'
import EmailVerificationField, {
  type VerifiedEmail,
} from './EmailVerificationField'

function PasswordResetForm() {
  const navigate = useNavigate()
  const [verified, setVerified] = useState<VerifiedEmail | null>(null)
  const [verificationKey, setVerificationKey] = useState(0)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const resetPassword = useResetPassword()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!verified) return
    setFormError(null)
    const invalid =
      validatePassword(newPassword) ??
      (newPassword !== confirm ? '비밀번호가 일치하지 않습니다.' : null)
    setPasswordError(invalid)
    if (invalid) return

    resetPassword.mutate(
      {
        email: verified.email,
        emailVerificationToken: verified.token,
        newPassword,
      },
      {
        onSuccess: () =>
          navigate('/login', {
            replace: true,
            state: {
              notice:
                '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.',
            },
          }),
        onError: (error) => {
          if (
            error instanceof ApiError &&
            error.code === 'EMAIL_TOKEN_INVALID'
          ) {
            setVerified(null)
            setVerificationKey((key) => key + 1)
            setEmailError(errorMessage(error))
            return
          }
          const fields = serverFieldErrors(error)
          if (fields.newPassword) setPasswordError(fields.newPassword)
          else setFormError(errorMessage(error))
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <EmailVerificationField
        key={verificationKey}
        purpose="password_reset"
        onChange={(value) => {
          setVerified(value)
          setEmailError(null)
        }}
        error={emailError}
      />

      {verified && (
        <>
          <TextField
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value)
              setPasswordError(null)
            }}
            error={passwordError}
            hint="8자 이상, 영문과 숫자 포함"
          />
          <TextField
            label="새 비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              setPasswordError(null)
            }}
          />
          {formError && <Notice kind="error">{formError}</Notice>}
          <Button type="submit" fullWidth disabled={resetPassword.isPending}>
            {resetPassword.isPending ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </>
      )}
      <TextLink to="/login" className="text-center text-sm">
        로그인으로 돌아가기
      </TextLink>
    </form>
  )
}

export default PasswordResetForm
