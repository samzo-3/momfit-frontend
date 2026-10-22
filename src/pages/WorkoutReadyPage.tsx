import { Navigate, useParams } from 'react-router-dom'
import {
  WORKOUT_MODES,
  WORKOUTS,
  WorkoutReady,
  parseWorkoutMode,
} from '../features/workouts'

// 운동·모드를 고른 뒤 운동 화면으로 가기 전의 준비 페이지.
// 모르는 운동·모드이거나 아직 연결되지 않은 운동이면 운동 고르기로 돌려보낸다.
function WorkoutReadyPage() {
  const { workoutId, mode: modeParam } = useParams()
  const mode = parseWorkoutMode(modeParam ?? null)
  const workout = WORKOUTS.find((item) => item.id === workoutId)
  const modeInfo = WORKOUT_MODES.find((item) => item.id === mode)
  const destination = mode ? workout?.routes?.[mode] : undefined

  if (!workout || !modeInfo || !destination) {
    return <Navigate to="/workouts" replace />
  }

  return (
    <WorkoutReady
      // 다른 운동·모드로 바뀌면 체크 상태를 새로 시작한다.
      key={`${workout.id}-${modeInfo.id}`}
      workout={workout}
      modeInfo={modeInfo}
      destination={destination}
      backTo={`/workouts?mode=${modeInfo.id}`}
    />
  )
}

export default WorkoutReadyPage
