import { useState, type FormEvent } from 'react'
import Button from '../../../shared/components/Button'
import Notice from '../../../shared/components/Notice'
import TextField from '../../../shared/components/TextField'
import { errorMessage, serverFieldErrors } from '../form-errors'
import { useUpdateProfile } from '../hooks/useAuthMutations'
import type { ExerciseLevel, ProfilePatch, User } from '../types'
import { dueDateRange, validateDueDate, validateNickname } from '../validation'
import ExerciseLevelField from './ExerciseLevelField'

type Errors = Partial<Record<'nickname' | 'dueDate' | 'exerciseLevel', string>>

// 바뀐 항목만 골라 PATCH로 보낸다. 바뀌지 않은 항목은 검증하지 않는다.
// (출산 예정일이 이미 지난 사용자가 닉네임만 고칠 수 있어야 하기 때문이다.)
function changedFields(
  user: User,
  values: {
    nickname: string
    dueDate: string
    exerciseLevel: ExerciseLevel | ''
  },
): ProfilePatch {
  const patch: ProfilePatch = {}
  if (values.nickname.trim() !== user.nickname) {
    patch.nickname = values.nickname.trim()
  }
  if (values.dueDate && values.dueDate !== user.dueDate) {
    patch.dueDate = values.dueDate
  }
  if (values.exerciseLevel && values.exerciseLevel !== user.exerciseLevel) {
    patch.exerciseLevel = values.exerciseLevel
  }
  return patch
}

interface ProfileFormProps {
  user: User
  onSaved: () => void
  onCancel: () => void
}

// 수정 폼. 저장하거나 취소하면 부모가 조회 화면으로 되돌린다.
function ProfileForm({ user, onSaved, onCancel }: ProfileFormProps) {
  const [nickname, setNickname] = useState(user.nickname)
  const [dueDate, setDueDate] = useState(user.dueDate ?? '')
  const [exerciseLevel, setExerciseLevel] = useState<ExerciseLevel | ''>(
    user.exerciseLevel ?? '',
  )
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const updateProfile = useUpdateProfile()
  const range = dueDateRange()

  const patch = changedFields(user, { nickname, dueDate, exerciseLevel })
  const hasChanges = Object.keys(patch).length > 0

  function edit(clear: keyof Errors) {
    setErrors((current) => ({ ...current, [clear]: undefined }))
    setFormError(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!hasChanges) return

    const next: Errors = {}
    if (patch.nickname !== undefined) {
      const invalid = validateNickname(patch.nickname)
      if (invalid) next.nickname = invalid
    }
    if (patch.dueDate !== undefined) {
      const invalid = validateDueDate(patch.dueDate)
      if (invalid) next.dueDate = invalid
    }
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0) return

    updateProfile.mutate(patch, {
      onSuccess: onSaved,
      onError: (error) => {
        const fields = serverFieldErrors(error)
        if (Object.keys(fields).length > 0) setErrors(fields)
        else setFormError(errorMessage(error))
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 lg:grid-cols-2 lg:gap-x-6"
      noValidate
    >
      <h2 className="hidden text-xl font-semibold lg:col-span-2 lg:block">
        정보 수정
      </h2>
      <TextField
        label="닉네임"
        autoComplete="nickname"
        autoFocus
        value={nickname}
        placeholder="1~20자 (공백만은 불가)"
        onChange={(event) => {
          setNickname(event.target.value)
          edit('nickname')
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
          edit('dueDate')
        }}
        error={errors.dueDate}
        hint="임신 주차는 출산 예정일로 계산합니다."
      />
      <div className="lg:col-span-2">
        <ExerciseLevelField
          value={exerciseLevel}
          onChange={(level) => {
            setExerciseLevel(level)
            edit('exerciseLevel')
          }}
          error={errors.exerciseLevel}
        />
      </div>

      {formError && (
        <div className="lg:col-span-2">
          <Notice kind="error">{formError}</Notice>
        </div>
      )}
      <div className="flex gap-2 lg:col-span-2 lg:justify-end">
        <Button
          type="submit"
          className="flex-1 lg:flex-none lg:px-10"
          disabled={!hasChanges || updateProfile.isPending}
        >
          {updateProfile.isPending ? '저장 중...' : '저장'}
        </Button>
        <Button
          variant="secondary"
          className="flex-1 lg:flex-none lg:px-10"
          onClick={onCancel}
          disabled={updateProfile.isPending}
        >
          취소
        </Button>
      </div>
    </form>
  )
}

export default ProfileForm
