import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextLink from '../../../shared/components/TextLink'
import FieldAction from '../../../shared/components/FieldAction'
import InfoTip from '../../../shared/components/InfoTip'
import StatusIcon from '../../../shared/components/StatusIcon'
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
import FieldStatus from './FieldStatus'
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

  // 아이디 칸 안 오른쪽: 형식이 맞으면 "중복 확인" 버튼, 확인 중에는 로딩, 결과가 나오면 체크(사용 가능)나 느낌표(사용 중).
  // 결과 문구는 화면에 보이지 않게 두고 스크린리더에만 읽히게 하며, "사용 중" 안내는 칸 아래 오류 문구가 맡는다.
  // 형식 오류도 같은 느낌표 툴팁으로 보여준다. (형식이 틀리면 중복 확인 버튼이 없어 자리가 겹치지 않는다)
  const loginIdFormatError = validateLoginId(loginId)
  const loginIdFormatTip =
    loginIdFormatError !== null && shown('loginId') === loginIdFormatError
  const loginIdCheckStatus = checkLoginId.isPending ? (
    <>
      <StatusIcon kind="loading" />
      <span role="status" className="sr-only">
        아이디를 확인하는 중입니다.
      </span>
    </>
  ) : loginIdAvailable === true ? (
    <>
      <StatusIcon kind="success" />
      <span role="status" className="sr-only">
        사용 가능한 아이디입니다.
      </span>
    </>
  ) : loginIdAvailable === false ? (
    // 사용 중이라는 사유는 칸 아래 문구 대신 이 느낌표 아이콘의 툴팁으로 보여준다.
    // 나타난 직후 3초 동안은 열어 두어 왜 빨간지 바로 알 수 있게 한다.
    <InfoTip
      variant="error"
      label="아이디를 사용할 수 없는 이유"
      text={shown('loginId') ?? '이미 사용 중인 아이디입니다.'}
      autoOpenFor={3000}
    />
  ) : loginIdFormatTip ? (
    <FieldStatus label="아이디" error={loginIdFormatError} valid={false} />
  ) : loginId && !validateLoginId(loginId) ? (
    <FieldAction onClick={handleCheckLoginId}>중복 확인</FieldAction>
  ) : null

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
      <TextField
        label="아이디"
        floatingLabel
        autoComplete="username"
        autoCapitalize="none"
        value={loginId}
        placeholder="영문 소문자·숫자 4~20자"
        onChange={(event) => handleLoginIdChange(event.target.value)}
        onBlur={() => touch('loginId')}
        error={shown('loginId')}
        hideErrorMessage={loginIdAvailable === false || loginIdFormatTip}
        trailing={loginIdCheckStatus}
      />

      <TextField
        label="비밀번호"
        floatingLabel
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
        hideErrorMessage
        trailing={
          <FieldStatus
            label="비밀번호"
            error={shown('password')}
            valid={!!password && !validatePassword(password)}
          />
        }
      />
      <TextField
        label="비밀번호 확인"
        floatingLabel
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
        hideErrorMessage
        trailing={
          <FieldStatus
            label="비밀번호 확인"
            error={shown('passwordConfirm')}
            valid={!!passwordConfirm && passwordConfirm === password}
          />
        }
      />
      <TextField
        label="닉네임"
        floatingLabel
        autoComplete="nickname"
        value={nickname}
        placeholder="1~20자 (공백만은 불가)"
        onChange={(event) => {
          setNickname(event.target.value)
          clearError('nickname')
        }}
        onBlur={() => touch('nickname')}
        error={shown('nickname')}
        hideErrorMessage
        trailing={
          <FieldStatus
            label="닉네임"
            error={shown('nickname')}
            valid={!!nickname && !validateNickname(nickname)}
          />
        }
      />

      <hr className="border-primary-strong" />

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
        labelAddon={
          <InfoTip
            label="출산 예정일 도움말"
            text="임신 주차는 출산 예정일로 계산합니다."
          />
        }
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
      <Button
        type="submit"
        variant="brand"
        fullWidth
        disabled={signup.isPending}
      >
        {signup.isPending ? '가입 중...' : '가입하기'}
      </Button>
      <SocialLoginSection />
      <p className="text-center text-sm text-cocoa-secondary">
        이미 계정이 있나요?{' '}
        <TextLink to="/login" tone="brand">
          로그인
        </TextLink>
      </p>
    </form>
  )
}

export default SignupForm
