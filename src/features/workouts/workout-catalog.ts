export type WorkoutMode = 'exercise' | 'study'

export interface WorkoutModeInfo {
  id: WorkoutMode
  title: string
  description: string
  // 카드 아래 알약. 운동 선택 단계에서도 고른 모드의 칩과 버튼 문구를 쓴다.
  chips: string[]
  cta: string
}

export interface WorkoutInfo {
  id: string
  name: string
  description: string
  // 모드별 화면 경로. 아직 구현되지 않은 운동은 비워 둔다(준비 중으로 표시).
  routes?: Record<WorkoutMode, string>
}

export const WORKOUT_MODES: WorkoutModeInfo[] = [
  {
    id: 'exercise',
    title: '운동 모드',
    description: '웹캠으로 내 모습을 보며 트레이너 영상을 따라 운동해요.',
    chips: ['웹캠 화면 보기', '내 속도로 운동'],
    cta: '운동 시작하기',
  },
  {
    id: 'study',
    title: '자세 배우기',
    description: '동작을 단계별로 익히며 음성 코칭을 받아요.',
    chips: ['단계별 코칭', '음성 안내'],
    cta: '자세 배우기',
  },
]

// 두 번째 운동은 이름과 경로가 정해지면 이 목록의 항목을 채운다.
export const WORKOUTS: WorkoutInfo[] = [
  {
    id: 'sidekick',
    name: 'Side Kick',
    description: '사이드킥과 사이드 벤드 동작으로 구성된 운동이에요.',
    routes: {
      exercise: '/workouts/sidekick/exercise',
      study: '/workouts/sidekick/study',
    },
  },
  {
    id: 'coming-soon',
    name: '준비 중인 운동',
    description: '곧 만나볼 수 있어요.',
  },
]

export function parseWorkoutMode(value: string | null): WorkoutMode | null {
  return WORKOUT_MODES.find((mode) => mode.id === value)?.id ?? null
}

export const HEALTH_NOTICE =
  '운동을 시작하기 전에 개인의 건강 상태와 의료진의 운동 제한 권고를 확인해 주세요.'
