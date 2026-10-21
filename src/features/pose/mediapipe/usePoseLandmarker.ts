import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

export type PoseTrackingStatus =
  'LOADING' | 'READY' | 'TRACKING' | 'NOT_DETECTED' | 'ERROR'

export type PoseLandmarkPoint = {
  x: number
  y: number
  z: number
  visibility?: number
  presence?: number
}

export type PoseFrame = {
  timestampMs: number
  landmarks: PoseLandmarkPoint[]
}

const CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]

export function usePoseLandmarker(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  onFrame?: (frame: PoseFrame) => void,
) {
  const [status, setStatus] = useState<PoseTrackingStatus>('READY')
  const [error, setError] = useState<string | null>(null)
  const [landmarkCount, setLandmarkCount] = useState(0)

  useEffect(() => {
    if (!enabled) return

    let disposed = false
    let rafId = 0
    let landmarker: PoseLandmarker | null = null
    let lastDetectAt = -Infinity
    let frameCount = 0

    const draw = (landmarks: PoseLandmarkPoint[] | null) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const width = video.videoWidth
      const height = video.videoHeight
      if (width <= 0 || height <= 0) return

      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, width, height)
      if (!landmarks) return

      const visible = (index: number) => {
        const point = landmarks[index]
        return (
          point !== undefined &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.y) &&
          (point.visibility ?? 1) >= 0.5 &&
          (point.presence ?? 1) >= 0.5
        )
      }

      ctx.strokeStyle = '#38f3b4'
      ctx.lineWidth = Math.max(2, width / 220)

      for (const [a, b] of CONNECTIONS) {
        if (!visible(a) || !visible(b)) continue

        ctx.beginPath()
        ctx.moveTo(landmarks[a].x * width, landmarks[a].y * height)
        ctx.lineTo(landmarks[b].x * width, landmarks[b].y * height)
        ctx.stroke()
      }

      ctx.fillStyle = '#ffcf49'

      for (let index = 0; index < landmarks.length; index++) {
        if (!visible(index)) continue

        ctx.beginPath()
        ctx.arc(
          landmarks[index].x * width,
          landmarks[index].y * height,
          Math.max(3, width / 160),
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    }

    const detect = () => {
      if (disposed || !landmarker) return

      const video = videoRef.current

      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0
      ) {
        const timestampMs = performance.now()

        // 약 15fps로 분석하여 브라우저 부하를 제한한다.
        if (timestampMs - lastDetectAt >= 66) {
          lastDetectAt = timestampMs

          try {
            const result = landmarker.detectForVideo(video, timestampMs)
            const landmarks = result.landmarks[0] ?? null

            draw(landmarks)

            // 다음 STEP 점수 계산기에서 사용할 전체 33개 좌표
            if (landmarks) {
              onFrame?.({
                timestampMs,
                landmarks: landmarks.map((point) => ({
                  x: point.x,
                  y: point.y,
                  z: point.z,
                  visibility: point.visibility,
                  presence: point.presence,
                })),
              })
            }

            frameCount++

            if (frameCount % 5 === 0) {
              setStatus(landmarks ? 'TRACKING' : 'NOT_DETECTED')
              setLandmarkCount(landmarks?.length ?? 0)
            }
          } catch (cause) {
            console.error('Pose detection failed:', cause)
            setStatus('ERROR')
            setError('자세 분석 도중 오류가 발생했습니다.')
            return
          }
        }
      }

      rafId = requestAnimationFrame(detect)
    }

    const initialize = async () => {
      setStatus('LOADING')
      setError(null)

      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm')

        if (disposed) return

        const options = {
          baseOptions: {
            modelAssetPath: '/mediapipe/pose_landmarker_full.task',
            delegate: 'CPU' as const,
          },
          runningMode: 'VIDEO' as const,
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }

        const instance = await PoseLandmarker.createFromOptions(vision, options)

        if (disposed) {
          instance.close()
          return
        }

        landmarker = instance
        setStatus('READY')
        rafId = requestAnimationFrame(detect)
      } catch (cause) {
        console.error('MediaPipe initialization failed:', cause)

        if (!disposed) {
          setStatus('ERROR')
          setError(
            'MediaPipe 모델을 불러오지 못했습니다. 모델 파일과 콘솔 오류를 확인하세요.',
          )
        }
      }
    }

    void initialize()

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      landmarker?.close()
      draw(null)
    }
  }, [enabled, videoRef, canvasRef, onFrame])

  return { status, error, landmarkCount }
}
