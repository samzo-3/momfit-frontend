import { apiRequest } from '../../../shared/api'

export type ExerciseRecordStatus = 'in_progress' | 'paused' | 'completed'

// 캘린더용 요약. date는 서버가 KST 기준으로 계산한 "YYYY-MM-DD"다.
export interface ExerciseRecordSummary {
  id: number
  exerciseId: number
  status: ExerciseRecordStatus
  isCompleted: boolean
  date: string
}

interface ExerciseRecordSummaryResponse {
  id: number
  exercise_id: number
  status: ExerciseRecordStatus
  is_completed: boolean
  date: string
}

// from·to는 "YYYY-MM-DD"(양 끝 포함). 서버는 한 번에 62일까지만 허용한다.
export async function getExerciseRecords(
  from: string,
  to: string,
): Promise<ExerciseRecordSummary[]> {
  const { items } = await apiRequest<{
    items: ExerciseRecordSummaryResponse[]
  }>('/exercise-records', { query: { from, to } })
  return items.map((item) => ({
    id: item.id,
    exerciseId: item.exercise_id,
    status: item.status,
    isCompleted: item.is_completed,
    date: item.date,
  }))
}
