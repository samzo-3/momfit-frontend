import { apiRequest } from '../../../shared/api/api-client'
import type { StudyStepRecord } from '../analyzers/sideKick/side-kick-study'

type StoredStatus = 'PASS' | 'NON_PASS' | 'NOT_EVALUATED'

export type SavedStepRecord = {
  id: number
  user_id: number
  exercise_id: number
  exercise_step_id: number
  status: StoredStatus
  step_score: string | null
}

export async function saveSideKickStep(
  record: StudyStepRecord,
  feedbackCodes: string[],
  exerciseId: number,
  stepId: number,
): Promise<SavedStepRecord> {
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    throw new Error('INVALID_EXERCISE_ID')
  }
  if (!Number.isInteger(stepId) || stepId <= 0) {
    throw new Error('INVALID_EXERCISE_STEP_ID')
  }

  // 추적 실패 등으로 실제 점수가 없으면 자세 실패로 저장하지 않는다.
  const status: StoredStatus =
    record.stepScore === null ? 'NOT_EVALUATED' : record.status

  return apiRequest<SavedStepRecord>('/exercise-step-records', {
    method: 'POST',
    body: {
      exercise_id: exerciseId,
      exercise_step_id: stepId,
      status,
      step_score: record.stepScore,
      step_report: {
        schema_version: 1,
        measurement_profile_version: 'side_step_front_2d_v1',
        tracking_info: {
          camera_view: 'FRONT',
          coordinate_system: 'IMAGE_NORMALIZED_2D',
          tracking_status:
            status === 'NOT_EVALUATED' ? 'NOT_EVALUATED' : 'TRACKING_OK',
        },
        evaluation_result: {
          status,
          feedback_count: record.feedbackCount,
          feedback_codes: feedbackCodes,
        },
      },
    },
  })
}
