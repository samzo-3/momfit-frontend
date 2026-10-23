import { apiRequest } from '../../../shared/api/api-client'

export type SideKickStudyConfig = {
  exercise_id: number
  exercise_name: string
  exercise_criteria_version_id: number
  criteria_version: string
  steps: {
    step_no: number
    exercise_step_id: number
    step_name: string
  }[]
}

export function matchesSideKickRuntimeCriteriaVersion(
  config: SideKickStudyConfig,
  runtimeCriteriaVersion: string | null,
): boolean {
  return (
    runtimeCriteriaVersion !== null &&
    runtimeCriteriaVersion === config.criteria_version
  )
}

export async function getSideKickStudyConfig(): Promise<SideKickStudyConfig> {
  const config = await apiRequest<SideKickStudyConfig>(
    '/exercises/sidekick/study-config',
  )

  if (
    !Number.isInteger(config.exercise_id) ||
    config.exercise_id <= 0 ||
    !Number.isInteger(config.exercise_criteria_version_id) ||
    config.exercise_criteria_version_id <= 0 ||
    typeof config.criteria_version !== 'string' ||
    config.criteria_version.trim().length === 0 ||
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
