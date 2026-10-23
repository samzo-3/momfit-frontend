import { Link, useSearchParams } from 'react-router-dom'
import NoticeIcon from '../features/workouts/components/NoticeIcon'
import {
  HEALTH_NOTICE,
  ModeChoices,
  WORKOUT_MODES,
  WorkoutChoices,
  parseWorkoutMode,
} from '../features/workouts'

// 운동 고르기. 먼저 모드(운동 모드/자세 배우기)를 고르고, 그 모드로 할 운동을 고른다.
function WorkoutsPage() {
  const [searchParams] = useSearchParams()
  const mode = parseWorkoutMode(searchParams.get('mode'))
  const modeInfo = WORKOUT_MODES.find((item) => item.id === mode)

  return (
    <main className="flex-1 bg-primary-soft px-4 py-10 sm:py-12">
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col items-start gap-3">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-brand-text">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-brand"
            />
            오늘도 한 걸음
          </p>
          <h1 className="text-4xl font-semibold text-cocoa">
            {modeInfo
              ? `${modeInfo.title}, 어떤 운동을 할까요?`
              : '운동 고르기'}
          </h1>
          <p className="text-[15px] text-cocoa-secondary">
            {modeInfo
              ? '오늘 해볼 운동을 골라 주세요.'
              : '어떻게 시작할지 골라 주세요.'}
          </p>
        </header>
        {mode ? <WorkoutChoices mode={mode} /> : <ModeChoices />}
        {modeInfo ? (
          // 좁은 화면에서는 목록 아래 가운데, lg 이상에서는 머리글 줄 오른쪽 끝에 놓는다.
          <Link
            to="/workouts"
            className="self-center text-sm font-semibold text-brand-text underline underline-offset-4 lg:absolute lg:right-0 lg:top-1 lg:self-auto"
          >
            다른 모드 보기
          </Link>
        ) : null}
        <p className="flex items-center gap-2.5 rounded-xl bg-sage-soft px-4 py-3 text-sm text-cocoa-secondary ring-1 ring-primary-strong">
          <NoticeIcon />
          {HEALTH_NOTICE}
        </p>
      </div>
    </main>
  )
}

export default WorkoutsPage
