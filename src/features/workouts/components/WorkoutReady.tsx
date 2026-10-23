import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../../shared/components/Button'
import readyWorkoutImage from '../assets/ready-workout.jpg'
import {
  HEALTH_NOTICE,
  SAFETY_NOTICE,
  type WorkoutInfo,
  type WorkoutModeInfo,
} from '../workout-catalog'

interface WorkoutReadyProps {
  workout: WorkoutInfo
  modeInfo: WorkoutModeInfo
  // 모든 항목을 체크한 뒤 이동할 경로(촬영 환경 점검 화면)
  destination: string
  // 되돌아갈 운동 고르기 경로(?mode= 포함)
  backTo: string
}

// 운동 전 준비 페이지. 체크 상태는 이 화면 안에서만 들고 저장하지 않는다.
// 카메라는 여기서 켜지 않고, 이어지는 환경 점검 화면이 열릴 때 권한을 요청한다.
function WorkoutReady({
  workout,
  modeInfo,
  destination,
  backTo,
}: WorkoutReadyProps) {
  const navigate = useNavigate()
  const hintId = useId()
  const items = modeInfo.checklist
  const [checked, setChecked] = useState<boolean[]>(() =>
    items.map(() => false),
  )
  const doneCount = checked.filter(Boolean).length
  const allDone = doneCount === items.length

  function toggle(index: number) {
    setChecked((current) => current.map((v, i) => (i === index ? !v : v)))
  }

  return (
    <main className="flex-1 bg-primary-soft px-4 py-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col items-start gap-3">
          <Link
            to={backTo}
            className="text-sm font-semibold text-brand-text underline underline-offset-4"
          >
            ← 운동 고르기
          </Link>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-brand-text">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-brand"
            />
            {workout.name} · {modeInfo.title}
          </p>
          <h1 className="text-4xl font-semibold text-cocoa">
            운동 환경을 준비해 볼까요?
          </h1>
          <p className="text-[15px] text-cocoa-secondary">
            편안하게 움직일 수 있는 공간을 확인하고 운동을 준비해요.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <img
            src={readyWorkoutImage}
            alt="운동 공간을 준비하며 요가 매트와 물병을 챙기는 임산부"
            // 좁은 화면에서는 숨겨지므로(display:none) lazy로 두어 받지 않게 한다.
            loading="lazy"
            className="hidden min-h-72 h-full w-full rounded-3xl object-cover lg:block"
          />

          <section
            aria-labelledby="ready-title"
            className="flex flex-col gap-5 rounded-3xl bg-white p-6 ring-1 ring-primary-strong"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="ready-title" className="text-xl font-semibold text-cocoa">
                운동 전 준비사항
              </h2>
              <span
                role="status"
                className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-brand-text"
              >
                체크 완료 {doneCount}/{items.length}
              </span>
            </div>

            <ul className="flex flex-col gap-2.5">
              {items.map((item, index) => (
                <li key={item}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-cocoa ${checked[index] ? 'bg-primary' : 'bg-primary-soft'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked[index]}
                      onChange={() => toggle(index)}
                      className="size-5 shrink-0 accent-brand-text"
                    />
                    {item}
                  </label>
                </li>
              ))}
            </ul>

            <p className="text-sm text-cocoa-secondary">
              다음 화면에서 카메라 권한을 요청하고 촬영 환경을 확인해요. 카메라
              영상은 서버로 보내거나 저장하지 않아요.
            </p>

            <div className="flex flex-col items-center gap-2">
              <Button
                variant="brand"
                fullWidth
                disabled={!allDone}
                aria-describedby={allDone ? undefined : hintId}
                onClick={() => navigate(destination)}
              >
                촬영 환경 확인하기 →
              </Button>
              {/* 문구가 나타나고 사라져도 카드 높이가 변하지 않도록 자리는 항상 두고 숨기기만 한다. */}
              <p
                id={hintId}
                className={`text-xs text-cocoa-secondary ${allDone ? 'invisible' : ''}`}
              >
                모든 항목을 체크하면 이동할 수 있어요.
              </p>
            </div>
          </section>
        </div>

        <p className="flex flex-col gap-1 rounded-xl bg-sage-soft px-4 py-3 text-sm text-cocoa-secondary ring-1 ring-primary-strong sm:flex-row sm:items-center sm:gap-3">
          <span className="font-semibold text-cocoa">{SAFETY_NOTICE}</span>
          <span>{HEALTH_NOTICE}</span>
        </p>
      </div>
    </main>
  )
}

export default WorkoutReady
