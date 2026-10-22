import { PoseLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Detection, PoseLandmark } from './types'

export type OverlayOptions = {
  landmarks: boolean
  skeleton: boolean
  landmarkNumbers: boolean
}

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  landmarksRef: RefObject<PoseLandmark[] | null>
  enabled: boolean
  options: OverlayOptions
  detections: Detection[]
  showBoxes: boolean
}

/**
 * MediaPipe 결과 ref를 매 animation frame 읽어 그린다. Pose 추론을 추가로 호출하지 않고,
 * object-cover의 crop과 화면 미러링을 Canvas 좌표에만 적용한다.
 */
export function PoseOverlay({
  videoRef,
  landmarksRef,
  enabled,
  options,
  detections,
  showBoxes,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    const resize = () => {
      const rect = video.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    const observer = new ResizeObserver(resize)
    observer.observe(video)
    resize()
    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      context.clearRect(0, 0, width, height)
      const landmarks = enabled ? landmarksRef.current : null
      if (video.videoWidth && video.videoHeight) {
        const scale = Math.max(
          width / video.videoWidth,
          height / video.videoHeight,
        )
        const renderedWidth = video.videoWidth * scale
        const renderedHeight = video.videoHeight * scale
        const offsetX = (width - renderedWidth) / 2
        const offsetY = (height - renderedHeight) / 2
        const point = (landmark: PoseLandmark) => ({
          x: offsetX + (1 - landmark.x) * renderedWidth,
          y: offsetY + landmark.y * renderedHeight,
        })
        if (showBoxes) {
          context.lineWidth = Math.max(2, width / 500)
          context.font = `${Math.max(11, width / 58)}px sans-serif`
          for (const detection of detections) {
            const left =
              offsetX +
              (1 - (detection.x + detection.width) / video.videoWidth) *
                renderedWidth
            const top =
              offsetY + (detection.y / video.videoHeight) * renderedHeight
            const boxWidth =
              (detection.width / video.videoWidth) * renderedWidth
            const boxHeight =
              (detection.height / video.videoHeight) * renderedHeight
            context.strokeStyle =
              detection.classId === 0 ? '#facc15' : '#22d3ee'
            context.strokeRect(left, top, boxWidth, boxHeight)
            const label = `#${detection.detectionId} ${detection.className} ${(detection.confidence * 100).toFixed(0)}%`
            context.fillStyle = detection.classId === 0 ? '#facc15' : '#22d3ee'
            context.fillRect(
              left,
              Math.max(0, top - 18),
              context.measureText(label).width + 6,
              18,
            )
            context.fillStyle = '#111827'
            context.fillText(label, left + 3, Math.max(13, top - 5))
          }
        }
        context.lineCap = 'round'
        if (landmarks?.length && options.skeleton) {
          context.strokeStyle = '#22d3ee'
          context.lineWidth = Math.max(2, width / 480)
          for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
            const a = landmarks[start]
            const b = landmarks[end]
            if (!a || !b) continue
            const from = point(a)
            const to = point(b)
            context.beginPath()
            context.moveTo(from.x, from.y)
            context.lineTo(to.x, to.y)
            context.stroke()
          }
        }
        if (landmarks?.length && options.landmarks) {
          context.fillStyle = '#facc15'
          context.font = `${Math.max(11, width / 58)}px sans-serif`
          landmarks.forEach((landmark, index) => {
            const position = point(landmark)
            context.beginPath()
            context.arc(
              position.x,
              position.y,
              Math.max(3, width / 180),
              0,
              Math.PI * 2,
            )
            context.fill()
            if (options.landmarkNumbers) {
              context.fillStyle = '#111827'
              context.fillText(String(index), position.x + 4, position.y - 4)
              context.fillStyle = '#facc15'
            }
          })
        }
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [detections, enabled, landmarksRef, options, showBoxes, videoRef])
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden
    />
  )
}
