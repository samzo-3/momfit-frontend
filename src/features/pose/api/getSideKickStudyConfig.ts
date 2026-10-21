import { apiRequest } from '../../../shared/api/api-client'

export type SideKickStudyConfig = {
  exercise_id: number
  exercise_name: string
  steps: {
    step_no: number
    exercise_step_id: number
    step_name: string
  }[]
}

export async function getSideKickStudyConfig(): Promise<SideKickStudyConfig> {
  const config = await apiRequest<SideKickStudyConfig>(
    '/exercises/sidekick/study-config',
  )

  if (
    !Number.isInteger(config.exercise_id) ||
    config.exercise_id <= 0 ||
    config.steps.length !== 5 ||
    config.steps.some(
      (step, index) =>
        step.step_no !== index + 1 ||
        !Number.isInteger(step.exercise_step_id) ||
        step.exercise_step_id <= 0,
    ) ||
    new Set(config.steps.map((step) => step.exercise_step_id)).size !== 5
  ) {
    throw new Error('INVALID_SIDEKICK_STUDY_CONFIG')
  }

  return config
}
