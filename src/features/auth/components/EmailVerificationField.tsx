import { useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api'
import FieldStatus from './FieldStatus'
import FieldAction from '../../../shared/components/FieldAction'
import StatusIcon from '../../../shared/components/StatusIcon'
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
  // 입력칸을 한 번 벗어난 뒤부터 형식 오류를 실시간으로 보여준다.
  const [emailTouched, setEmailTouched] = useState(false)
  const [codeTouched, setCodeTouched] = useState(false)
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
  const liveEmailError =
    emailTouched && email.trim() ? validateEmail(email) : null
  const liveCodeError =
    codeTouched && code && !/^\d{6}$/.test(code)
      ? '6자리 숫자 인증 코드를 입력해 주세요.'
      : null
  const emailValid = email.trim() !== '' && !validateEmail(email)

  // 이메일 칸 안 오른쪽: 아이디 중복 확인과 같은 방식으로 상태에 따라 버튼 → 로딩 → 체크로 바뀐다.
  const loading = (message: string) => (
    <>
      <StatusIcon kind="loading" />
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  )
  // 형식 오류는 칸 안 느낌표 툴팁으로 보여준다. (형식이 틀리면 발송·확인 버튼이 없어 자리가 겹치지 않는다)
  const emailFormatTip = step !== 'sent' && !shownError && !!liveEmailError
  const codeFormatTip = !shownError && !!liveCodeError
  const codeComplete = /^\d{6}$/.test(code)
  const emailTrailing = emailFormatTip ? (
    <FieldStatus label="이메일" error={liveEmailError} valid={false} />
  ) : step === 'verified' ? (
    <div className="flex items-center gap-1">
      <StatusIcon kind="success" />
      <span role="status" className="sr-only">
        이메일 인증이 완료되었습니다.
      </span>
      <FieldAction aria-label="다른 이메일로 변경" onClick={handleChangeEmail}>
        변경
      </FieldAction>
    </div>
  ) : sendCode.isPending ? (
    loading('인증 코드를 보내는 중입니다.')
  ) : step === 'sent' ? (
    <FieldAction onClick={handleSend} disabled={cooldown > 0}>
      {cooldown > 0 ? `재발송 (${cooldown}초)` : '재발송'}
    </FieldAction>
  ) : emailValid ? (
    <FieldAction onClick={handleSend}>인증 코드 발송</FieldAction>
  ) : null

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 text-sm font-medium">이메일 인증</legend>
      <TextField
        label="이메일"
        floatingLabel
        type="email"
        autoComplete="email"
        value={email}
        placeholder="example@email.com"
        onChange={(event) => {
          setEmail(event.target.value)
          setLocalError(null)
        }}
        onBlur={() => setEmailTouched(true)}
        disabled={step !== 'input'}
        error={step === 'sent' ? null : (shownError ?? liveEmailError)}
        hint={
          purpose === 'password_reset' && step === 'sent'
            ? '가입된 이메일이면 인증 코드가 발송됩니다.'
            : undefined
        }
        hideErrorMessage={emailFormatTip}
        trailing={emailTrailing}
      />

      {step === 'sent' && (
        <div className="flex flex-col gap-2">
          <TextField
            label="인증 코드"
            floatingLabel
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            placeholder="6자리 숫자"
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, ''))
              setLocalError(null)
            }}
            onBlur={() => setCodeTouched(true)}
            error={shownError ?? liveCodeError}
            hideErrorMessage={codeFormatTip}
            hint="메일로 받은 6자리 숫자를 입력해 주세요. (10분 안에 입력)"
            trailing={
              verifyCode.isPending ? (
                loading('인증 코드를 확인하는 중입니다.')
              ) : codeFormatTip ? (
                <FieldStatus
                  label="인증 코드"
                  error={liveCodeError}
                  valid={false}
                />
              ) : codeComplete ? (
                <FieldAction onClick={handleVerify}>인증 확인</FieldAction>
              ) : null
            }
          />
          <button
            type="button"
            onClick={handleChangeEmail}
            className="self-start text-sm text-brand-text hover:underline"
          >
            이메일 변경
          </button>
        </div>
      )}
    </fieldset>
  )
}

export default EmailVerificationField
