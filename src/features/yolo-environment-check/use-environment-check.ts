import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  ENVIRONMENT_CHECK_CONFIG,
  evaluateEnvironment,
  poseAlignment,
} from './environment-policy'
import { ReadyHoldTracker } from './ready-hold'
import type { EnvironmentResult, PoseLandmark } from './types'
import { inferDetections, type ProviderEvent } from './yolo-inference'

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  enabled: boolean
  onReady: () => void
  inferenceIntervalMs?: number
}
export type DebugState = {
  model: 'NOT_LOADED' | 'LOADING' | 'READY' | 'ERROR'
  inference: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'ERROR'
  pose: 'LOADING' | 'TRACKING' | 'NOT_DETECTED' | 'ERROR'
  lastCompletedAt: number | null
  durationMs: number | null
  intervalMs: number | null
  successCount: number
  failureCount: number
  fallbackReason: string | null
  detections: import('./types').Detection[]
}
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`

export function useEnvironmentCheck({
  videoRef,
  enabled,
  onReady,
  inferenceIntervalMs = 500,
}: Props) {
  const [result, setResult] = useState<EnvironmentResult | null>(null)
  const [provider, setProvider] = useState<'webgpu' | 'wasm' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [holdMs, setHoldMs] = useState(0)
  const [debug, setDebug] = useState<DebugState>({
    model: 'NOT_LOADED',
    inference: 'IDLE',
    pose: 'LOADING',
    lastCompletedAt: null,
    durationMs: null,
    intervalMs: null,
    successCount: 0,
    failureCount: 0,
    fallbackReason: null,
    detections: [],
  })
  const callbackRef = useRef(onReady)
  const holdRef = useRef(new ReadyHoldTracker())
  // Canvas 오버레이가 이 ref를 직접 읽으므로 15fps Pose 결과마다 React 렌더링하지 않는다.
  const poseLandmarksRef = useRef<PoseLandmark[] | null>(null)
  useEffect(() => {
    callbackRef.current = onReady
  }, [onReady])

  useEffect(() => {
    if (!enabled) return
    const holdTracker = holdRef.current
    const onProviderEvent = (event: ProviderEvent) =>
      setDebug((current) => ({
        ...current,
        model:
          event.type === 'MODEL_LOADING'
            ? 'LOADING'
            : event.type === 'MODEL_READY'
              ? 'READY'
              : event.type === 'MODEL_ERROR'
                ? 'ERROR'
                : current.model,
        fallbackReason:
          event.type === 'PROVIDER_FALLBACK'
            ? event.detail
            : current.fallbackReason,
      }))
    let disposed = false
    let raf = 0
    let lastPose = -Infinity
    let lastYolo = -Infinity
    let running = false
    let completed = false
    let lastYoloCompletedAt = -Infinity
    let detectedPeople: import('./types').Detection[] = []
    let landmarker: PoseLandmarker | null = null
    let pose: {
      landmarks: PoseLandmark[] | null
      at: number
    } = { landmarks: null, at: 0 }
    /**
     * YOLO 완료 콜백 사이에도 최신 결과가 유효한지 확인하며 유지 시간을 계산한다.
     * 따라서 다인원에서 한 명으로 회복한 경우에도 다음 느린 추론 완료까지
     * 불필요하게 0초로 머무르지 않고, 결과가 오래되면 staleDetectionMs에서 즉시 초기화된다.
     */
    const updateHold = (at: number) => {
      const alignment =
        at - pose.at <= ENVIRONMENT_CHECK_CONFIG.staleDetectionMs
          ? poseAlignment(pose.landmarks)
          : {
              poseTracked: false,
              fullBodyValid: false,
              inGuide: false,
              guideAlignment: 'NOT_EVALUABLE' as const,
            }
      const next = evaluateEnvironment(detectedPeople, alignment)
      const yoloFresh =
        at - lastYoloCompletedAt <= ENVIRONMENT_CHECK_CONFIG.staleDetectionMs
      const hold = holdTracker.update(yoloFresh && next.ready, at)
      setHoldMs(hold.elapsedMs)
      if (hold.completed && !completed) {
        completed = true
        callbackRef.current()
      }
      return next
    }
    const loop = () => {
      if (disposed) return
      const video = videoRef.current
      const now = performance.now()
      if (
        video &&
        landmarker &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        now - lastPose >= 66
      ) {
        lastPose = now
        try {
          pose = {
            landmarks:
              landmarker.detectForVideo(video, now).landmarks[0] ?? null,
            at: now,
          }
          poseLandmarksRef.current = pose.landmarks
          setDebug((current) => ({
            ...current,
            pose: pose.landmarks ? 'TRACKING' : 'NOT_DETECTED',
          }))
        } catch {
          pose = { landmarks: null, at: now }
          poseLandmarksRef.current = null
          setDebug((current) => ({ ...current, pose: 'ERROR' }))
        }
      }
      // pose가 끊기거나 최신 YOLO 결과가 만료된 프레임에서도 카운트다운을 즉시 취소한다.
      if (lastYoloCompletedAt > -Infinity) updateHold(now)
      if (
        video &&
        !running &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        now - lastYolo >= inferenceIntervalMs
      ) {
        lastYolo = now
        running = true
        setDebug((current) => ({ ...current, inference: 'RUNNING' }))
        void inferDetections(video, onProviderEvent)
          .then((detected) => {
            if (disposed) return
            // 유지 시간은 추론을 시작한 시각이 아니라 실제 결과가 완성된 시각부터 계산한다.
            // 다인원 상태에서 한 명으로 회복한 뒤에도 과거 프레임 시간이 섞이지 않게 한다.
            const completedAt = performance.now()
            const completedWallClockAt = Date.now()
            setProvider(detected.provider)
            detectedPeople = detected.detections.filter(
              (detection) => detection.classId === 0,
            )
            lastYoloCompletedAt = completedAt
            const next = updateHold(completedAt)
            setResult(next)
            setDebug((current) => ({
              ...current,
              model: 'READY',
              inference: 'SUCCESS',
              detections: detected.detections,
              lastCompletedAt: completedWallClockAt,
              intervalMs: current.lastCompletedAt
                ? completedWallClockAt - current.lastCompletedAt
                : null,
              durationMs: detected.durationMs,
              successCount: current.successCount + 1,
            }))
          })
          .catch((cause: unknown) => {
            if (!disposed) {
              setError(
                cause instanceof Error
                  ? `YOLO 오류: ${cause.message}`
                  : 'YOLO 실행 중 오류가 발생했습니다.',
              )
              const failed = evaluateEnvironment([], {
                poseTracked: false,
                fullBodyValid: false,
                inGuide: false,
                guideAlignment: 'NOT_EVALUABLE',
              })
              setResult(failed)
              detectedPeople = []
              lastYoloCompletedAt = -Infinity
              holdTracker.reset()
              setHoldMs(0)
            }
            setDebug((current) => ({
              ...current,
              inference: 'ERROR',
              failureCount: current.failureCount + 1,
              detections: [],
            }))
          })
          .finally(() => {
            running = false
          })
      }
      raf = requestAnimationFrame(loop)
    }
    void (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          asset('mediapipe/wasm'),
        )
        const instance = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: asset('mediapipe/pose_landmarker_full.task'),
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        if (disposed) instance.close()
        else {
          landmarker = instance
          setDebug((current) => ({ ...current, pose: 'NOT_DETECTED' }))
          raf = requestAnimationFrame(loop)
        }
      } catch (cause) {
        if (!disposed)
          setError(
            cause instanceof Error
              ? `MediaPipe 오류: ${cause.message}`
              : 'MediaPipe를 불러오지 못했습니다.',
          )
      }
    })()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      landmarker?.close()
      holdTracker.reset()
      poseLandmarksRef.current = null
      setHoldMs(0)
    }
  }, [enabled, inferenceIntervalMs, videoRef])
  return { result, provider, error, holdMs, debug, poseLandmarksRef }
}
