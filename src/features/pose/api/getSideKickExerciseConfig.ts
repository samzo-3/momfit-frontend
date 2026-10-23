import { apiRequest } from '../../../shared/api/api-client'

export type SideKickExerciseConfig = {
  exercise_id: number
  exercise_name: string
}

export async function getSideKickExerciseConfig(): Promise<SideKickExerciseConfig> {
  const config = await apiRequest<SideKickExerciseConfig>(
    '/exercises/sidekick/exercise-config',
  )

  if (
    !Number.isInteger(config.exercise_id) ||
    config.exercise_id <= 0 ||
    typeof config.exercise_name !== 'string' ||
    config.exercise_name.trim() !== 'Side Kick'
  ) {
    throw new Error('INVALID_SIDEKICK_EXERCISE_CONFIG')
  }

  return config
}
