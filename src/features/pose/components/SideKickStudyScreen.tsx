import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [stepIndex, setStepIndex] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [trainerVideoError, setTrainerVideoError] = useState<string | null>(
    null,
  )
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null)
  const [recordSaveError, setRecordSaveError] = useState<string | null>(null)

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
  const lastTrackingOkAtRef = useRef<number>(0)
  const lastTrackingVoiceAtRef = useRef<number | null>(null)

  const devVoiceBridgeRef = useRef(new SideKickVoiceBridge())
  const devVoicePlayerRef = useRef<SideKickVoicePlayer | null>(null)
  const devVoiceCuesRef = useRef<SideKickVoiceCueMap>(new Map())
  const [devVoiceEnabled, setDevVoiceEnabled] = useState(false)
  const devVoiceStatus = '로컬 음성 16종 준비 완료'
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

  useEffect(() => {
    if (isDevStudy) return

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
  }, [isDevStudy])

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

      // 사용자용 화면은 실제 DB ID를 받은 뒤 새 Runtime을 시작한다.
      if (!isDevStudy && !dbConfigRef.current) return

      // 개발/사용자 화면 모두 JSON Runtime 하나만 실행한다.
      if (isDevStudy || dbConfigRef.current) {
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

        if (isDevStudy ? devVoiceEnabled : voiceEnabled) {
          const decisions = devVoiceBridgeRef.current.update(
            frame.timestampMs,
            snapshot,
          )
          devVoicePlayerRef.current?.enqueue(decisions)
          feedbackIssuedRef.current = decisions.some((decision) =>
            CORRECTION_EVENTS.has(decision.eventCode),
          )
        }

        if (!isDevStudy) {
          const config = dbConfigRef.current
          const sessionId = stepSessionIdRef.current

          for (const event of snapshot.flow.events) {
            const record = flowRecordForEvent(event, snapshot.flow.records)
            if (!record || savingStepsRef.current.has(record.step)) continue

            savingStepsRef.current.add(record.step)

            if (
              !config ||
              !sessionId ||
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

        return
      }
    },
    [isDevStudy, devVoiceEnabled, voiceEnabled],
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
      await player.activate({
        eventCode: STEP_START_EVENTS[step],
        step,
        priority: 'NORMAL',
      })
      setVoiceEnabled(true)
      setVoiceError(null)
    } catch {
      setVoiceEnabled(false)
      setVoiceError('브라우저에서 음성 재생이 차단됐습니다.')
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
    feedbackIssuedRef.current = false
    if (!isDevStudy && dbConfigRef.current) {
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

          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
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
          </div>

          {trainerVideoError && (
            <p role="alert" className="text-sm text-red-600">
              {trainerVideoError}
            </p>
          )}

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

      {isDevStudy ? (
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">실시간 STEP 테스트</h2>
          <div className="space-y-2 rounded-lg border p-3">
            <p className="font-semibold">신규 STEP 음성 코칭</p>
            <button
              type="button"
              onClick={() => {
                if (devVoiceEnabled) {
                  devVoicePlayerRef.current?.stop()
                  devVoiceBridgeRef.current.reset()
                  setDevVoiceEnabled(false)
                } else {
                  devVoiceBridgeRef.current.reset()
                  setDevVoiceEnabled(true)
                }
              }}
              className="rounded-lg border px-4 py-2"
            >
              {devVoiceEnabled ? '테스트 음성 끄기' : '테스트 음성 켜기'}
            </button>
            <p role="status" className="text-sm text-gray-500">
              {devVoiceStatus}
            </p>
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
            {((runtimeSnapshot?.lift?.holdProgressMs ?? 0) / 1000).toFixed(1)} /
            2.0초
          </p>
          <p>복귀 판정: {runtimeSnapshot?.returning?.state ?? '-'}</p>
          <p className="text-sm text-gray-500">
            개발자 테스트 전용. 신규 음성 이벤트 연결 중이며 STEP 기록 DB 저장은
            실행하지 않습니다.
          </p>
          <button
            type="button"
            onClick={restartStudy}
            className="rounded-lg border px-4 py-2"
          >
            학습 처음부터 다시 시작
          </button>
        </section>
      ) : (
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">STEP 진행 상태</h2>

          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
            <p className="font-semibold">음성 코칭</p>

            <button
              type="button"
              disabled={voiceEnabled}
              onClick={() => void enableVoice()}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              {voiceEnabled ? '음성 켜짐' : '음성 켜기'}
            </button>

            {voiceEnabled && <p role="status">음성 안내가 켜졌습니다.</p>}

            {voiceError && (
              <p role="alert" className="text-sm text-red-600">
                {voiceError}
              </p>
            )}
          </div>

          {completed ? (
            <p className="font-semibold text-green-700">5개 STEP 학습 완료</p>
          ) : (
            <p className="font-semibold">
              현재 STEP {runtimeSnapshot?.flow.step ?? 1}
            </p>
          )}

          <p>상승 판정: {runtimeSnapshot?.lift?.state ?? '측정 대기'}</p>

          <p>복귀 판정: {runtimeSnapshot?.returning?.state ?? '-'}</p>

          <p>
            자세 유지:{' '}
            {((runtimeSnapshot?.lift?.holdProgressMs ?? 0) / 1000).toFixed(1)}
            {' / 2초'}
          </p>

          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${Math.min(100, ((runtimeSnapshot?.lift?.holdProgressMs ?? 0) / 2000) * 100)}%`,
              }}
            />
          </div>

          <p>코칭 횟수: {runtimeSnapshot?.flow.feedbackCount ?? 0} / 5회</p>

          {recordSaveError && (
            <p role="status" className="font-semibold text-amber-700">
              {recordSaveError}
            </p>
          )}

          {runtimeSnapshot && runtimeSnapshot.flow.records.length > 0 && (
            <div className="space-y-1 rounded-lg bg-gray-50 p-3">
              <p className="font-semibold">STEP별 결과</p>

              {runtimeSnapshot.flow.records.map((record) => (
                <p key={record.step}>
                  STEP {record.step}: {record.outcome}
                  {' · 코칭 '}
                  {record.feedbackCount}회
                </p>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500">
            JSON Runtime 기준으로 STEP을 판정합니다. 숫자 점수는 생성하거나
            표시하지 않습니다.
          </p>

          <button
            type="button"
            onClick={restartStudy}
            className="rounded-lg border px-4 py-2"
          >
            학습 처음부터 다시 시작
          </button>
        </section>
      )}
    </main>
  )
}
