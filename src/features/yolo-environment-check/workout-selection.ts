import type { ExerciseMode } from './types'

/**
 * 환경 점검과 실제 운동 Runtime을 연결하는 최소 공통 세션 정보다.
 * 현재는 화면 전환 시 카메라를 종료·재시작한다. 향후 ByteTrack을 도입하면 이 타입을
 * 공통 운동 세션의 trackId/stream 소유권으로 확장하되 detectionId와 혼동하지 않는다.
 */
export type WorkoutSelection = {
  mode: ExerciseMode
  exerciseSlug: 'sidekick'
  exerciseId?: number
}

export function parseSideKickMode(
  value: string | undefined,
): ExerciseMode | null {
  return value === 'study' ? 'STUDY' : value === 'exercise' ? 'EXERCISE' : null
}
