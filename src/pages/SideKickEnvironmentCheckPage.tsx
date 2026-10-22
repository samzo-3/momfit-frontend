import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  parseSideKickMode,
  type WorkoutSelection,
} from '../features/yolo-environment-check/workout-selection'
import { useEnvironmentCheck } from '../features/yolo-environment-check/use-environment-check'

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

  if (!selection)
    return (
      <Navigate
        to={devOnly ? '/dev/sidekick/start' : '/workouts/start'}
        replace
      />
    )
  const result = environment.result
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">운동 환경 확인</h1>
      <p>
        안전한 동작을 위해 머리부터 발끝까지 화면 안에 들어오도록 서 주세요.
      </p>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="h-full w-full scale-x-[-1] object-cover"
          autoPlay
          muted
          playsInline
        />
        <div className="pointer-events-none absolute inset-[6%_12%] rounded-xl border-4 border-dashed border-yellow-300" />
      </div>
      {cameraError ? (
        <>
          <p role="alert" className="text-red-600">
            {cameraError}
          </p>
          <button
            className="rounded border px-4 py-2"
            onClick={() => {
              setCameraError(null)
              setRetry((count) => count + 1)
            }}
          >
            카메라 다시 시도
          </button>
        </>
      ) : (
        <section className="rounded border p-4">
          <p>운동 대상자: {result ? `${result.people.length}명` : '확인 중'}</p>
          <p>전신 인식: {result?.fullBodyValid ? '정상' : '확인 중'}</p>
          <p>
            촬영 구도:{' '}
            {result?.guideAlignment === 'PASS'
              ? '정상'
              : result?.guideAlignment === 'FAIL'
                ? '가이드 안으로 이동해 주세요.'
                : '전신 인식 후 확인합니다.'}
          </p>
          <p className="mt-2 font-semibold">
            {result?.ready
              ? `${(environment.holdMs / 1000).toFixed(1)} / 2초 유지 중`
              : (result?.reason ?? '분석 준비 중')}
          </p>
        </section>
      )}
      <button
        className="rounded border px-4 py-2"
        onClick={() =>
          navigate(devOnly ? '/dev/sidekick/start' : '/workouts/start')
        }
      >
        취소
      </button>
    </main>
  )
}
