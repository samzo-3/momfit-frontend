import { Link } from 'react-router-dom'
import {
  readyPath,
  WORKOUT_MODES,
  WORKOUTS,
  type WorkoutMode,
} from '../workout-catalog'

interface PickerCardProps {
  title: string
  description: string
  chips: string[]
  image: string
  imageAlt: string
  // 없으면 아직 연결되지 않은 카드(링크가 아니고 "준비 중"으로 보인다)
  to?: string
  cta: string
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      // 첫 화면 밖의 사진은 보일 때 받는다.
      loading="lazy"
      className="aspect-video w-full rounded-2xl object-cover"
    />
  )
}

const CARD =
  'flex h-full flex-col gap-4 rounded-3xl bg-white p-5 ring-1 ring-primary-strong'

function PickerCard({
  title,
  description,
  chips,
  image,
  imageAlt,
  to,
  cta,
}: PickerCardProps) {
  const content = (
    <>
      <CardImage src={image} alt={imageAlt} />
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
            image={mode.image}
            imageAlt={mode.imageAlt}
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
            image={workout.image}
            imageAlt={workout.imageAlt}
            to={workout.routes ? readyPath(workout.id, mode) : undefined}
            cta={modeInfo?.cta ?? '시작하기'}
          />
        </li>
      ))}
    </ul>
  )
}
