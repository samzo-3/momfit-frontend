import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../shared/components/Button'
import StatusIcon from '../shared/components/StatusIcon'
import { ENVIRONMENT_CHECK_CONFIG } from '../features/yolo-environment-check/environment-policy'
import {
  HEALTH_NOTICE,
  SAFETY_NOTICE,
} from '../features/workouts/workout-catalog'
import {
  parseSideKickMode,
  type WorkoutSelection,
} from '../features/yolo-environment-check/workout-selection'
import { useEnvironmentCheck } from '../features/yolo-environment-check/use-environment-check'

type CheckKind = 'success' | 'error' | 'loading'

/** 사용자용 화면: 개발 JSON·bbox·관절 좌표를 노출하거나 저장하지 않고 공통 추론 훅만 재사용한다. */
export default function SideKickEnvironmentCheckPage({
  devOnly = false,
}: {
  devOnly?: boolean
}) {
  const { mode: modeParam } = useParams()
  const mode = parseSideKickMode(modeParam)
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const selection: WorkoutSelection | null = mode
    ? { mode, exerciseSlug: 'sidekick' }
    : null
  const environment = useEnvironmentCheck({
    videoRef,
    enabled: Boolean(selection && cameraReady),
    onReady: () => {
      // hook cleanup이 추론과 스트림을 종료한 뒤 기존 Side Kick Runtime이 새 스트림을 소유한다.
      const destination = selection?.mode === 'STUDY' ? 'study' : 'exercise'
      navigate(
        devOnly
          ? `/dev/sidekick/${destination}`
          : `/workouts/sidekick/${destination}`,
        { replace: true },
      )
    },
  })

  useEffect(() => {
    if (!mode) return
    let cancelled = false
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(async (stream) => {
        if (cancelled)
          return stream.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (!cancelled) setCameraReady(true)
      })
      .catch((cause: unknown) => {
        if (!cancelled)
          setCameraError(
            cause instanceof DOMException && cause.name === 'NotAllowedError'
              ? '카메라 권한이 필요합니다.'
              : '카메라를 시작할 수 없습니다.',
          )
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraReady(false)
    }
  }, [retry, mode])

  const leaveTo = devOnly ? '/dev/sidekick/start' : '/workouts'
  if (!selection) return <Navigate to={leaveTo} replace />

  const result = environment.result
  const holdTargetMs = ENVIRONMENT_CHECK_CONFIG.holdMs
  const holdRatio = Math.min(1, environment.holdMs / holdTargetMs)
  const peopleCount = result?.people.length ?? null
  const checks: { label: string; kind: CheckKind; text: string }[] = [
    {
      label: '운동 대상자',
      kind:
        peopleCount === null || peopleCount === 0
          ? 'loading'
          : peopleCount === 1
            ? 'success'
            : 'error',
      text:
        peopleCount === null
          ? '확인 중'
          : peopleCount > 1
            ? `${peopleCount}명 · 한 명만 나오게 해 주세요`
            : `${peopleCount}명`,
    },
    {
      label: '전신 인식',
      kind: result?.fullBodyValid ? 'success' : 'loading',
      text: result?.fullBodyValid ? '정상' : '확인 중',
    },
    {
      label: '촬영 구도',
      kind:
        result?.guideAlignment === 'PASS'
          ? 'success'
          : result?.guideAlignment === 'FAIL'
            ? 'error'
            : 'loading',
      text:
        result?.guideAlignment === 'PASS'
          ? '정상'
          : result?.guideAlignment === 'FAIL'
            ? '가이드 안으로 이동해 주세요'
            : '전신 인식 후 확인',
    },
  ]

  return (
    <main className="flex-1 bg-primary-soft px-4 py-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col items-start gap-3">
          <Link
            to={leaveTo}
            className="text-sm font-semibold text-brand-text underline underline-offset-4"
          >
            ← 운동 고르기
          </Link>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-brand-text">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-brand"
            />
            Side Kick ·{' '}
            {selection.mode === 'STUDY' ? '자세 배우기' : '운동 모드'}
          </p>
          <h1 className="text-4xl font-semibold text-cocoa">
            운동 환경을 확인할게요
          </h1>
          <p className="text-[15px] text-cocoa-secondary">
            머리부터 발끝까지 화면 안에 들어오도록 서 주세요. 카메라 영상은
            서버로 보내거나 저장하지 않아요.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative aspect-video overflow-hidden lg:aspect-auto lg:min-h-80 rounded-3xl bg-cocoa ring-1 ring-primary-strong">
            <video
              ref={videoRef}
              className="h-full w-full scale-x-[-1] object-cover"
              autoPlay
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-[6%_12%] rounded-2xl border-2 border-dashed border-white/80" />
          </div>

          <section
            aria-labelledby="env-check-title"
            className="flex flex-col gap-5 rounded-3xl bg-white p-6 ring-1 ring-primary-strong"
          >
            <h2
              id="env-check-title"
              className="text-xl font-semibold text-cocoa"
            >
              촬영 환경 점검
            </h2>

            {cameraError ? (
              <div className="flex flex-col items-start gap-4">
                <p role="alert" className="text-[15px] text-danger">
                  {cameraError}
                </p>
                <Button
                  variant="brand"
                  onClick={() => {
                    setCameraError(null)
                    setRetry((count) => count + 1)
                  }}
                >
                  카메라 다시 시도
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-2.5">
                  {checks.map((check) => (
                    <li
                      key={check.label}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-cocoa ${check.kind === 'success' ? 'bg-sage-soft' : 'bg-primary-soft'}`}
                    >
                      <StatusIcon kind={check.kind} />
                      <span className="font-semibold">{check.label}</span>
                      <span className="ml-auto text-right text-cocoa-secondary">
                        {check.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-2">
                  <p
                    role="status"
                    className="text-[15px] font-semibold text-cocoa"
                  >
                    {result?.ready
                      ? `${(environment.holdMs / 1000).toFixed(1)} / ${holdTargetMs / 1000}초 유지 중`
                      : (result?.reason ?? '분석 준비 중')}
                  </p>
                  <div
                    aria-hidden="true"
                    className="h-2 overflow-hidden rounded-full bg-primary"
                  >
                    <div
                      className="h-full rounded-full bg-brand-text transition-[width] duration-200 motion-reduce:transition-none"
                      style={{ width: `${holdRatio * 100}%` }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mt-auto">
              <Button
                variant="brand-outline"
                fullWidth
                onClick={() => navigate(leaveTo)}
              >
                취소
              </Button>
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
