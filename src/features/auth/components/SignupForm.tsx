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
import ConsentFields from './ConsentFields'
import SocialLoginSection from './SocialLoginSection'
import EmailVerificationField, {
  type VerifiedEmail,
} from './EmailVerificationField'
import ExerciseLevelField from './ExerciseLevelField'

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

type LiveField =
  'loginId' | 'password' | 'passwordConfirm' | 'nickname' | 'dueDate'

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
  // 입력칸을 한 번 벗어난 뒤부터 형식 오류를 보여준다. (입력하는 도중에 빨갛게 깜빡이지 않도록)
  const [touched, setTouched] = useState<Partial<Record<LiveField, boolean>>>(
    {},
  )
  const [formError, setFormError] = useState<string | null>(null)
  const checkLoginId = useCheckLoginId()
  const signup = useSignup()
  const range = dueDateRange()

  function touch(name: LiveField) {
    setTouched((current) =>
      current[name] ? current : { ...current, [name]: true },
    )
  }

  // 입력 중 형식 검사. 값이 비어 있으면 제출할 때만 안내하고, 한 번 벗어난 칸만 보여준다.
  const liveErrors: Errors = {
    loginId:
      touched.loginId && loginId
        ? (validateLoginId(loginId) ?? undefined)
        : undefined,
    password:
      touched.password && password
        ? (validatePassword(password) ?? undefined)
        : undefined,
    passwordConfirm:
      touched.passwordConfirm && passwordConfirm && passwordConfirm !== password
        ? '비밀번호가 일치하지 않습니다.'
        : undefined,
    nickname:
      touched.nickname && nickname
        ? (validateNickname(nickname) ?? undefined)
        : undefined,
    dueDate:
      touched.dueDate && dueDate
        ? (validateDueDate(dueDate) ?? undefined)
        : undefined,
  }
  // 제출·서버 오류가 있으면 그것을 먼저 보여주고, 없으면 실시간 형식 오류를 보여준다.
  const shown = (name: keyof Errors) => errors[name] ?? liveErrors[name]

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
          placeholder="예) momfit01"
          onChange={(event) => handleLoginIdChange(event.target.value)}
          onBlur={() => touch('loginId')}
          error={shown('loginId')}
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
        placeholder="8자 이상, 영문과 숫자 포함"
        onChange={(event) => {
          setPassword(event.target.value)
          clearError('password')
        }}
        onBlur={() => touch('password')}
        error={shown('password')}
        hint="8자 이상, 영문과 숫자 포함"
      />
      <TextField
        label="비밀번호 확인"
        type="password"
        autoComplete="new-password"
        value={passwordConfirm}
        placeholder="비밀번호를 한 번 더 입력"
        onChange={(event) => {
          setPasswordConfirm(event.target.value)
          clearError('passwordConfirm')
        }}
        onBlur={() => touch('passwordConfirm')}
        error={shown('passwordConfirm')}
      />
      <TextField
        label="닉네임"
        autoComplete="nickname"
        value={nickname}
        placeholder="1~20자 (공백만은 불가)"
        onChange={(event) => {
          setNickname(event.target.value)
          clearError('nickname')
        }}
        onBlur={() => touch('nickname')}
        error={shown('nickname')}
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
        onBlur={() => touch('dueDate')}
        error={shown('dueDate')}
        hint="임신 주차는 출산 예정일로 계산합니다."
      />

      <ExerciseLevelField
        value={exerciseLevel}
        onChange={(level) => {
          setExerciseLevel(level)
          clearError('exerciseLevel')
        }}
        error={errors.exerciseLevel}
      />

      <ConsentFields
        terms={terms}
        healthData={healthData}
        onTermsChange={(checked) => {
          setTerms(checked)
          clearError('consents')
        }}
        onHealthDataChange={(checked) => {
          setHealthData(checked)
          clearError('consents')
        }}
        error={errors.consents}
      />

      {formError && <Notice kind="error">{formError}</Notice>}
      <Button type="submit" fullWidth disabled={signup.isPending}>
        {signup.isPending ? '가입 중...' : '가입하기'}
      </Button>
      <SocialLoginSection />
      <p className="text-center text-sm text-ink-secondary">
        이미 계정이 있나요? <TextLink to="/login">로그인</TextLink>
      </p>
    </form>
  )
}

export default SignupForm
