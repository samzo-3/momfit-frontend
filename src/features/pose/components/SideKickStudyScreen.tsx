import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../shared/components/Button'
import ConfirmDialog from '../../../shared/components/ConfirmDialog'
import {
  enterFullscreen,
  exitFullscreen,
  isFullscreen,
} from '../../../shared/lib/fullscreen'
import {
  WORKOUT_COMPLETE_PATH,
  type WorkoutOutcome,
} from '../../workouts/workout-catalog'
import { SideKickVoiceBridge } from '../voice/side-kick-voice-bridge'
import { SideKickVoicePlayer } from '../voice/side-kick-voice-player'
import type { SideKickVoiceDecision } from '../voice/side-kick-voice-policy'
import {
  SideKickStudyRuntime,
  SIDE_KICK_RUNTIME_CRITERIA,
  type SideKickRuntimeSnapshot,
} from '../analyzers/sideKick/side-kick-study-runtime'
import {
  getSideKickStudyConfig,
  matchesSideKickRuntimeCriteriaVersion,
  type SideKickStudyConfig,
} from '../api/getSideKickStudyConfig'
import { saveSideKickStep } from '../api/saveSideKickStep'
import {
  usePoseLandmarker,
  type PoseFrame,
} from '../mediapipe/usePoseLandmarker'
import { scoreSideKickStep } from '../analyzers/sideKick/side-kick-study-score'
import type { FlowRecord } from '../analyzers/sideKick/side-kick-study-flow'

const STEPS = [
  { no: 1, title: '준비 자세' },
  { no: 2, title: '왼쪽 다리 들기 · 왼쪽 옆구리 굽히기' },
  { no: 3, title: '왼쪽 다리 내리고 준비 자세로 복귀' },
  { no: 4, title: '오른쪽 다리 들기 · 오른쪽 옆구리 굽히기' },
  { no: 5, title: '오른쪽 다리 내리고 준비 자세로 복귀' },
] as const

const OUTCOME_LABEL = {
  PASS: '통과',
  NON_PASS: '다시 도전',
  NOT_EVALUATED: '인식 어려움',
  PENDING: '진행 전',
} as const

const OUTCOME_DOT = {
  PASS: 'bg-sage text-white',
  NON_PASS: 'bg-primary text-cocoa',
  NOT_EVALUATED: 'bg-white/40 text-white',
  PENDING: 'bg-white/20 text-white',
} as const

const OUTCOME_MESSAGE = {
  PASS: (step: number) => `STEP ${step} 통과했어요!`,
  NON_PASS: (step: number) =>
    `STEP ${step} 아쉬워요. 무리하지 말고 다음에 다시 해봐요`,
  NOT_EVALUATED: (step: number) =>
    `STEP ${step} 동작을 인식하지 못했어요. 카메라 위치를 확인해 주세요`,
} as const

const CORRECTION_EVENTS = new Set([
  'SK_LEG_LIFT_MORE',
  'SK_TORSO_BEND_MORE',
  'SK_TORSO_ASYMMETRY_MORE',
])

const STEP_START_EVENTS: Record<
  1 | 2 | 3 | 4 | 5,
  SideKickVoiceDecision['eventCode']
> = {
  1: 'SK_READY_START',
  2: 'SK_LEFT_LIFT_START',
  3: 'SK_LEFT_RETURN',
  4: 'SK_RIGHT_LIFT_START',
  5: 'SK_RIGHT_RETURN',
}

type SideKickVoiceCueMap = Map<
  number,
  Map<SideKickVoiceDecision['eventCode'], string>
>

type SideKickStudyMode = 'FRONTEND_ONLY' | 'API_CONNECTED'

function sideKickStudyMode(): SideKickStudyMode {
  return import.meta.env.VITE_SIDEKICK_STUDY_MODE === 'frontend_only'
    ? 'FRONTEND_ONLY'
    : 'API_CONNECTED'
}

function flowRecordForEvent(
  event: string,
  records: readonly FlowRecord[],
): FlowRecord | null {
  const match = /^STEP_([1-5])_(PASS|NON_PASS|NOT_EVALUATED)$/.exec(event)
  if (!match) return null

  const step = Number(match[1])
  return records.find((record) => record.step === step) ?? null
}

