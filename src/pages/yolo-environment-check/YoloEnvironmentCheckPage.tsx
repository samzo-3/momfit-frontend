import { useEffect, useRef, useState } from 'react'
import { ENVIRONMENT_CHECK_CONFIG } from '../../features/yolo-environment-check/environment-policy'
import { EnvironmentEventLogger } from '../../features/yolo-environment-check/events/event-logger'
import { downloadJson } from '../../features/yolo-environment-check/events/json-download'
import { saveEnvironmentSession } from '../../features/yolo-environment-check/events/event-storage'
import { PoseOverlay } from '../../features/yolo-environment-check/pose-overlay'
import {
  EVENT_DESCRIPTIONS,
  type EnvironmentEventType,
  type EnvironmentSession,
  type EnvironmentSessionResult,
} from '../../features/yolo-environment-check/events/event-types'
import type { ExerciseMode } from '../../features/yolo-environment-check/types'
import { useEnvironmentCheck } from '../../features/yolo-environment-check/use-environment-check'

type Screen = 'SELECT' | 'CHECK' | 'MOCK'
type SaveStatus = 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'

export default function YoloEnvironmentCheckPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const loggerRef = useRef(new EnvironmentEventLogger())
  const previousRef = useRef({
    people: 0,
    pose: false,
    guide: false,
    ready: false,
  })
  const [screen, setScreen] = useState<Screen>('SELECT')
  const [mode, setMode] = useState<ExerciseMode>('EXERCISE')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [session, setSession] = useState<EnvironmentSession | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('IDLE')
  const [overlay, setOverlay] = useState({
    boxes: true,
    guide: true,
    landmarks: true,
    skeleton: true,
    landmarkNumbers: false,
  })

  const record = (type: EnvironmentEventType, details = {}) => {
    if (loggerRef.current.record(type, details)) {
      console.info('[YOLO event]', type, details)
      setSession(loggerRef.current.snapshot())
    }
  }
  const finishSession = (
    result: EnvironmentSessionResult,
    reason: EnvironmentEventType,
    details = {},
  ) => {
    const finished = loggerRef.current.finish(result, reason, details)
    if (!finished) return
    setSession(finished)
    setSaveStatus('SAVING')
    // JSON 저장을 기다리지 않아 자동 Mock 이동이나 스트림 정리가 지연되지 않는다.
    void saveEnvironmentSession(finished)
      .then(() => setSaveStatus('SAVED'))
      .catch((cause: unknown) => {
        console.error('[YOLO] session event save failed', cause)
        setSaveStatus('ERROR')
      })
  }
  const checking = screen === 'CHECK'
  const environment = useEnvironmentCheck({
    videoRef,
    enabled: checking && cameraEnabled && cameraReady,
    onReady: () => {
      finishSession('PASS', 'PASS_AUTO_START', {
        person_count: 1,
        pose_tracked: true,
        in_guide: true,
        hold_ms: ENVIRONMENT_CHECK_CONFIG.holdMs,
      })
      setCameraEnabled(false)
      setScreen('MOCK')
    },
  })

  useEffect(() => {
    if (!checking || !cameraEnabled) return
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
        if (!cancelled) {
          setCameraReady(true)
          setSession(loggerRef.current.start(mode))
          setSaveStatus('IDLE')
          previousRef.current = {
            people: 0,
            pose: false,
            guide: false,
            ready: false,
          }
          record('CAMERA_ON')
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        const message =
          cause instanceof DOMException && cause.name === 'NotAllowedError'
            ? '카메라 권한이 거부되었습니다.'
            : '웹캠을 시작할 수 없습니다.'
        setCameraError(message)
        finishSession('ERROR', 'CHECK_ERROR', { error: message })
      })
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraReady(false)
    }
  }, [checking, cameraEnabled, mode])

  useEffect(() => {
    if (!session || session.result) return
    if (environment.debug.model === 'READY') record('MODEL_READY')
    if (environment.debug.model === 'ERROR')
      record('MODEL_ERROR', { error: environment.error })
    if (environment.provider)
      loggerRef.current.setProvider(environment.provider)
    if (environment.debug.inference !== 'SUCCESS' || !environment.result) return
    const current = {
      people: environment.result.people.length,
      pose: environment.result.fullBodyValid,
      guide: environment.result.inGuide,
      ready: environment.result.ready,
    }
    if (previousRef.current.people < 2 && current.people >= 2)
      record('MULTIPLE_PEOPLE', {
        previous_count: previousRef.current.people,
        person_count: current.people,
      })
    if (previousRef.current.people >= 2 && current.people === 1)
      record('PERSON_COUNT_NORMAL', {
        previous_count: previousRef.current.people,
        person_count: 1,
      })
    if (previousRef.current.pose && !current.pose) record('POSE_INVALID')
    // 전신 유효 상태일 때만 가이드 이탈을 기록한다. 전신 미인식과 동시에 기록하지 않는다.
    if (previousRef.current.guide && current.pose && !current.guide)
      record('ALIGNMENT_FAIL')
    if (!previousRef.current.ready && current.ready)
      record('COUNTDOWN_STARTED', { hold_ms: ENVIRONMENT_CHECK_CONFIG.holdMs })
    if (previousRef.current.ready && !current.ready)
      record('COUNTDOWN_RESET', { reason: environment.result.reason })
    const detectionSummary = {
      person_count: current.people,
      total_detection_count: environment.debug.detections.length,
      other_object_count: environment.debug.detections.length - current.people,
    }
    record('FIRST_INFERENCE', detectionSummary)
    previousRef.current = current
  }, [
    environment.debug.lastCompletedAt,
    environment.debug.model,
    environment.debug.inference,
    environment.provider,
    environment.result,
    environment.debug.detections.length,
    environment.error,
    session,
  ])

  if (screen === 'SELECT')
    return <ModeSelect setMode={setMode} setScreen={setScreen} />
  if (screen === 'MOCK')
    return (
      <MockScreen
        mode={mode}
        session={session}
        saveStatus={saveStatus}
        onReset={() => setScreen('SELECT')}
      />
    )

  const detections = environment.debug.detections
  const people = detections.filter((detection) => detection.classId === 0)
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold">환경 점검</h1>
      <div className="relative mt-5 aspect-video overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full -scale-x-100 object-cover"
        />
        {overlay.guide && (
          <div className="pointer-events-none absolute inset-[6%_12%] rounded-xl border-4 border-dashed border-yellow-300" />
        )}
        <PoseOverlay
          videoRef={videoRef}
          landmarksRef={environment.poseLandmarksRef}
          enabled={cameraEnabled && cameraReady}
          options={overlay}
          detections={detections}
          showBoxes={overlay.boxes}
        />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          className="rounded bg-brand px-4 py-2 disabled:opacity-50"
          disabled={cameraEnabled}
          onClick={() => {
            setCameraError(null)
            setCameraEnabled(true)
          }}
        >
          카메라 켜기
        </button>
        <button
          className="rounded border px-4 py-2 disabled:opacity-50"
          disabled={!cameraEnabled}
          onClick={() => {
            finishSession('CANCELLED', 'CHECK_CANCELLED')
            setCameraEnabled(false)
          }}
        >
          카메라 끄기
        </button>
      </div>
      <p className="mt-4">
        {!cameraEnabled
          ? '카메라를 켜면 분석을 시작합니다.'
          : (cameraError ??
            environment.error ??
            environment.result?.reason ??
            '카메라와 모델을 준비하고 있습니다.')}
      </p>
      <p className="mt-2 text-sm">
        전체 객체 {detections.length}개 · 사람 {people.length}명 · 기타{' '}
        {detections.length - people.length}개 ·{' '}
        {environment.provider ?? '준비 중'} ·{' '}
        {(environment.holdMs / 1000).toFixed(1)} / 2초
      </p>
      <p className="mt-1 text-sm">
        POSE_TRACKED: {environment.debug.pose === 'TRACKING' ? 'PASS' : 'FAIL'}{' '}
        · FULL_BODY_VALID: {environment.result?.fullBodyValid ? 'PASS' : 'FAIL'}{' '}
        · GUIDE_ALIGNED: {environment.result?.guideAlignment ?? 'NOT_EVALUABLE'}
      </p>
      <fieldset className="mt-3 flex flex-wrap gap-3 text-sm">
        <legend className="sr-only">시각화 옵션</legend>
        {(
          [
            ['boxes', 'YOLO Box'],
            ['landmarks', '관절 점'],
            ['skeleton', 'Skeleton'],
            ['guide', '가이드 박스'],
            ['landmarkNumbers', '관절 번호'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={overlay[key]}
              onChange={() =>
                setOverlay((current) => ({ ...current, [key]: !current[key] }))
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <section className="mt-5 rounded border p-4 text-sm">
        <h2 className="font-bold">실시간 YOLO 디버그</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          <span>
            카메라:{' '}
            {cameraReady ? 'ON' : cameraError ? 'ERROR' : 'STARTING/OFF'}
          </span>
          <span>모델: {environment.debug.model}</span>
          <span>추론: {environment.debug.inference}</span>
          <span>MediaPipe: {environment.debug.pose}</span>
          <span>
            최근 추론: {environment.debug.durationMs?.toFixed(0) ?? 'N/A'}ms
          </span>
          <span>
            주기: {environment.debug.intervalMs?.toFixed(0) ?? 'N/A'}ms
          </span>
          <span>
            성공/실패: {environment.debug.successCount}/
            {environment.debug.failureCount}
          </span>
          <span>세션 저장: {saveStatus}</span>
        </div>
        {environment.debug.fallbackReason && (
          <p className="mt-2 text-amber-700">
            WASM 대체: {environment.debug.fallbackReason}
          </p>
        )}
        <DetectionTable detections={detections} />
        <button
          className="mt-4 rounded border px-2 py-1"
          disabled={!session}
          onClick={() =>
            session &&
            downloadJson(`session-${session.session_id}.json`, session)
          }
        >
          세션 JSON 다운로드
        </button>
        <EventLog session={session} />
      </section>
      <button
        className="mt-5 rounded border px-4 py-2"
        onClick={() => {
          finishSession('FAIL', 'FAIL_MANUAL_END', {
            reason: environment.result?.reason ?? '검사 미완료',
          })
          setCameraEnabled(false)
          setScreen('SELECT')
        }}
      >
        환경 점검 끝내기
      </button>
    </main>
  )
}

function ModeSelect({
  setMode,
  setScreen,
}: {
  setMode: (mode: ExerciseMode) => void
  setScreen: (screen: Screen) => void
}) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">브라우저 YOLO 환경 점검</h1>
      <p className="mt-3">
        웹캠 영상은 저장하거나 전송하지 않고, 종료된 검사 세션의 최소 이벤트
        메타데이터만 로컬 개발 서버에 JSON으로 기록합니다.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          className="rounded bg-brand px-4 py-2"
          onClick={() => {
            setMode('EXERCISE')
            setScreen('CHECK')
          }}
        >
          일반 운동 테스트
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => {
            setMode('STUDY')
            setScreen('CHECK')
          }}
        >
          자세 배우기 테스트
        </button>
      </div>
    </main>
  )
}
function MockScreen({
  mode,
  session,
  saveStatus,
  onReset,
}: {
  mode: ExerciseMode
  session: EnvironmentSession | null
  saveStatus: SaveStatus
  onReset: () => void
}) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">
        {mode === 'EXERCISE' ? '일반 운동' : '자세 배우기'} Mock 화면
      </h1>
      <p className="mt-4">
        정상 환경을 2초 유지해 자동 시작되었습니다. 실제 Side Kick 화면은
        연결하지 않았습니다.
      </p>
      <p className="mt-2 text-sm">
        세션 JSON:{' '}
        {saveStatus === 'SAVED'
          ? '저장 완료'
          : saveStatus === 'ERROR'
            ? '저장 실패'
            : '저장 중'}
      </p>
      {session && (
        <button
          className="mt-3 rounded border px-3 py-2"
          onClick={() =>
            downloadJson(`session-${session.session_id}.json`, session)
          }
        >
          세션 JSON 다운로드
        </button>
      )}
      <button className="ml-2 mt-3 rounded border px-3 py-2" onClick={onReset}>
        다시 검사
      </button>
    </main>
  )
}
function DetectionTable({
  detections,
}: {
  detections: import('../../features/yolo-environment-check/types').Detection[]
}) {
  return (
    <table className="mt-3 w-full text-left">
      <thead>
        <tr>
          <th>#</th>
          <th>객체</th>
          <th>class</th>
          <th>신뢰도</th>
          <th>bbox x,y,w,h</th>
        </tr>
      </thead>
      <tbody>
        {detections.map((detection) => (
          <tr key={detection.detectionId}>
            <td>{detection.detectionId}</td>
            <td>{detection.className}</td>
            <td>{detection.classId}</td>
            <td>{(detection.confidence * 100).toFixed(1)}%</td>
            <td>
              {[detection.x, detection.y, detection.width, detection.height]
                .map((value) => value.toFixed(0))
                .join(', ')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
function EventLog({ session }: { session: EnvironmentSession | null }) {
  return (
    <>
      <p className="mt-3 font-bold">이벤트 로그</p>
      <pre className="mt-1 max-h-48 overflow-auto bg-slate-950 p-2 text-xs text-slate-100">
        {session?.events.length
          ? session.events
              .map(
                (event) =>
                  `[${event.at}] ${event.type} ${EVENT_DESCRIPTIONS[event.type]}${Object.keys(event.details).length ? ` ${JSON.stringify(event.details)}` : ''}`,
              )
              .join('\n')
          : '카메라를 켜면 검사 세션 이벤트가 표시됩니다.'}
      </pre>
    </>
  )
}
