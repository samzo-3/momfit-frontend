import { useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextField from '../../../shared/components/TextField'
import { errorMessage } from '../form-errors'
import { useSendEmailCode, useVerifyEmailCode } from '../hooks/useAuthMutations'
import type { EmailPurpose } from '../types'
import { validateEmail } from '../validation'

// 서버의 재발송 제한(60초)과 같은 값. 서버가 최종적으로 막으므로 화면 안내용이다.
const RESEND_SECONDS = 60

export interface VerifiedEmail {
  email: string
  token: string
}

interface EmailVerificationFieldProps {
  purpose: EmailPurpose
  // 인증이 끝나면 이메일과 토큰을, 인증을 다시 시작하면 null을 전달한다.
  onChange: (verified: VerifiedEmail | null) => void
  // 부모(제출 시 검증, 서버 응답)가 내려주는 에러
  error?: string | null
}

type Step = 'input' | 'sent' | 'verified'

// 이메일 입력 → 코드 발송 → 코드 확인까지 처리한다. 인증을 처음부터 다시 하려면 key를 바꿔 다시 마운트한다.
function EmailVerificationField({
  purpose,
  onChange,
  error,
}: EmailVerificationFieldProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [cooldown, setCooldown] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)
  const sendCode = useSendEmailCode()
  const verifyCode = useVerifyEmailCode()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const trimmedEmail = email.trim().toLowerCase()

  function handleSend() {
    const invalid = validateEmail(email)
    if (invalid) {
      setLocalError(invalid)
      return
    }
    setLocalError(null)
    sendCode.mutate(
      { email: trimmedEmail, purpose },
      {
        onSuccess: () => {
          setStep('sent')
          setCode('')
          setCooldown(RESEND_SECONDS)
        },
        onError: (e) => {
          setLocalError(errorMessage(e))
          // 발송 제한에 걸렸다면 직전에 코드가 발송되었을 가능성이 높다.
          // 새로고침 등으로 입력 단계를 잃은 사용자가 받아 둔 코드를 입력할 수 있게 한다.
          if (e instanceof ApiError && e.code === 'RATE_LIMITED') {
            setStep('sent')
          }
        },
      },
    )
  }

  function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      setLocalError('6자리 숫자 인증 코드를 입력해 주세요.')
      return
    }
    setLocalError(null)
    verifyCode.mutate(
      { email: trimmedEmail, code, purpose },
      {
        onSuccess: (result) => {
          setStep('verified')
          onChange({
            email: trimmedEmail,
            token: result.emailVerificationToken,
          })
        },
        onError: (e) => setLocalError(errorMessage(e)),
      },
    )
  }

  function handleChangeEmail() {
    setStep('input')
    setCode('')
    setCooldown(0)
    setLocalError(null)
    onChange(null)
  }

  const shownError = localError ?? error ?? null

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium">이메일 인증</legend>
      <TextField
        label="이메일"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={step !== 'input'}
        error={step === 'sent' ? null : shownError}
        hint={
          purpose === 'password_reset' && step === 'sent'
            ? '가입된 이메일이면 인증 코드가 발송됩니다.'
            : undefined
        }
      />

      {step === 'input' && (
        <Button
          variant="secondary"
          onClick={handleSend}
          disabled={sendCode.isPending}
        >
          인증 코드 발송
        </Button>
      )}

      {step === 'sent' && (
        <>
          <TextField
            label="인증 코드"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            error={shownError}
            hint="메일로 받은 6자리 숫자를 입력해 주세요. (10분 안에 입력)"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleVerify}
              disabled={verifyCode.isPending}
            >
              인증 확인
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSend}
              disabled={sendCode.isPending || cooldown > 0}
            >
              {cooldown > 0 ? `재발송 (${cooldown}초)` : '재발송'}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleChangeEmail}>
              이메일 변경
            </Button>
          </div>
        </>
      )}

      {step === 'verified' && (
        <div className="flex flex-wrap items-center gap-3">
          <Notice kind="success">이메일 인증이 완료되었습니다.</Notice>
          <Button variant="secondary" size="sm" onClick={handleChangeEmail}>
            다른 이메일로 변경
          </Button>
        </div>
      )}
    </fieldset>
  )
}

export default EmailVerificationField
