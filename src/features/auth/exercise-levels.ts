import type { ExerciseLevel } from './types'

// 서버 값(low/medium/high)과 화면 표시(하/중/상)
export const EXERCISE_LEVELS: { value: ExerciseLevel; label: string }[] = [
  { value: 'low', label: '하' },
  { value: 'medium', label: '중' },
  { value: 'high', label: '상' },
]

export function exerciseLevelLabel(level: ExerciseLevel | null): string {
  return EXERCISE_LEVELS.find((item) => item.value === level)?.label ?? '-'
}