export function SideKickStudyScreen() {
  const navigate = useNavigate()
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [, setVideoEnded] = useState(false)
  const [trainerVideoError, setTrainerVideoError] = useState<string | null>(
    null,
  )
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null)
  // 저장 실패는 화면에 보이지 않는 기록용 상태다(콘솔 로그로 확인한다).
  const [, setRecordSaveError] = useState<string | null>(null)
  // STEP이 끝날 때마다 잠깐 보여 주는 통과 여부 안내
  const [resultToast, setResultToast] = useState<FlowRecord | null>(null)
  const shownRecordCountRef = useRef(0)
  const resultToastTimerRef = useRef<number | null>(null)

  const webcamRef = useRef<HTMLVideoElement>(null)
  const trainerRef = useRef<HTMLVideoElement>(null)
  const poseCanvasRef = useRef<HTMLCanvasElement>(null)

  const runtimeRef = useRef(new SideKickStudyRuntime())
  const [runtimeSnapshot, setRuntimeSnapshot] =
    useState<SideKickRuntimeSnapshot | null>(null)
  const latestStepRef = useRef(1)
  const dbConfigRef = useRef<SideKickStudyConfig | null>(null)
  const savingStepsRef = useRef<Set<number>>(new Set())
  const saveGenerationRef = useRef(0)
  const stepSessionIdRef = useRef<string | null>(null)
  const feedbackIssuedRef = useRef(false)
  const isDevStudy = window.location.pathname.startsWith('/dev/')
  const studyMode = sideKickStudyMode()
  const isFrontendOnlyMode = studyMode === 'FRONTEND_ONLY'
  const runsRuntimeWithoutApi = isDevStudy || isFrontendOnlyMode
  const lastTrackingOkAtRef = useRef<number>(0)
  const lastTrackingVoiceAtRef = useRef<number | null>(null)

  const devVoiceBridgeRef = useRef(new SideKickVoiceBridge())
  const devVoicePlayerRef = useRef<SideKickVoicePlayer | null>(null)
  const devVoiceCuesRef = useRef<SideKickVoiceCueMap>(new Map())
  const devAutoActivationPlayerRef = useRef<SideKickVoicePlayer | null>(null)
  const devInitialVoiceDecisionRef = useRef<SideKickVoiceDecision | null>(null)
  const [devVoiceEnabled, setDevVoiceEnabled] = useState(false)
  const devVoiceStatus = '로컬 음성 16종 준비 완료'
  const [devVoiceError, setDevVoiceError] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  useEffect(() => {
    const player = new SideKickVoicePlayer((decision) => {
      const step =
        decision.eventCode === 'SK_STUDY_COMPLETED' ? 0 : (decision.step ?? 1)
      const audioUrl = devVoiceCuesRef.current
        .get(step)
        ?.get(decision.eventCode)
      return audioUrl ? { audioUrl } : null
    })

    devVoicePlayerRef.current = player

    return () => {
      player.dispose()
      if (devVoicePlayerRef.current === player) {
        devVoicePlayerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const base = '/audio/pose/sidekick/v2/'
    const commonCodes = [
      'SK_WAIT_MOVEMENT',
      'SK_TRACKING_LOST',
      'SK_HOLD_POSITION',
      'SK_HOLD_INTERRUPTED',
      'SK_LEG_LIFT_MORE',
      'SK_TORSO_BEND_MORE',
      'SK_TORSO_ASYMMETRY_MORE',
      'SK_STEP_COMPLETED',
      'SK_STEP_NOT_PASSED',
      'SK_STEP_NOT_EVALUATED',
    ] as const

    const stepStarts = [
      'SK_READY_START',
      'SK_LEFT_LIFT_START',
      'SK_LEFT_RETURN',
      'SK_RIGHT_LIFT_START',
      'SK_RIGHT_RETURN',
    ] as const

    const map: SideKickVoiceCueMap = new Map()

    for (let step = 1; step <= 5; step++) {
      const cues = new Map()

      for (const code of commonCodes) {
        cues.set(code, `${base}${code}.m4a`)
      }

      cues.set(stepStarts[step - 1], `${base}${stepStarts[step - 1]}.m4a`)

      map.set(step, cues)
    }

    map.set(
      0,
      new Map([['SK_STUDY_COMPLETED', `${base}SK_STUDY_COMPLETED.m4a`]]),
    )

    devVoiceCuesRef.current = map

    return () => {
      devVoiceCuesRef.current = new Map()
    }
  }, [])

  // 진입 즉시 STEP 1 안내를 자동 재생한다. 브라우저가 막으면 버튼으로 켠다.
  useEffect(() => {
    const player = devVoicePlayerRef.current
    if (!player || devAutoActivationPlayerRef.current === player) return

    devAutoActivationPlayerRef.current = player
    const decision: SideKickVoiceDecision = {
      eventCode: 'SK_READY_START',
      step: 1,
      priority: 'NORMAL',
    }
    let cancelled = false

    void player.activate(decision).then(
      () => {
        if (cancelled) return
        devInitialVoiceDecisionRef.current = decision
        setDevVoiceEnabled(true)
        setVoiceEnabled(true)
        setDevVoiceError(null)
        setVoiceError(null)
      },
      () => {
        if (cancelled) return
        setDevVoiceEnabled(false)
        setVoiceEnabled(false)
        setDevVoiceError(
          '자동 음성 재생이 차단됐습니다. 테스트 음성 켜기 버튼을 눌러 주세요.',
        )
        setVoiceError(
          '자동 음성 재생이 차단됐습니다. 음성 켜기 버튼을 눌러 주세요.',
        )
      },
    )

    return () => {
      cancelled = true
    }
  }, [runsRuntimeWithoutApi])

  useEffect(() => {
    if (runsRuntimeWithoutApi) return

    let cancelled = false
    dbConfigRef.current = null

    void getSideKickStudyConfig()
      .then((config) => {
        if (cancelled) return
        dbConfigRef.current = config
        stepSessionIdRef.current = crypto.randomUUID()
        if (
          !matchesSideKickRuntimeCriteriaVersion(
            config,
            SIDE_KICK_RUNTIME_CRITERIA.criteriaVersion,
          )
        ) {
          setRecordSaveError(
            '현재 JSON 기준의 DB criteria_version 식별자가 없어 STEP 기록을 저장하지 않습니다.',
          )
        }
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
  }, [runsRuntimeWithoutApi])

  useEffect(
    () => () => {
      if (resultToastTimerRef.current !== null) {
        window.clearTimeout(resultToastTimerRef.current)
      }
    },
    [],
  )

  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setFullscreen(isFullscreen())
    onChange()
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // 운동 화면을 떠나면(뒤로가기 포함) 전체 화면도 풀어 준다.
  useEffect(
    () => () => {
      void exitFullscreen()
    },
    [],
  )

  // 사용자용 화면은 화면 전체를 덮으므로 뒤쪽 페이지가 스크롤되지 않게 막는다.
  useEffect(() => {
    if (isDevStudy) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isDevStudy])

  // 개발 화면(/dev)에는 마무리 화면이 없으니 개발용 시작 화면으로 돌아간다.
  function leaveWorkout(outcome: WorkoutOutcome) {
    void exitFullscreen()
    setExitConfirmOpen(false)
    if (window.location.pathname.startsWith('/dev/')) {
      navigate('/dev/sidekick/start', { replace: true })
      return
    }
    navigate(WORKOUT_COMPLETE_PATH, {
      replace: true,
      state: { outcome, mode: 'study' },
    })
  }

  function toggleFullscreen() {
    void (fullscreen ? exitFullscreen() : enterFullscreen())
  }

  const step = STEPS[stepIndex]
  const trainerPlaybackRate = step.no === 1 ? 1 : 0.65
  const completed = runtimeSnapshot?.flow.completed === true

  useEffect(() => {
    const video = trainerRef.current
    if (!video) return

    video.defaultPlaybackRate = trainerPlaybackRate
    video.playbackRate = trainerPlaybackRate

    void video.play().then(
      () => setTrainerVideoError(null),
      () =>
        setTrainerVideoError(
          '트레이너 영상을 자동 재생하지 못했습니다. 브라우저 설정을 확인하세요.',
        ),
    )
  }, [step.no, trainerPlaybackRate])

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
      const currentStep = latestStepRef.current

      if (currentStep > 5) return

      // 판정은 JSON Runtime만으로 돌고 DB 설정에 의존하지 않는다.
      // DB 설정은 STEP 기록 저장에만 쓴다. 설정이 없으면(로컬 등) 저장만 건너뛴다.
      const readyEvaluation =
        currentStep === 1 ? scoreSideKickStep(1, frame.landmarks, null) : null

      const readyPoseValid =
        readyEvaluation?.judgment.status === 'EVALUATED' &&
        readyEvaluation.judgment.score >= 80

      const snapshot = runtimeRef.current.update(frame, {
        readyPoseValid,
        feedbackIssued: feedbackIssuedRef.current,
      })
      feedbackIssuedRef.current = false

      setRuntimeSnapshot(snapshot)

      const records = snapshot.flow.records
      if (records.length < shownRecordCountRef.current) {
        shownRecordCountRef.current = records.length
      }
      if (records.length > shownRecordCountRef.current) {
        shownRecordCountRef.current = records.length
        setResultToast(records[records.length - 1])
        if (resultToastTimerRef.current !== null) {
          window.clearTimeout(resultToastTimerRef.current)
        }
        resultToastTimerRef.current = window.setTimeout(() => {
          setResultToast(null)
          resultToastTimerRef.current = null
        }, 3500)
      }

      if (isDevStudy ? devVoiceEnabled : voiceEnabled) {
        let decisions = devVoiceBridgeRef.current.update(
          frame.timestampMs,
          snapshot,
        )
        const initialDecision = devInitialVoiceDecisionRef.current
        if (initialDecision) {
          decisions = decisions.filter(
            (decision) =>
              decision.eventCode !== initialDecision.eventCode ||
              decision.step !== initialDecision.step,
          )
          devInitialVoiceDecisionRef.current = null
        }
        devVoicePlayerRef.current?.enqueue(decisions)
        feedbackIssuedRef.current = decisions.some((decision) =>
          CORRECTION_EVENTS.has(decision.eventCode),
        )
      }

      if (!runsRuntimeWithoutApi) {
        const config = dbConfigRef.current
        const sessionId = stepSessionIdRef.current

        for (const event of snapshot.flow.events) {
          const record = flowRecordForEvent(event, snapshot.flow.records)
          if (!record || savingStepsRef.current.has(record.step)) continue

          // DB 설정을 받지 못한 환경은 판정만 하고 저장하지 않는다.
          if (!config || !sessionId) continue

          savingStepsRef.current.add(record.step)

          if (
            !matchesSideKickRuntimeCriteriaVersion(
              config,
              SIDE_KICK_RUNTIME_CRITERIA.criteriaVersion,
            )
          ) {
            setRecordSaveError(
              '현재 JSON 기준의 DB criteria_version 식별자가 없어 STEP 기록을 저장하지 않았습니다.',
            )
            continue
          }

          const stepInfo = config.steps.find(
            (item) => item.step_no === record.step,
          )
          if (!stepInfo) {
            setRecordSaveError(
              'STEP ID 설정을 찾지 못해 기록을 저장하지 않았습니다.',
            )
            continue
          }

          const generation = saveGenerationRef.current
          void saveSideKickStep({
            record,
            exerciseId: config.exercise_id,
            exerciseStepId: stepInfo.exercise_step_id,
            exerciseCriteriaVersionId: config.exercise_criteria_version_id,
            criteriaVersion: config.criteria_version,
            stepSessionId: sessionId,
            measurementProfileVersion:
              SIDE_KICK_RUNTIME_CRITERIA.measurementProfileVersion,
          })
            .then((saved) => {
              console.info('STEP DB SAVE OK:', saved.id, record.step)
            })
            .catch((error) => {
              console.error('STEP DB SAVE FAILED:', record.step, error)
              if (generation === saveGenerationRef.current) {
                setRecordSaveError(
                  'STEP 기록을 저장하지 못했습니다. 판정 결과는 유지됩니다.',
                )
              }
            })
        }
      }

      const nextStep = snapshot.flow.step

      if (nextStep !== null && nextStep !== currentStep) {
        latestStepRef.current = nextStep
        setStepIndex(nextStep - 1)
        setVideoEnded(false)
      }
    },
    [runsRuntimeWithoutApi, isDevStudy, devVoiceEnabled, voiceEnabled],
  )

  const pose = usePoseLandmarker(
    webcamRef,
    poseCanvasRef,
    cameraReady,
    handlePoseFrame,
  )

  async function enableVoice() {
    const step = latestStepRef.current as 1 | 2 | 3 | 4 | 5
    const player = devVoicePlayerRef.current
    if (!player) {
      setVoiceError('음성 안내를 준비하지 못했습니다.')
      return
    }

    try {
      const decision: SideKickVoiceDecision = {
        eventCode: STEP_START_EVENTS[step],
        step,
        priority: 'NORMAL',
      }
      await player.activate(decision)
      devInitialVoiceDecisionRef.current = decision
      devVoiceBridgeRef.current.reset()
      setVoiceEnabled(true)
      setVoiceError(null)
    } catch {
      setVoiceEnabled(false)
      setVoiceError('브라우저에서 음성 재생이 차단됐습니다.')
    }
  }

  async function enableDevVoice() {
    const player = devVoicePlayerRef.current
    if (!player) {
      setDevVoiceError('음성 안내를 준비하지 못했습니다.')
      return
    }

    const step = latestStepRef.current as 1 | 2 | 3 | 4 | 5
    const decision: SideKickVoiceDecision = {
      eventCode: STEP_START_EVENTS[step],
      step,
      priority: 'NORMAL',
    }

    try {
      await player.activate(decision)
      devInitialVoiceDecisionRef.current = decision
      devVoiceBridgeRef.current.reset()
      setDevVoiceEnabled(true)
      setDevVoiceError(null)
    } catch {
      setDevVoiceEnabled(false)
      setDevVoiceError('브라우저에서 음성 재생이 차단됐습니다.')
    }
  }

  function restartTrainerVideo() {
    const video = trainerRef.current
    if (!video) return

    video.currentTime = 0
    video.defaultPlaybackRate = trainerPlaybackRate
    video.playbackRate = trainerPlaybackRate
    setVideoEnded(false)

    void video.play().then(
      () => setTrainerVideoError(null),
      () =>
        setTrainerVideoError(
          '트레이너 영상을 재생하지 못했습니다. 브라우저 설정을 확인하세요.',
        ),
    )
  }

  function restartStudy() {
    saveGenerationRef.current += 1
    savingStepsRef.current.clear()
    devVoicePlayerRef.current?.stop()
    devVoiceBridgeRef.current.reset()
    devInitialVoiceDecisionRef.current = null
    feedbackIssuedRef.current = false
    if (!runsRuntimeWithoutApi && dbConfigRef.current) {
      stepSessionIdRef.current = crypto.randomUUID()
    }
    lastTrackingOkAtRef.current = Date.now()
    lastTrackingVoiceAtRef.current = null
    runtimeRef.current.reset()
    setRuntimeSnapshot(null)
    latestStepRef.current = 1

    setStepIndex(0)
    setVideoEnded(false)
    setTrackingMessage(null)
    setRecordSaveError(null)
    shownRecordCountRef.current = 0
    if (resultToastTimerRef.current !== null) {
      window.clearTimeout(resultToastTimerRef.current)
      resultToastTimerRef.current = null
    }
    setResultToast(null)

    // STEP 1에 머물러 있던 경우에도 영상 처음부터 재생.
    restartTrainerVideo()
  }

  return (
    <main className="flex-1 bg-primary-soft px-4 py-10 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          className={
            isDevStudy
              ? 'flex flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-primary-strong sm:p-5'
              : undefined
          }
        >
          {/* 멀리서 운동하므로 트레이너 영상을 크게 두고, 내 자세는 오른쪽 아래 작은 창(PIP)으로 겹쳐 보여 준다. */}
          <div
            className={
              isDevStudy
                ? 'relative aspect-video w-full overflow-hidden rounded-2xl bg-cocoa'
                : 'fixed inset-0 z-40 overflow-hidden bg-cocoa'
            }
          >
            <video
              key={step.no}
              ref={trainerRef}
              src={`/videos/sidekick/step${step.no}.mp4`}
              className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              autoPlay
              muted
              playsInline
              controls={false}
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              onLoadedMetadata={(event) => {
                event.currentTarget.defaultPlaybackRate = trainerPlaybackRate
                event.currentTarget.playbackRate = trainerPlaybackRate
              }}
              onEnded={() => setVideoEnded(true)}
            />

            {isFrontendOnlyMode && (
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-cocoa/70 px-3 py-1 text-xs text-white backdrop-blur-sm sm:bottom-5">
                체험 모드 · 운동 기록은 저장되지 않습니다.
              </p>
            )}

            {/* STEP 진행: 5개 점으로 통과 여부를 보여 준다. */}
            <div className="absolute bottom-4 left-3 flex flex-col gap-2 rounded-2xl bg-cocoa/70 px-3 py-2 text-white backdrop-blur-sm sm:bottom-5 sm:left-4">
              <p className="text-sm font-semibold">
                STEP {step.no}/5 · {step.title}
              </p>
              <ol className="flex items-center gap-1.5" aria-label="STEP 결과">
                {STEPS.map((item) => {
                  const record = runtimeSnapshot?.flow.records.find(
                    (r) => r.step === item.no,
                  )
                  const state = record?.outcome ?? 'PENDING'
                  const current = !completed && item.no === step.no
                  return (
                    <li
                      key={item.no}
                      aria-label={`STEP ${item.no} ${OUTCOME_LABEL[state]}`}
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${OUTCOME_DOT[state]} ${current ? 'ring-2 ring-white' : ''}`}
                    >
                      {state === 'PASS' ? '✓' : item.no}
                    </li>
                  )
                })}
              </ol>
            </div>

            {resultToast && (
              <p
                role="status"
                className={`absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-5 py-2 text-base font-semibold shadow-lg sm:top-4 ${
                  resultToast.outcome === 'PASS'
                    ? 'bg-sage text-white'
                    : 'bg-primary text-cocoa'
                }`}
              >
                {OUTCOME_MESSAGE[resultToast.outcome](resultToast.step)}
              </p>
            )}

            {(runtimeSnapshot?.lift?.holdProgressMs ?? 0) > 0 && (
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-1.5 bg-white/30"
              >
                <div
                  className="h-full bg-brand transition-all"
                  style={{
                    width: `${Math.min(100, ((runtimeSnapshot?.lift?.holdProgressMs ?? 0) / 2000) * 100)}%`,
                  }}
                />
              </div>
            )}

            {completed && runtimeSnapshot && (
              <div className="absolute inset-0 flex items-center justify-center bg-cocoa/75 p-4">
                <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl bg-white p-6 text-cocoa">
                  <p className="text-xl font-semibold">5개 STEP 학습 완료</p>
                  <ul className="flex flex-col gap-1.5 text-[15px]">
                    {runtimeSnapshot.flow.records.map((record) => (
                      <li key={record.step} className="flex justify-between">
                        <span>STEP {record.step}</span>
                        <span className="font-semibold">
                          {OUTCOME_LABEL[record.outcome]}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="brand"
                    onClick={() => leaveWorkout('completed')}
                  >
                    운동 나가기
                  </Button>
                  <Button variant="brand-outline" onClick={restartStudy}>
                    학습 처음부터 다시 시작
                  </Button>
                </div>
              </div>
            )}

            <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
              <Button
                variant="brand"
                size="sm"
                onClick={() => setExitConfirmOpen(true)}
              >
                나가기
              </Button>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2 sm:top-4 sm:right-4">
              {!isDevStudy && !voiceEnabled && (
                <Button
                  variant="brand"
                  size="sm"
                  onClick={() => void enableVoice()}
                >
                  음성 켜기
                </Button>
              )}
              <Button variant="brand" size="sm" onClick={toggleFullscreen}>
                {fullscreen ? '전체 화면 해제' : '전체 화면'}
              </Button>
            </div>

            {!isDevStudy && voiceEnabled && (
              <p role="status" className="sr-only">
                음성 안내가 켜졌습니다.
              </p>
            )}

            {(trainerVideoError ||
              cameraError ||
              pose.error ||
              trackingMessage ||
              (!isDevStudy && !voiceEnabled && voiceError)) && (
              <div className="absolute top-16 left-1/2 flex w-[90%] -translate-x-1/2 flex-col items-center gap-2 sm:top-20">
                {[
                  trainerVideoError,
                  cameraError,
                  pose.error,
                  isDevStudy || voiceEnabled ? null : voiceError,
                ]
                  .filter((message): message is string => Boolean(message))
                  .map((message) => (
                    <p
                      key={message}
                      role="alert"
                      className="rounded-full bg-white px-4 py-1.5 text-sm text-danger shadow-lg"
                    >
                      {message}
                    </p>
                  ))}
                {trackingMessage && (
                  <p
                    role="status"
                    className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-text shadow-lg"
                  >
                    {trackingMessage}
                  </p>
                )}
              </div>
            )}

            <div
              className="absolute right-3 bottom-3 aspect-video w-[34%] max-w-[360px] overflow-hidden rounded-xl bg-cocoa shadow-lg ring-2 ring-white/80 sm:right-4 sm:bottom-4 sm:w-[22%]"
              aria-label="내 자세 (웹캠)"
              role="group"
            >
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
          </div>
        </section>

        {isDevStudy ? (
          <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 text-cocoa ring-1 ring-primary-strong">
            <h2 className="text-xl font-semibold">실시간 STEP 테스트</h2>
            <div className="flex flex-col items-start gap-2 rounded-xl bg-primary-soft p-4">
              <p className="font-semibold">신규 STEP 음성 코칭</p>
              <Button
                variant="brand-outline"
                size="sm"
                onClick={() => {
                  if (devVoiceEnabled) {
                    devVoicePlayerRef.current?.stop()
                    devVoiceBridgeRef.current.reset()
                    devInitialVoiceDecisionRef.current = null
                    setDevVoiceEnabled(false)
                  } else {
                    void enableDevVoice()
                  }
                }}
              >
                {devVoiceEnabled ? '테스트 음성 끄기' : '테스트 음성 켜기'}
              </Button>
              <p role="status" className="text-sm text-cocoa-secondary">
                {devVoiceStatus}
              </p>
              {devVoiceError && (
                <p role="alert" className="text-sm text-brand-text">
                  {devVoiceError}
                </p>
              )}
            </div>
            <p>
              {runtimeSnapshot?.flow.completed
                ? `최종 결과: ${runtimeSnapshot.flow.finalResult}`
                : `현재 STEP: ${runtimeSnapshot?.flow.step ?? 1}`}
            </p>
            <p>READY 샘플: {runtimeSnapshot?.readySampleCount ?? 0}개</p>
            <p>
              READY 기준선:{' '}
              {runtimeSnapshot?.baseline
                ? `왼쪽 ${runtimeSnapshot.baseline.left.toFixed(1)}도 / 오른쪽 ${runtimeSnapshot.baseline.right.toFixed(1)}도`
                : '측정 중'}
            </p>
            <p>상승 판정: {runtimeSnapshot?.lift?.state ?? '-'}</p>
            <p>
              자세 유지:{' '}
              {((runtimeSnapshot?.lift?.holdProgressMs ?? 0) / 1000).toFixed(1)}{' '}
              / 2.0초
            </p>
            <p>복귀 판정: {runtimeSnapshot?.returning?.state ?? '-'}</p>
            <p className="text-sm text-cocoa-secondary">
              개발자 테스트 전용. 신규 음성 이벤트 연결 중이며 STEP 기록 DB
              저장은 실행하지 않습니다.
            </p>
            <div>
              <Button variant="brand-outline" size="sm" onClick={restartStudy}>
                학습 처음부터 다시 시작
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <ConfirmDialog
        open={exitConfirmOpen}
        title="운동을 그만할까요?"
        description="나가면 운동 화면이 종료돼요. 무리하지 말고 필요하면 쉬어 가세요."
        confirmLabel="나가기"
        cancelLabel="계속하기"
        onConfirm={() => leaveWorkout('stopped')}
        onCancel={() => setExitConfirmOpen(false)}
      />
    </main>
  )
}
