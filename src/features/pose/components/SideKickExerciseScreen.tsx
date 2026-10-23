import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  usePoseLandmarker,
  type PoseFrame,
} from '../mediapipe/usePoseLandmarker'
import {
  extractSideKickFeatures,
  type SideKickFeatureResult,
  type SideKickMetrics,
} from '../analyzers/sideKick/side-kick-features'
import { SideKickMotionTracker } from '../analyzers/sideKick/side-kick-motion'
import { SideKickExerciseTracker } from '../analyzers/sideKick/side-kick-exercise'
import {
  startSideKickExercise,
  pauseSideKickExercise,
  resumeSideKickExercise,
  completeSideKickExercise,
} from '../api/sideKickExerciseRecord'
import { getSideKickExerciseConfig } from '../api/getSideKickExerciseConfig'
import {
  ensureTrainerVideoMuted,
  playTrainerVideo,
  shouldPlayTrainer,
  trainerVideoSource,
} from './sideKickTrainerVideo'

type Stage = 'GUIDE' | 'STARTING' | 'EXERCISE' | 'FINISHING' | 'DONE'
type PauseReason = 'NONE' | 'AUTO' | 'MANUAL'
type SideKickExerciseMode = 'FRONTEND_ONLY' | 'API_CONNECTED'

const LOSS_MS = 2000
const RECOVERY_MS = 600
const CALIBRATION_MS = 800

type Sample = {
  time: number
  left: number
  right: number
}

function sideKickExerciseMode(): SideKickExerciseMode {
  return import.meta.env.VITE_SIDEKICK_EXERCISE_MODE === 'frontend_only'
    ? 'FRONTEND_ONLY'
    : 'API_CONNECTED'
}

