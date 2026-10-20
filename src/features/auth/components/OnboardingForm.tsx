import { useState, type FormEvent } from 'react'
import { ApiError } from '../../../shared/api'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextField from '../../../shared/components/TextField'
import { loadSession } from '../auth-session'
import { errorMessage, serverFieldErrors } from '../form-errors'
import { useCompleteOnboarding } from '../hooks/useAuthMutations'
import type { ExerciseLevel, User } from '../types'
import { dueDateRange, validateDueDate, validateNickname } from '../validation'
import ConsentFields from './ConsentFields'
import ExerciseLevelField from './ExerciseLevelField'

type Errors = Partial<
  Record<'nickname' | 'dueDate' | 'exerciseLevel' | 'consents', string>
>

// 카카오로 처음 가입한 사용자가 동의와 초기 프로필을 제출한다.
// 성공하면 현재 사용자가 갱신되고, 라우트 가드가 홈으로 이동시킨다.
function OnboardingForm({ user }: { user: User }) {
  // 카카오에서 받은 닉네임을 기본값으로 채워 둔다.
  const [nickname, setNickname] = useState(user.nickname)
  const [dueDate, setDueDate] = useState('')
  const [exerciseLevel, setExerciseLevel] = useState<ExerciseLevel | ''>('')
  const [terms, setTerms] = useState(false)
  const [healthData, setHealthData] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const onboarding = useCompleteOnboarding()
  const range = dueDateRange()

  function clear(name: keyof Errors) {
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next: Errors = {}
    const nicknameError = validateNickname(nickname)
    if (nicknameError) next.nickname = nicknameError
    const dueDateError = validateDueDate(dueDate)
    if (dueDateError) next.dueDate = dueDateError
    if (!exerciseLevel) next.exerciseLevel = '운동 경험을 선택해 주세요.'
    if (!terms || !healthData) next.consents = '필수 항목에 모두 동의해 주세요.'
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0 || !exerciseLevel) return

    onboarding.mutate(
      {
        nickname: nickname.trim(),
        dueDate,
        exerciseLevel,
        consents: { terms, healthData },
      },
      {
        onError: (error) => {
          if (
            error instanceof ApiError &&
            error.code === 'ONBOARDING_ALREADY_COMPLETED'
          ) {
            // 다른 탭 등에서 이미 마쳤다면 최신 상태를 불러와 홈으로 보낸다.
            void loadSession().catch(() => {})
            return
          }
          const fields = serverFieldErrors(error)
          if (Object.keys(fields).length > 0) setErrors(fields)
          else setFormError(errorMessage(error))
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <TextField
        label="닉네임"
        autoComplete="nickname"
        value={nickname}
        onChange={(event) => {
          setNickname(event.target.value)
          clear('nickname')
        }}
        error={errors.nickname}
      />
      <TextField
        label="출산 예정일"
        type="date"
        min={range.min}
        max={range.max}
        value={dueDate}
        onChange={(event) => {
          setDueDate(event.target.value)
          clear('dueDate')
        }}
        error={errors.dueDate}
        hint="임신 주차는 출산 예정일로 계산합니다."
      />
      <ExerciseLevelField
        value={exerciseLevel}
        onChange={(level) => {
          setExerciseLevel(level)
          clear('exerciseLevel')
        }}
        error={errors.exerciseLevel}
      />
      <ConsentFields
        terms={terms}
        healthData={healthData}
        onTermsChange={(checked) => {
          setTerms(checked)
          clear('consents')
        }}
        onHealthDataChange={(checked) => {
          setHealthData(checked)
          clear('consents')
        }}
        error={errors.consents}
      />
      <p className="text-xs text-ink-secondary">
        MomFit은 의학적 진단이나 치료를 대신하지 않습니다. 운동을 시작하기 전에
        담당 전문의와 상담하세요.
      </p>

      {formError && <Notice kind="error">{formError}</Notice>}
      <Button type="submit" fullWidth disabled={onboarding.isPending}>
        {onboarding.isPending ? '저장 중...' : '시작하기'}
      </Button>
    </form>
  )
}

export default OnboardingForm
