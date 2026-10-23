import { Navigate, useLocation } from 'react-router-dom'
import ButtonLink from '../shared/components/ButtonLink'
import TextLink from '../shared/components/TextLink'
import NoticeIcon from '../features/workouts/components/NoticeIcon'
import {
  parseWorkoutCompleteState,
  type WorkoutCompleteState,
} from '../features/workouts/workout-catalog'

const STOPPED_COPY = {
  title: '오늘은 여기까지 해요',
  description: '운동을 중간에 멈춰도 괜찮아요. 내 몸의 컨디션이 가장 중요해요.',
} as const

// 끝난 모드에 맞춰 설명 줄을 나눈다. 제목은 같다.
function completedDescription(state: WorkoutCompleteState): string {
  if (state.mode === 'study') {
    return '자세 배우기를 마쳤어요. 오늘 익힌 동작을 기록에서 확인해 보세요.'
  }
  if (state.mode === 'exercise' && state.completedSets) {
    return `오늘 ${state.completedSets}세트를 해냈어요. 수고하셨어요.`
  }
  return '수고하셨어요. 오늘의 운동 기록을 확인해 볼까요?'
}

// 운동 화면에서 나온 뒤 보는 마무리 화면. 운동 화면에서 넘겨준 결과가 없으면(주소로 직접 접근) 운동 고르기로 보낸다.
function WorkoutCompletePage() {
  const { state } = useLocation()
  const complete = parseWorkoutCompleteState(state)
  if (!complete) return <Navigate to="/workouts" replace />

  const copy =
    complete.outcome === 'stopped'
      ? STOPPED_COPY
      : {
          title: '오늘의 움직임을 마쳤어요!',
          description: completedDescription(complete),
        }

  return (
    <main className="flex flex-1 bg-primary-soft px-4 py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-primary text-brand-text"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-cocoa">{copy.title}</h1>
          <p className="text-[15px] text-cocoa-secondary">{copy.description}</p>
        </div>

        <div className="flex w-full flex-col items-center gap-4 rounded-3xl bg-white p-6 ring-1 ring-primary-strong">
          <ButtonLink to="/records" replace variant="brand" className="w-full">
            나의 운동 기록 보기 →
          </ButtonLink>
          <TextLink to="/home" replace tone="brand" className="text-sm">
            홈으로
          </TextLink>
        </div>

        <div className="flex items-center gap-2.5 text-sm text-cocoa-secondary">
          <NoticeIcon />
          <p>
            운동을 중단한 날도 기록할 수 있습니다. 내 몸의 상태를 존중하는 것이
            우선이에요.
          </p>
        </div>
      </div>
    </main>
  )
}

export default WorkoutCompletePage
