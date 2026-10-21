import { useCallback, useEffect, useRef, useState } from 'react'
import { useSideKickVoice } from '../voice-coaching/useSideKickVoice'
import {
  getSideKickStudyConfig,
  type SideKickStudyConfig,
} from '../api/getSideKickStudyConfig'
import { saveSideKickStep } from '../api/saveSideKickStep'
import {
  usePoseLandmarker,
  type PoseFrame,
  type PoseLandmarkPoint,
} from '../mediapipe/usePoseLandmarker'
import {
  SideKickStudyTracker,
  type StudyResult,
  type StudyStepNumber,
} from '../analyzers/sideKick/side-kick-study'
import {
  scoreSideKickStep,
  type ReadyPose,
} from '../analyzers/sideKick/side-kick-study-score'

const STEPS = [
  { no: 1, title: '준비 자세' },
  { no: 2, title: '왼쪽 다리 들기 · 왼쪽 옆구리 굽히기' },
  { no: 3, title: '오른쪽 다리 내리고 준비 자세로 복귀' },
  { no: 4, title: '오른쪽 다리 들기 · 오른쪽 옆구리 굽히기' },
  { no: 5, title: '왼쪽 다리 내리고 준비 자세로 복귀' },
] as const

export function SideKickStudyScreen() {
  const [stepIndex, setStepIndex] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [studyResult, setStudyResult] = useState<StudyResult | null>(null)
  const [feedbackCode, setFeedbackCode] = useState<string | null>(null)
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null)

  const webcamRef = useRef<HTMLVideoElement>(null)
  const trainerRef = useRef<HTMLVideoElement>(null)
  const poseCanvasRef = useRef<HTMLCanvasElement>(null)

  const trackerRef = useRef<SideKickStudyTracker>(new SideKickStudyTracker())
  const readyRef = useRef<ReadyPose | null>(null)
  const readySamplesRef = useRef<PoseLandmarkPoint[][]>([])
  const latestStepRef = useRef(1)
  const dbConfigRef = useRef<SideKickStudyConfig | null>(null)
  const savingStepsRef = useRef<Set<number>>(new Set())
  const stepFeedbackCodesRef = useRef<Map<number, string[]>>(new Map())
  const saveGenerationRef = useRef(0)
  const isDevStudy = window.location.pathname.startsWith('/dev/')
  const lastTrackingOkAtRef = useRef(Date.now())
  const lastTrackingVoiceAtRef = useRef<number | null>(null)

  const voice = useSideKickVoice()

  useEffect(() => {
    if (isDevStudy) return

    let cancelled = false
    dbConfigRef.current = null

    void getSideKickStudyConfig()
      .then((config) => {
        if (cancelled) return
        dbConfigRef.current = config
        console.info('Side Kick DB config ready:', config)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Side Kick DB config failed:', error)
      })

    return () => {
      cancelled = true
      dbConfigRef.current = null
    }
  }, [isDevStudy])

  const step = STEPS[stepIndex]
  const completed = studyResult?.status === 'COMPLETED'

  // 카메라는 STEP 변경 시 다시 시작하지 않는다.
  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })

        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }

        stream = media

        if (webcamRef.current) {
          webcamRef.current.srcObject = media
          await webcamRef.current.play()
        }

        if (!cancelled) setCameraReady(true)
      } catch {
        if (!cancelled) {
          setCameraError(
            '웹캠을 시작하지 못했습니다. 카메라 권한을 확인하세요.',
          )
        }
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const handlePoseFrame = useCallback(
    (frame: PoseFrame) => {
      const tracker = trackerRef.current
      const currentStep = latestStepRef.current

      if (currentStep > 5) return

      // 운영 화면은 실제 DB 운동/STEP ID 확보 전 학습을 시작하지 않는다.
      if (!isDevStudy && !dbConfigRef.current) return

      const evaluation = scoreSideKickStep(
        currentStep as StudyStepNumber,
        frame.landmarks,
        readyRef.current,
      )

      if (evaluation.judgment.status === 'UNAVAILABLE') {
        const reason = evaluation.judgment.reason
        setTrackingMessage(
          reason === 'FRONT'
            ? '카메라 정면을 바라봐 주세요.'
            : '머리부터 양쪽 발목까지 화면에 들어오도록 서 주세요.',
        )
      } else {
        setTrackingMessage(null)
        lastTrackingOkAtRef.current = Date.now()

        // 추적 실패 안내가 재생 중이었다면 즉시 정지.
        if (lastTrackingVoiceAtRef.current !== null) {
          lastTrackingVoiceAtRef.current = null
          voice.stopVoice()
        }
      }

      // 준비 자세는 PASS 직전의 정상 측정 프레임만 보관한다.
      if (
        currentStep === 1 &&
        evaluation.judgment.status === 'EVALUATED' &&
        evaluation.judgment.score >= 80
      ) {
        readySamplesRef.current.push(frame.landmarks.map((p) => ({ ...p })))

        // 메모리에 무한히 쌓지 않는다.
        if (readySamplesRef.current.length > 10) {
          readySamplesRef.current.shift()
        }
      }

      const result = tracker.update(frame.timestampMs, evaluation.judgment)
      setStudyResult(result)

      for (const event of result.events) {
        if (event.type === 'VOICE_CUE') {
          setFeedbackCode(event.eventCode)

          const codes = stepFeedbackCodesRef.current.get(event.stepNo) ?? []
          codes.push(event.eventCode)
          stepFeedbackCodesRef.current.set(event.stepNo, codes)

          // STEP 종료 이벤트가 동시에 발생했다면
          // 이전 STEP의 음성이 다음 STEP에서 나오지 않게 한다.
          const stepFinished = result.events.some(
            (e) => e.type === 'STEP_COMPLETED',
          )

          if (!stepFinished) {
            void voice.playCue(event.eventCode)
          }
        }

        if (event.type === 'STEP_COMPLETED') {
          voice.stopVoice()

          if (!isDevStudy && !savingStepsRef.current.has(event.record.stepNo)) {
            const config = dbConfigRef.current
            const stepInfo = config?.steps.find(
              (item) => item.step_no === event.record.stepNo,
            )

            if (config && stepInfo) {
              const stepNo = event.record.stepNo
              const generation = saveGenerationRef.current
              savingStepsRef.current.add(stepNo)

              void saveSideKickStep(
                event.record,
                stepFeedbackCodesRef.current.get(stepNo) ?? [],
                config.exercise_id,
                stepInfo.exercise_step_id,
              )
                .then((saved) => {
                  console.info('STEP DB SAVE OK:', saved.id, stepNo)
                })
                .catch((error) => {
                  console.error('STEP DB SAVE FAILED:', stepNo, error)
                  if (generation === saveGenerationRef.current) {
                    savingStepsRef.current.delete(stepNo)
                  }
                })
            }
          }
          // STEP 1 완료 시 사용자 준비 자세 저장.
          if (event.record.stepNo === 1) {
            const samples = readySamplesRef.current
            const representative = samples[Math.floor(samples.length / 2)]

            if (representative) {
              readyRef.current = {
                points: representative.map((p) => ({ ...p })),
              }
            }
          }

          setFeedbackCode(null)

          // 같은 프레임에서 중복 STEP 처리하지 않는다.
          latestStepRef.current = event.record.stepNo + 1

          if (event.record.stepNo < 5) {
            setStepIndex(event.record.stepNo)
            setVideoEnded(false)
          }
        }
      }
    },
    [voice.playCue, voice.stopVoice, isDevStudy],
  )

  const pose = usePoseLandmarker(
    webcamRef,
    poseCanvasRef,
    cameraReady,
    handlePoseFrame,
  )

  useEffect(() => {
    if (!cameraReady || !voice.enabled) return

    const timer = window.setInterval(() => {
      if (latestStepRef.current > 5) return

      const now = Date.now()
      const lostFor = now - lastTrackingOkAtRef.current
      const lastVoice = lastTrackingVoiceAtRef.current

      // 5초 이상 추적 실패 시 최초 안내.
      if (lostFor < 5000) return

      // 동일 안내를 너무 자주 반복하지 않는다.
      if (lastVoice !== null && now - lastVoice < 8000) return

      lastTrackingVoiceAtRef.current = now
      void voice.playCue('TRACKING_LOST')
    }, 500)

    return () => window.clearInterval(timer)
  }, [cameraReady, voice.enabled, voice.playCue])

  function restartTrainerVideo() {
    const video = trainerRef.current
    if (!video) return

    video.currentTime = 0
    setVideoEnded(false)

    void video.play().catch(() => {
      // 자동 재생이 차단되면 사용자의 조작을 기다린다.
    })
  }

  function restartStudy() {
    saveGenerationRef.current += 1
    savingStepsRef.current.clear()
    stepFeedbackCodesRef.current.clear()
    voice.stopVoice()
    lastTrackingOkAtRef.current = Date.now()
    lastTrackingVoiceAtRef.current = null
    trackerRef.current.reset()
    readyRef.current = null
    readySamplesRef.current = []
    latestStepRef.current = 1

    setStepIndex(0)
    setVideoEnded(false)
    setStudyResult(null)
    setFeedbackCode(null)
    setTrackingMessage(null)

    // STEP 1에 머물러 있던 경우에도 영상 처음부터 재생.
    restartTrainerVideo()
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">사이드킥 · 자세히 배우기</h1>

        <p>
          STEP {step.no}/5 — {step.title}
        </p>

        <p className="text-sm text-gray-500">
          왼쪽 트레이너 동작을 보고 오른쪽 화면에서 따라 하세요.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">트레이너 영상</h2>

          <video
            key={step.no}
            ref={trainerRef}
            src={`/videos/sidekick/step${step.no}.mp4`}
            className="aspect-video w-full rounded-xl bg-black object-contain"
            autoPlay
            muted
            playsInline
            onEnded={() => setVideoEnded(true)}
          />

          <p className="text-sm text-gray-500">
            {videoEnded
              ? '마지막 자세를 유지하며 사용자의 동작을 기다리고 있습니다.'
              : '트레이너 동작을 확인하세요.'}
          </p>

          <button
            type="button"
            onClick={restartTrainerVideo}
            className="rounded-lg border px-4 py-2"
          >
            영상 다시 보기
          </button>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">내 자세 (웹캠)</h2>

          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              ref={webcamRef}
              className="absolute inset-0 h-full w-full scale-x-[-1] object-contain"
              autoPlay
              muted
              playsInline
            />

            <canvas
              ref={poseCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-contain"
              aria-hidden="true"
            />
          </div>

          {cameraError ? (
            <p role="alert" className="text-sm text-red-600">
              {cameraError}
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              {cameraReady
                ? `웹캠 연결됨 · MediaPipe: ${pose.status} · 랜드마크 ${pose.landmarkCount}개`
                : '웹캠 연결 중...'}
            </p>
          )}

          {pose.error && (
            <p role="alert" className="text-sm text-red-600">
              {pose.error}
            </p>
          )}

          {trackingMessage && (
            <p role="status" className="font-semibold text-amber-700">
              {trackingMessage}
            </p>
          )}
        </section>
      </div>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">STEP 진행 상태</h2>

        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <p className="font-semibold">음성 코칭</p>

          <button
            type="button"
            disabled={!voice.ready || voice.enabled}
            onClick={() => void voice.enableVoice()}
            className="rounded-lg border px-4 py-2 disabled:opacity-40"
          >
            {voice.enabled ? '음성 켜짐' : '음성 켜기'}
          </button>

          {voice.message && <p role="status">{voice.message}</p>}

          {voice.error && (
            <p role="alert" className="text-sm text-red-600">
              {voice.error}
            </p>
          )}
        </div>

        {completed ? (
          <p className="font-semibold text-green-700">5개 STEP 학습 완료</p>
        ) : (
          <p className="font-semibold">현재 STEP {studyResult?.stepNo ?? 1}</p>
        )}

        <p>
          현재 점수: {studyResult?.currentScore?.toFixed(1) ?? '측정 대기'}
          {' / 100점'}
        </p>

        <p>
          최고 점수: {studyResult?.bestScore?.toFixed(1) ?? '-'}
          {' / 100점'}
        </p>

        <p>
          유지 시간: {((studyResult?.holdProgressMs ?? 0) / 1000).toFixed(1)}
          {' / 2초'}
        </p>

        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-green-500 transition-all"
            style={{
              width: `${studyResult?.holdProgressPercent ?? 0}%`,
            }}
          />
        </div>

        <p>코칭 횟수: {studyResult?.feedbackCount ?? 0} / 5회</p>

        {feedbackCode && (
          <p role="status" className="font-semibold text-amber-700">
            코칭 이벤트: {feedbackCode}
          </p>
        )}

        {studyResult && studyResult.records.length > 0 && (
          <div className="space-y-1 rounded-lg bg-gray-50 p-3">
            <p className="font-semibold">STEP별 결과</p>

            {studyResult.records.map((record) => (
              <p key={record.stepNo}>
                STEP {record.stepNo}: {record.status}
                {' · '}
                {record.stepScore?.toFixed(1) ?? '-'}점{' · 코칭 '}
                {record.feedbackCount}회
              </p>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500">
          실험용 자세 유사도 평가: 80점 이상을 연속 2초 유지하면 PASS입니다.
          음성 코칭 요청이 5회 발생하면 NON_PASS로 진행합니다. 의료적 안전성을
          판정하는 점수가 아닙니다.
        </p>

        <button
          type="button"
          onClick={restartStudy}
          className="rounded-lg border px-4 py-2"
        >
          학습 처음부터 다시 시작
        </button>
      </section>
    </main>
  )
}
