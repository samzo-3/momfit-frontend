import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextLink from '../../../shared/components/TextLink'
import TextField from '../../../shared/components/TextField'
import { errorMessage, serverFieldErrors } from '../form-errors'
import { useCheckLoginId, useSignup } from '../hooks/useAuthMutations'
import type { ExerciseLevel } from '../types'
import {
  dueDateRange,
  validateDueDate,
  validateLoginId,
  validateNickname,
  validatePassword,
} from '../validation'
import EmailVerificationField, {
  type VerifiedEmail,
} from './EmailVerificationField'

const EXERCISE_LEVELS: { value: ExerciseLevel; label: string }[] = [
  { value: 'low', label: '하' },
  { value: 'medium', label: '중' },
  { value: 'high', label: '상' },
]

type Errors = Partial<
  Record<
    | 'loginId'
    | 'password'
    | 'passwordConfirm'
    | 'nickname'
    | 'email'
    | 'dueDate'
    | 'exerciseLevel'
    | 'consents',
    string
  >
>

function SignupForm() {
  const [loginId, setLoginId] = useState('')
  // null: 아직 확인하지 않음 / true: 사용 가능 / false: 이미 사용 중
  const [loginIdAvailable, setLoginIdAvailable] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [exerciseLevel, setExerciseLevel] = useState<ExerciseLevel | ''>('')
  const [terms, setTerms] = useState(false)
  const [healthData, setHealthData] = useState(false)
  const [verified, setVerified] = useState<VerifiedEmail | null>(null)
  // 값이 바뀌면 이메일 인증을 처음부터 다시 시작한다.
  const [verificationKey, setVerificationKey] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const checkLoginId = useCheckLoginId()
  const signup = useSignup()
  const range = dueDateRange()

  function clearError(name: keyof Errors) {
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function restartEmailVerification() {
    setVerified(null)
    setVerificationKey((key) => key + 1)
  }

  function handleLoginIdChange(value: string) {
    setLoginId(value.toLowerCase())
    setLoginIdAvailable(null)
    clearError('loginId')
  }

  function handleCheckLoginId() {
    const invalid = validateLoginId(loginId)
    if (invalid) {
      setErrors((current) => ({ ...current, loginId: invalid }))
      return
    }
    checkLoginId.mutate(loginId, {
      onSuccess: (available) => {
        setLoginIdAvailable(available)
        setErrors((current) => ({
          ...current,
          loginId: available ? undefined : '이미 사용 중인 아이디입니다.',
        }))
      },
      onError: (error) =>
        setErrors((current) => ({ ...current, loginId: errorMessage(error) })),
    })
  }

  function validate(): Errors {
    const next: Errors = {}
    const loginIdError = validateLoginId(loginId)
    if (loginIdError) next.loginId = loginIdError
    else if (loginIdAvailable !== true) {
      next.loginId =
        loginIdAvailable === false
          ? '이미 사용 중인 아이디입니다.'
          : '아이디 중복 확인을 해주세요.'
    }
    const passwordError = validatePassword(password)
    if (passwordError) next.password = passwordError
    if (password !== passwordConfirm) {
      next.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    }
    const nicknameError = validateNickname(nickname)
    if (nicknameError) next.nickname = nicknameError
    if (!verified) next.email = '이메일 인증을 완료해 주세요.'
    const dueDateError = validateDueDate(dueDate)
    if (dueDateError) next.dueDate = dueDateError
    if (!exerciseLevel) next.exerciseLevel = '운동 경험을 선택해 주세요.'
    if (!terms || !healthData) {
      next.consents = '필수 항목에 모두 동의해 주세요.'
    }
    return next
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next = validate()
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0 || !verified || !exerciseLevel) return

    signup.mutate(
      {
        loginId,
        password,
        nickname: nickname.trim(),
        email: verified.email,
        emailVerificationToken: verified.token,
        dueDate,
        exerciseLevel,
        consents: { terms, healthData },
      },
      {
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : null
          if (code === 'LOGIN_ID_EXISTS') {
            setLoginIdAvailable(false)
            setErrors({ loginId: errorMessage(error) })
          } else if (code === 'EMAIL_EXISTS') {
            restartEmailVerification()
            setErrors({ email: errorMessage(error) })
          } else if (code === 'EMAIL_TOKEN_INVALID') {
            restartEmailVerification()
            setErrors({ email: errorMessage(error) })
          } else {
            const fields = serverFieldErrors(error)
            if (Object.keys(fields).length > 0) setErrors(fields)
            else setFormError(errorMessage(error))
          }
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <TextField
          label="아이디"
          autoComplete="username"
          autoCapitalize="none"
          value={loginId}
          onChange={(event) => handleLoginIdChange(event.target.value)}
          error={errors.loginId}
          hint="영문 소문자와 숫자 4~20자"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCheckLoginId}
            disabled={checkLoginId.isPending}
          >
            중복 확인
          </Button>
          {loginIdAvailable === true && (
            <Notice kind="success">사용 가능한 아이디입니다.</Notice>
          )}
        </div>
      </div>

      <TextField
        label="비밀번호"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          clearError('password')
        }}
        error={errors.password}
        hint="8자 이상, 영문과 숫자 포함"
      />
      <TextField
        label="비밀번호 확인"
        type="password"
        autoComplete="new-password"
        value={passwordConfirm}
        onChange={(event) => {
          setPasswordConfirm(event.target.value)
          clearError('passwordConfirm')
        }}
        error={errors.passwordConfirm}
      />
      <TextField
        label="닉네임"
        autoComplete="nickname"
        value={nickname}
        onChange={(event) => {
          setNickname(event.target.value)
          clearError('nickname')
        }}
        error={errors.nickname}
      />

      <EmailVerificationField
        key={verificationKey}
        purpose="signup"
        onChange={(value) => {
          setVerified(value)
          clearError('email')
        }}
        error={errors.email}
      />

      <TextField
        label="출산 예정일"
        type="date"
        min={range.min}
        max={range.max}
        value={dueDate}
        onChange={(event) => {
          setDueDate(event.target.value)
          clearError('dueDate')
        }}
        error={errors.dueDate}
        hint="임신 주차는 출산 예정일로 계산합니다."
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">운동 경험</legend>
        <div className="flex gap-2">
          {EXERCISE_LEVELS.map((level) => (
            <label key={level.value} className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="exerciseLevel"
                value={level.value}
                checked={exerciseLevel === level.value}
                onChange={() => {
                  setExerciseLevel(level.value)
                  clearError('exerciseLevel')
                }}
                className="peer sr-only"
              />
              <span className="block rounded-full border border-line px-4 py-2.5 text-center transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                {level.label}
              </span>
            </label>
          ))}
        </div>
        {errors.exerciseLevel && (
          <Notice kind="error">{errors.exerciseLevel}</Notice>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">약관 동의</legend>
        <label className="flex items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => {
              setTerms(event.target.checked)
              clearError('consents')
            }}
            className="mt-0.5 size-5 accent-accent"
          />
          이용약관에 동의합니다. (필수)
        </label>
        <label className="flex items-start gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={healthData}
            onChange={(event) => {
              setHealthData(event.target.checked)
              clearError('consents')
            }}
            className="mt-0.5 size-5 accent-accent"
          />
          건강정보(출산 예정일, 운동 경험) 수집·이용에 동의합니다. (필수)
        </label>
        {errors.consents && <Notice kind="error">{errors.consents}</Notice>}
      </fieldset>

      {formError && <Notice kind="error">{formError}</Notice>}
      <Button type="submit" fullWidth disabled={signup.isPending}>
        {signup.isPending ? '가입 중...' : '가입하기'}
      </Button>
      <p className="text-center text-sm text-ink-secondary">
        이미 계정이 있나요? <TextLink to="/login">로그인</TextLink>
      </p>
    </form>
  )
}

export default SignupForm
