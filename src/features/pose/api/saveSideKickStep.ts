import { apiRequest } from '../../../shared/api/api-client'
import type {
  FlowRecord,
  StepOutcome,
} from '../analyzers/sideKick/side-kick-study-flow'

export type StoredStepResultStatus = StepOutcome

export type SideKickStepRecordSaveInput = {
  record: FlowRecord
  exerciseId: number
  exerciseStepId: number
  exerciseCriteriaVersionId: number
  criteriaVersion: string
  stepSessionId: string
  measurementProfileVersion: string
}

export type SideKickStepRecordPayload = {
  exercise_id: number
  exercise_step_id: number
  exercise_criteria_version_id: number
  criteria_version: string
  step_session_id: string
  step_result_status: StoredStepResultStatus
  step_report: {
    schema_version: number
    measurement_profile_version: string
    criteria_version: string
    evaluation_result: {
      status: StoredStepResultStatus
      feedback_count: number
    }
  }
}

export type SavedStepRecord = {
  id: number
  user_id: number
  exercise_id: number
  exercise_step_id: number
  status: 'in_progress' | 'completed'
  step_score: string | null
  step_result_status: StoredStepResultStatus
  exercise_criteria_version_id: number
  step_session_id: string
}

function validPositiveId(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

function validSessionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function buildSideKickStepRecordPayload(
  input: SideKickStepRecordSaveInput,
): SideKickStepRecordPayload {
  if (!validPositiveId(input.exerciseId)) {
    throw new Error('INVALID_EXERCISE_ID')
  }
  if (!validPositiveId(input.exerciseStepId)) {
    throw new Error('INVALID_EXERCISE_STEP_ID')
  }
  if (!validPositiveId(input.exerciseCriteriaVersionId)) {
    throw new Error('INVALID_EXERCISE_CRITERIA_VERSION_ID')
  }
  if (!input.criteriaVersion.trim()) {
    throw new Error('INVALID_CRITERIA_VERSION')
  }
  if (!validSessionId(input.stepSessionId)) {
    throw new Error('INVALID_STEP_SESSION_ID')
  }
  if (!input.measurementProfileVersion.trim()) {
    throw new Error('INVALID_MEASUREMENT_PROFILE_VERSION')
  }

  return {
    exercise_id: input.exerciseId,
    exercise_step_id: input.exerciseStepId,
    exercise_criteria_version_id: input.exerciseCriteriaVersionId,
    criteria_version: input.criteriaVersion,
    step_session_id: input.stepSessionId,
    step_result_status: input.record.outcome,
    step_report: {
      schema_version: 1,
      measurement_profile_version: input.measurementProfileVersion,
      criteria_version: input.criteriaVersion,
      evaluation_result: {
        status: input.record.outcome,
        feedback_count: input.record.feedbackCount,
      },
    },
  }
}

export async function saveSideKickStep(
  input: SideKickStepRecordSaveInput,
): Promise<SavedStepRecord> {
  const body = buildSideKickStepRecordPayload(input)

  return apiRequest<SavedStepRecord>('/exercise-step-records', {
    method: 'POST',
    body,
  })
}
