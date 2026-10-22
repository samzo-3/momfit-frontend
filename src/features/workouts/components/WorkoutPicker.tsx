import { Link } from 'react-router-dom'
import { WORKOUT_MODES, WORKOUTS, type WorkoutMode } from '../workout-catalog'

interface PickerCardProps {
  title: string
  description: string
  chips: string[]
  // 없으면 아직 연결되지 않은 카드(링크가 아니고 "준비 중"으로 보인다)
  to?: string
  cta: string
}

// 이미지가 들어갈 자리. 사진이 정해지면 이 블록을 <img>로 바꾼다.
function ImagePlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-video items-center justify-center rounded-2xl bg-primary"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-10 text-brand"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m4 17 5-4 4 3 3-2 4 3" />
      </svg>
    </div>
  )
}

const CARD =
  'flex h-full flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-primary-strong'

function PickerCard({ title, description, chips, to, cta }: PickerCardProps) {
  const content = (
    <>
      <ImagePlaceholder />
      <div className="flex flex-col gap-1.5 px-1">
        <h2 className="text-xl font-semibold text-cocoa">{title}</h2>
        <p className="text-[15px] text-cocoa-secondary">{description}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-primary-strong px-1 pt-4">
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-sage"
            >
              {chip}
            </li>
          ))}
        </ul>
        {to ? (
          <span className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand group-hover:bg-brand-hover">
            {cta} →
          </span>
        ) : (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-cocoa-secondary">
            준비 중
          </span>
        )}
      </div>
    </>
  )

  return to ? (
    <Link
      to={to}
      className={`${CARD} group transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
    >
      {content}
    </Link>
  ) : (
    <div className={`${CARD} opacity-70`}>{content}</div>
  )
}

// 1단계: 운동 모드 / 자세 배우기 중 하나를 고른다. 선택은 ?mode= 로 주소에 남긴다.
export function ModeChoices() {
  return (
    <ul className="grid gap-5 lg:grid-cols-2">
      {WORKOUT_MODES.map((mode) => (
        <li key={mode.id}>
          <PickerCard
            title={mode.title}
            description={mode.description}
            chips={mode.chips}
            to={`/workouts?mode=${mode.id}`}
            cta="운동 고르기"
          />
        </li>
      ))}
    </ul>
  )
}

// 2단계: 고른 모드로 할 운동을 고른다. 아직 준비되지 않은 운동은 눌리지 않는다.
export function WorkoutChoices({ mode }: { mode: WorkoutMode }) {
  const modeInfo = WORKOUT_MODES.find((item) => item.id === mode)
  return (
    <ul className="grid gap-5 lg:grid-cols-2">
      {WORKOUTS.map((workout) => (
        <li key={workout.id}>
          <PickerCard
            title={workout.name}
            description={workout.description}
            chips={modeInfo?.chips ?? []}
            to={workout.routes?.[mode]}
            cta={modeInfo?.cta ?? '시작하기'}
          />
        </li>
      ))}
    </ul>
  )
}
