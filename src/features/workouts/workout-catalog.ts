import comingSoonImage from './assets/coming-soon.jpg'
import exerciseModeImage from './assets/mode-exercise.jpg'
import studyModeImage from './assets/mode-study.jpg'
import sideKickImage from './assets/sidekick.jpg'

export type WorkoutMode = 'exercise' | 'study'

export interface WorkoutModeInfo {
  id: WorkoutMode
  title: string
  description: string
  // 카드 아래 알약. 운동 선택 단계에서도 고른 모드의 칩과 버튼 문구를 쓴다.
  chips: string[]
  cta: string
  // 운동 전 준비 페이지의 체크리스트. 모두 체크해야 다음(환경 점검) 화면으로 이동할 수 있다.
  checklist: string[]
  image: string
  imageAlt: string
}

export interface WorkoutInfo {
  id: string
  name: string
  description: string
  // 모드별 화면 경로. 아직 구현되지 않은 운동은 비워 둔다(준비 중으로 표시).
  routes?: Record<WorkoutMode, string>
  image: string
  imageAlt: string
}

export const WORKOUT_MODES: WorkoutModeInfo[] = [
  {
    id: 'exercise',
    title: '운동 모드',
    description: '웹캠으로 내 모습을 보며 트레이너 영상을 따라 운동해요.',
    chips: ['웹캠 화면 보기', '내 속도로 운동'],
    cta: '운동 시작하기',
    checklist: [
      '주변에 충분한 공간을 확보했어요.',
      '편안한 운동복과 물을 준비했어요.',
      '웹캠에 온몸이 보이도록 기기를 세웠어요.',
      '무리하지 않고 필요할 때 쉴게요.',
    ],
    image: exerciseModeImage,
    imageAlt: '집에서 웹캠 운동을 위해 옆으로 스트레칭하는 임산부',
  },
  {
    id: 'study',
    title: '자세 배우기',
    description: '동작을 단계별로 익히며 음성 코칭을 받아요.',
    chips: ['단계별 코칭', '음성 안내'],
    cta: '자세 배우기',
    checklist: [
      '주변에 충분한 공간을 확보했어요.',
      '편안한 운동복과 물을 준비했어요.',
      '기기 소리를 켰어요. 음성으로 코칭해 드려요.',
      '무리하지 않고 필요할 때 쉴게요.',
    ],
    image: studyModeImage,
    imageAlt: '태블릿으로 음성 코칭을 들으며 스트레칭하는 임산부',
  },
]

// 두 번째 운동은 이름과 경로가 정해지면 이 목록의 항목을 채운다.
export const WORKOUTS: WorkoutInfo[] = [
  {
    id: 'sidekick',
    name: 'Side Kick',
    description: '사이드킥과 사이드 벤드 동작으로 구성된 운동이에요.',
    routes: {
      exercise: '/workouts/sidekick/check/exercise',
      study: '/workouts/sidekick/check/study',
    },
    image: sideKickImage,
    imageAlt: '집에서 사이드킥 동작을 하는 임산부',
  },
  {
    id: 'coming-soon',
    name: '준비 중인 운동',
    description: '곧 만나볼 수 있어요.',
    image: comingSoonImage,
    imageAlt: '다음 운동을 준비하는 요가 매트와 물병',
  },
]

export function parseWorkoutMode(value: string | null): WorkoutMode | null {
  return WORKOUT_MODES.find((mode) => mode.id === value)?.id ?? null
}

export const HEALTH_NOTICE =
  '운동을 시작하기 전에 개인의 건강 상태와 의료진의 운동 제한 권고를 확인해 주세요.'

export const SAFETY_NOTICE =
  '호흡이 가빠지거나 당김이 느껴지면 즉시 휴식을 취해 주세요.'

// 운동 카드를 누르면 바로 운동 화면이 아니라 이 준비 페이지로 간다.
export function readyPath(workoutId: string, mode: WorkoutMode): string {
  return `/workouts/${workoutId}/${mode}/ready`
}

// 운동을 마치거나 중간에 나갔을 때 가는 마무리 화면. 이동할 때 outcome을 state로 넘긴다.
export const WORKOUT_COMPLETE_PATH = '/workouts/complete'

export type WorkoutOutcome = 'completed' | 'stopped'

export interface WorkoutCompleteState {
  outcome: WorkoutOutcome
  // 끝난 운동 모드. 마무리 문구를 모드에 맞춘다.
  mode?: WorkoutMode
  // 운동 모드에서 해낸 세트 수
  completedSets?: number
}

export function parseWorkoutCompleteState(
  value: unknown,
): WorkoutCompleteState | null {
  const state = value as {
    outcome?: unknown
    mode?: unknown
    completedSets?: unknown
  } | null
  if (state?.outcome !== 'completed' && state?.outcome !== 'stopped') {
    return null
  }

  return {
    outcome: state.outcome,
    mode:
      parseWorkoutMode(typeof state.mode === 'string' ? state.mode : null) ??
      undefined,
    completedSets:
      typeof state.completedSets === 'number' &&
      Number.isInteger(state.completedSets) &&
      state.completedSets >= 0
        ? state.completedSets
        : undefined,
  }
}
