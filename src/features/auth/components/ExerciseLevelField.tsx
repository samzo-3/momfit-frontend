import Notice from '../../../shared/components/Notice'
import { EXERCISE_LEVELS } from '../exercise-levels'
import type { ExerciseLevel } from '../types'

interface ExerciseLevelFieldProps {
  value: ExerciseLevel | ''
  onChange: (level: ExerciseLevel) => void
  error?: string | null
}

// 알약 모양이지만 실제로는 라디오 그룹이다. 가입과 내 정보에서 함께 쓴다.
function ExerciseLevelField({
  value,
  onChange,
  error,
}: ExerciseLevelFieldProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">운동 경험</legend>
      <div className="flex gap-2">
        {EXERCISE_LEVELS.map((level) => (
          <label key={level.value} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name="exerciseLevel"
              value={level.value}
              checked={value === level.value}
              onChange={() => onChange(level.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-primary-strong px-4 py-2.5 text-center transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
              {level.label}
            </span>
          </label>
        ))}
      </div>
      {error && <Notice kind="error">{error}</Notice>}
    </fieldset>
  )
}

export default ExerciseLevelField
