import { apiRequest } from '../../../shared/api/api-client'

export type ExerciseRecordStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'

export type ExerciseRecordResponse = {
  id: number
  user_id: number
  exercise_id: number
  exercise_criteria_version_id: number
  total_score: string
  status: ExerciseRecordStatus
  started_at: string
  ended_at: string | null
  is_completed: boolean
  created_at: string
  modified_at: string
}

function validateRecordId(recordId: number): void {
  if (!Number.isSafeInteger(recordId) || recordId <= 0) {
    throw new Error('INVALID_EXERCISE_RECORD_ID')
  }
}

function validateCompletedSets(completedSets: number): void {
  if (
    !Number.isSafeInteger(completedSets) ||
    completedSets < 0 ||
    completedSets > 10
  ) {
    throw new Error('INVALID_COMPLETED_SETS')
  }
}

// 최초 운동 시작: exercise_records 신규 생성
export function startSideKickExercise() {
  return apiRequest<ExerciseRecordResponse>('/exercise-records', {
    method: 'POST',
    body: {
      exercise_id: 1,
    },
  })
}

// 자동 또는 수동 일시 정지: 기존 기록 업데이트
export function pauseSideKickExercise(recordId: number, completedSets: number) {
  validateRecordId(recordId)
  validateCompletedSets(completedSets)

  return apiRequest<ExerciseRecordResponse>(
    `/exercise-records/${recordId}/pause`,
    {
      method: 'PATCH',
      body: {
        completed_sets: completedSets,
      },
    },
  )
}

// 이어하기: 동일한 기록 ID 유지
export function resumeSideKickExercise(recordId: number) {
  validateRecordId(recordId)

  return apiRequest<ExerciseRecordResponse>(
    `/exercise-records/${recordId}/resume`,
    {
      method: 'PATCH',
    },
  )
}

// 운동 종료: 서버가 최종 누적 점수 계산
export function completeSideKickExercise(
  recordId: number,
  completedSets: number,
) {
  validateRecordId(recordId)
  validateCompletedSets(completedSets)

  return apiRequest<ExerciseRecordResponse>(
    `/exercise-records/${recordId}/complete`,
    {
      method: 'PATCH',
      body: {
        completed_sets: completedSets,
      },
    },
  )
}

// 저장된 운동 기록 확인
export function getSideKickExerciseRecord(recordId: number) {
  validateRecordId(recordId)

  return apiRequest<ExerciseRecordResponse>(`/exercise-records/${recordId}`, {
    method: 'GET',
  })
}