export default function SideKickExerciseScreen() {
  const trainerRef = useRef<HTMLVideoElement>(null)
  const webcamRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const motionRef = useRef(new SideKickMotionTracker())
  const exerciseRef = useRef(new SideKickExerciseTracker(10))

  const [stage, setStage] = useState<Stage>('GUIDE')
  const stageRef = useRef<Stage>('GUIDE')

  const [pauseReason, setPauseReason] = useState<PauseReason>('NONE')
  const pauseRef = useRef<PauseReason>('NONE')

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [completedSets, setCompletedSets] = useState(0)
  const [trackingMessage, setTrackingMessage] =
    useState('자세를 준비해 주세요.')
  const [startVisible, setStartVisible] = useState(false)
  const [freezeImage, setFreezeImage] = useState<string | null>(null)

  const lastValidAtRef = useRef<number>(0)
  const recoveredSinceRef = useRef<number | null>(null)
  const samplesRef = useRef<Sample[]>([])
  const baselineRef = useRef<{ left: number; right: number } | null>(null)

  const recordIdRef = useRef<number | null>(null)
  const exerciseIdRef = useRef<number | null>(null)
  const serverBusyRef = useRef(false)
  const pauseSavedRef = useRef(false)
  const [pauseSaved, setPauseSaved] = useState(false)
  const [serverBusy, setServerBusy] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedScore, setSavedScore] = useState<string | null>(null)
  const [trainerReady, setTrainerReady] = useState(false)
  const [trainerPlaybackBlocked, setTrainerPlaybackBlocked] = useState(false)
  const trainerAutoPlayAttemptRef = useRef<string | null>(null)
  const isFrontendOnlyMode = sideKickExerciseMode() === 'FRONTEND_ONLY'

  const setTrainerVideoRef = useCallback((video: HTMLVideoElement | null) => {
    trainerRef.current = video
    ensureTrainerVideoMuted(video)
  }, [])

  const setPause = useCallback((reason: PauseReason) => {
    pauseRef.current = reason
    setPauseReason(reason)
  }, [])

  const setCurrentStage = useCallback((next: Stage) => {
    stageRef.current = next
    setStage(next)
  }, [])

  const runServerAction = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      if (serverBusyRef.current) return null

      serverBusyRef.current = true
      setServerBusy(true)
      setServerError(null)

      try {
        return await action()
      } catch (error) {
        console.error('Side Kick record API failed:', error)
        setServerError('운동 기록을 서버에 저장하거나 불러오지 못했습니다.')
        return null
      } finally {
        serverBusyRef.current = false
        setServerBusy(false)
      }
    },
    [],
  )

  const cancelPartialMotion = useCallback(() => {
    motionRef.current.reset()
    exerciseRef.current.update([
      { type: 'MOTION_PAUSED', reason: 'FEATURE_UNAVAILABLE' },
    ])
  }, [])

  // 일반 운동은 STEP 기준 버전과 무관한 설정 경로에서 실제 DB ID를 조회한다.
  useEffect(() => {
    if (isFrontendOnlyMode) return

    let cancelled = false

    void getSideKickExerciseConfig()
      .then((config) => {
        if (!cancelled) exerciseIdRef.current = config.exercise_id
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Side Kick exercise config failed:', error)
        setServerError(
          '운동 설정을 불러오지 못했습니다. 기록을 시작할 수 없습니다.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [isFrontendOnlyMode])

  // 웹캠은 운동 전체에서 하나의 스트림을 유지한다.
  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (webcamRef.current) {
          webcamRef.current.srcObject = stream
          await webcamRef.current.play()
        }

        if (!cancelled) setCameraReady(true)
      } catch {
        if (!cancelled) {
          setCameraError('웹캠을 시작할 수 없습니다. 카메라 권한을 확인하세요.')
        }
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const savePause = useCallback(async () => {
    if (pauseSavedRef.current) return

    if (isFrontendOnlyMode) {
      pauseSavedRef.current = true
      setPauseSaved(true)
      return
    }

    const id = recordIdRef.current
    if (id === null) return

    const sets = exerciseRef.current.getResult().completedSets

    const result = await runServerAction(() => pauseSideKickExercise(id, sets))

    if (result) {
      pauseSavedRef.current = true
      setPauseSaved(true)
      setSavedScore(result.total_score)
    }
  }, [isFrontendOnlyMode, runServerAction])

  const resumeFromPause = useCallback(async () => {
    if (!pauseSavedRef.current) return
    if (serverBusyRef.current) return

    if (!isFrontendOnlyMode) {
      const id = recordIdRef.current
      if (id === null) return

      const result = await runServerAction(() => resumeSideKickExercise(id))
      if (!result) return

      setSavedScore(result.total_score)
    }

    pauseSavedRef.current = false
    setPauseSaved(false)
    cancelPartialMotion()
    lastValidAtRef.current = performance.now()
    recoveredSinceRef.current = null
    try {
      const played = await playTrainerVideo(trainerRef.current)
      if (!played) throw new Error('TRAINER_VIDEO_PLAY_FAILED')
      setPause('NONE')
    } catch {
      // 서버는 재개되었지만 브라우저 재생에 실패한 경우.
      // 중복 resume 요청을 보내지 않도록 상태를 보존한다.
      setServerError('영상 재생에 실패했습니다. 페이지를 새로고침하지 마세요.')
      setPause('MANUAL')
    }
  }, [isFrontendOnlyMode, runServerAction, cancelPartialMotion, setPause])

  const handleFrame = useCallback(
    (frame: PoseFrame) => {
      if (stageRef.current === 'FINISHING' || stageRef.current === 'DONE')
        return

      const points = frame.landmarks

      // STEP 모드와 동일한 신체 기준의 좌우 인덱스를 사용한다.
      const landmarks = {
        LEFT_SHOULDER: points[11],
        RIGHT_SHOULDER: points[12],
        LEFT_HIP: points[23],
        RIGHT_HIP: points[24],
        LEFT_KNEE: points[25],
        RIGHT_KNEE: points[26],
        LEFT_ANKLE: points[27],
        RIGHT_ANKLE: points[28],
      }

      const width = webcamRef.current?.videoWidth ?? 0
      const height = webcamRef.current?.videoHeight ?? 0

      const hipWidth = Math.abs((points[23]?.x ?? 0) - (points[24]?.x ?? 0))
      const shoulderWidth = Math.abs(
        (points[11]?.x ?? 0) - (points[12]?.x ?? 0),
      )

      const frontOK =
        hipWidth >= 0.025 &&
        shoulderWidth >= 0.04 &&
        shoulderWidth / hipWidth >= 0.5

      const features = extractSideKickFeatures({
        width,
        height,
        trackingStatus: 'TRACKING',
        poseStatus: 'POSE_VALID',
        landmarks,
      })

      if (!frontOK || !features.valid) {
        recoveredSinceRef.current = null
        setTrackingMessage('몸 전체가 보이도록 카메라 정면에 서 주세요.')
        return
      }

      const now = performance.now()
      lastValidAtRef.current = now
      setTrackingMessage('자세 인식 중')

      // 자동 정지는 안정적으로 인식이 회복되면 자동 재개한다.
      if (pauseRef.current === 'AUTO') {
        if (recoveredSinceRef.current === null) {
          recoveredSinceRef.current = now
        }

        if (
          now - recoveredSinceRef.current >= RECOVERY_MS &&
          pauseSavedRef.current &&
          !serverBusyRef.current
        ) {
          void resumeFromPause()
        }
        return
      }

      if (pauseRef.current === 'MANUAL') return

      const metrics = features.metrics
      const left = metrics.left_ankle_relative_x_ratio
      const right = metrics.right_ankle_relative_x_ratio

      if (stageRef.current === 'GUIDE' || baselineRef.current === null) {
        const samples = samplesRef.current
        samples.push({ time: now, left, right })

        // 최근 1.5초 표본만 사용.
        while (samples.length && now - samples[0].time > 1500) {
          samples.shift()
        }

        if (samples.length >= 5 && now - samples[0].time >= CALIBRATION_MS) {
          const leftValues = samples.map((s) => s.left)
          const rightValues = samples.map((s) => s.right)

          const leftRange = Math.max(...leftValues) - Math.min(...leftValues)
          const rightRange = Math.max(...rightValues) - Math.min(...rightValues)

          // 큰 움직임이 없는 구간에서만 준비 자세를 잡는다.
          if (leftRange <= 0.15 && rightRange <= 0.15) {
            baselineRef.current = {
              left: leftValues.reduce((a, b) => a + b, 0) / leftValues.length,
              right:
                rightValues.reduce((a, b) => a + b, 0) / rightValues.length,
            }

            samplesRef.current = []
            setTrackingMessage('준비 자세 인식 완료')
          }
        }
      }

      if (stageRef.current !== 'EXERCISE' || !baselineRef.current) return

      const adjusted: SideKickMetrics = {
        ...metrics,
        left_ankle_relative_x_ratio: left - baselineRef.current.left,
        right_ankle_relative_x_ratio: right - baselineRef.current.right,
      }

      const adjustedFeatures: SideKickFeatureResult = {
        valid: true,
        reason: null,
        metrics: adjusted,
      }

      const motion = motionRef.current.update({
        timestampMs: frame.timestampMs,
        frontStatus: 'FRONT_OK',
        features: adjustedFeatures,
      })

      const exercise = exerciseRef.current.update(motion.events)
      setCompletedSets(exercise.completedSets)
    },
    [resumeFromPause],
  )

  const pose = usePoseLandmarker(
    webcamRef,
    canvasRef,
    cameraReady && stage !== 'DONE' && stage !== 'FINISHING',
    handleFrame,
  )

  // 랜드마크가 아예 감지되지 않으면 onFrame이 호출되지 않으므로
  // 마지막 유효 인식 시각을 별도로 감시한다.
  useEffect(() => {
    if (stage !== 'EXERCISE') return

    const id = window.setInterval(() => {
      if (pauseRef.current !== 'NONE') return

      if (performance.now() - lastValidAtRef.current >= LOSS_MS) {
        cancelPartialMotion()
        recoveredSinceRef.current = null
        trainerRef.current?.pause()
        setPause('AUTO')
        setTrackingMessage('자세 인식이 끊겨 운동을 일시 정지했습니다.')
        void savePause()
      }
    }, 200)

    return () => window.clearInterval(id)
  }, [stage, cancelPartialMotion, setPause, savePause])

  const startExercise = useCallback(async () => {
    if (recordIdRef.current !== null) return

    if (isFrontendOnlyMode) {
      setServerError(null)
      lastValidAtRef.current = performance.now()

      motionRef.current.reset()
      exerciseRef.current.reset()
      setCompletedSets(0)

      setStartVisible(true)
      setCurrentStage('EXERCISE')
      window.setTimeout(() => setStartVisible(false), 1200)
      return
    }

    const exerciseId = exerciseIdRef.current
    if (exerciseId === null) {
      setServerError(
        '운동 설정을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.',
      )
      return
    }

    const record = await runServerAction(() =>
      startSideKickExercise(exerciseId),
    )
    if (!record) return

    recordIdRef.current = record.id
    setSavedScore(record.total_score)
    lastValidAtRef.current = performance.now()

    motionRef.current.reset()
    exerciseRef.current.reset()
    setCompletedSets(0)

    setStartVisible(true)
    setCurrentStage('EXERCISE')
    window.setTimeout(() => setStartVisible(false), 1200)
  }, [isFrontendOnlyMode, runServerAction, setCurrentStage])

  const tryPlayTrainer = useCallback(
    async (userInitiated = false) => {
      const playbackKey = `${stage}:${trainerVideoSource(stage)}`
      if (!userInitiated && trainerAutoPlayAttemptRef.current === playbackKey) {
        return
      }

      if (!userInitiated) trainerAutoPlayAttemptRef.current = playbackKey

      const played = await playTrainerVideo(trainerRef.current)
      setTrainerPlaybackBlocked(!played)
    },
    [stage],
  )

  // 새 video 노드는 canplay를 이미 발생시킨 뒤 mount될 수도 있다. 이벤트만
  // 기다리지 않고 현재 readyState도 확인한다.
  useEffect(() => {
    const video = trainerRef.current
    if (!video) return

    trainerAutoPlayAttemptRef.current = null
    setTrainerPlaybackBlocked(false)
    setTrainerReady(video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA)
  }, [stage])

  // source 및 key 변경으로 새 video 노드가 생겨도 paint·재생 전에 muted를 복구한다.
  useLayoutEffect(() => {
    ensureTrainerVideoMuted(trainerRef.current)
  }, [stage])

  useEffect(() => {
    if (!shouldPlayTrainer(stage, pauseReason, trainerReady)) return

    void tryPlayTrainer()
  }, [stage, pauseReason, trainerReady, tryPlayTrainer])

  // 가이드 종료 후 서버 기록 생성 성공 시 본 운동 자동 시작.
  function handleTrainerEnded() {
    if (stageRef.current === 'GUIDE') {
      setCurrentStage('STARTING')
      void startExercise()
      return
    }

    if (stageRef.current !== 'EXERCISE') return

    trainerRef.current?.pause()
    setCurrentStage('FINISHING')
    setPause('NONE')
    cancelPartialMotion()

    const recordId = recordIdRef.current
    if (!isFrontendOnlyMode && recordId !== null) {
      const sets = exerciseRef.current.getResult().completedSets
      void runServerAction(() => completeSideKickExercise(recordId, sets)).then(
        (saved) => {
          if (saved) setSavedScore(saved.total_score)
        },
      )
    }

    // 종료 시점의 웹캠 마지막 프레임을 고정한다.
    const video = webcamRef.current
    if (video && video.videoWidth && video.videoHeight) {
      const snapshot = document.createElement('canvas')
      snapshot.width = video.videoWidth
      snapshot.height = video.videoHeight
      snapshot.getContext('2d')?.drawImage(video, 0, 0)
      setFreezeImage(snapshot.toDataURL('image/jpeg', 0.85))
    }

    window.setTimeout(() => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      setCameraReady(false)
      setCurrentStage('DONE')
    }, 3000)
  }

  function manualPause() {
    if (stageRef.current !== 'EXERCISE') return
    if (pauseRef.current === 'MANUAL') return

    trainerRef.current?.pause()
    cancelPartialMotion()
    setPause('MANUAL')
    void savePause()
  }

  function manualResume() {
    if (pauseRef.current !== 'MANUAL') return
    if (!pauseSavedRef.current) return
    void resumeFromPause()
  }

  function retrySave() {
    if (pauseRef.current === 'NONE') return
    void savePause()
  }

  const isExercise = stage === 'EXERCISE'
  const paused = pauseReason !== 'NONE'

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">Side Kick &amp; Side Bend</h1>
      {isFrontendOnlyMode && (
        <p className="text-xs text-gray-500">
          체험 모드 · 운동 기록은 저장되지 않습니다.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">트레이너 영상</h2>
          <video
            key={stage === 'GUIDE' ? 'guide' : 'exercise'}
            ref={setTrainerVideoRef}
            src={trainerVideoSource(stage)}
            className="aspect-video w-full rounded-xl bg-black object-contain"
            autoPlay={stage === 'GUIDE'}
            muted
            playsInline
            onLoadedMetadata={() => {
              ensureTrainerVideoMuted(trainerRef.current)
              trainerAutoPlayAttemptRef.current = null
              setTrainerReady(false)
            }}
            onCanPlay={() => {
              ensureTrainerVideoMuted(trainerRef.current)
              setTrainerReady(true)
            }}
            onPlay={() => setTrainerPlaybackBlocked(false)}
            onEnded={handleTrainerEnded}
          />
          <p className="text-sm">
            {stage === 'GUIDE'
              ? '운동 가이드 · 자세를 준비하세요'
              : stage === 'FINISHING'
                ? '운동 종료 · 결과 준비 중'
                : stage === 'DONE'
                  ? '운동 완료'
                  : paused
                    ? '일시 정지'
                    : '본 운동 진행 중'}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">내 자세</h2>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              ref={webcamRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full scale-x-[-1] object-contain"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-contain"
            />
            {freezeImage && stage !== 'EXERCISE' && stage !== 'GUIDE' && (
              <img
                src={freezeImage}
                alt="마지막 운동 프레임"
                className="absolute inset-0 h-full w-full scale-x-[-1] object-contain"
              />
            )}
            {startVisible && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="text-5xl font-bold text-white">START</span>
              </div>
            )}
            {paused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-3xl font-bold text-white">
                  {pauseReason === 'AUTO' ? '인식 대기 중' : '일시 정지'}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm">
            {cameraError ?? pose.error ?? trackingMessage}
          </p>
          <p className="text-xs text-gray-500">MediaPipe: {pose.status}</p>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
        <div className="text-xl font-bold">{completedSets} / 10세트</div>
        <div className="text-lg">
          {stage === 'DONE' ? '감지 점수' : '점수 미리보기'}:{' '}
          {completedSets * 10}점
        </div>
        {!isFrontendOnlyMode && (
          <div className="text-sm">
            서버 저장 점수: {savedScore === null ? '미저장' : `${savedScore}점`}
          </div>
        )}

        {isExercise && pauseReason !== 'MANUAL' && (
          <button
            type="button"
            onClick={manualPause}
            className="rounded-lg border px-4 py-2"
          >
            수동 일시 정지
          </button>
        )}
        {isExercise && pauseReason === 'MANUAL' && (
          <button
            type="button"
            onClick={manualResume}
            disabled={serverBusy || !pauseSaved}
            className="rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            이어하기
          </button>
        )}
      </div>

      {trainerPlaybackBlocked &&
        (stage === 'GUIDE' || stage === 'EXERCISE') && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
            <span>영상 자동 재생이 차단되었습니다.</span>
            <button
              type="button"
              onClick={() => void tryPlayTrainer(true)}
              className="rounded-lg border border-amber-600 px-4 py-2"
            >
              영상 재생
            </button>
          </div>
        )}

      {stage === 'STARTING' && serverError && (
        <button
          type="button"
          onClick={() => void startExercise()}
          className="rounded-lg border px-4 py-2"
        >
          기록 생성 다시 시도
        </button>
      )}

      {paused && serverError && !pauseSaved && (
        <button
          type="button"
          onClick={retrySave}
          disabled={serverBusy}
          className="rounded-lg border px-4 py-2"
        >
          일시 정지 기록 재저장
        </button>
      )}

      {serverBusy && <p role="status">서버 처리 중...</p>}
      {serverError && (
        <p role="alert" className="text-red-600">
          {serverError}
        </p>
      )}

      {stage === 'DONE' && (
        <p className="font-semibold">
          운동 종료: {completedSets}세트 완료.
          {isFrontendOnlyMode
            ? ' 체험 모드에서는 운동 기록을 저장하지 않았습니다.'
            : savedScore === null
              ? ' 서버 저장 결과를 확인하지 못했습니다.'
              : ` 서버 기록 점수: ${savedScore}점`}
        </p>
      )}
    </div>
  )
}
