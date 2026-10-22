import * as ort from 'onnxruntime-web'
import type { Detection } from './types'

const INPUT = 640
const asset = (name: string) =>
  `${import.meta.env.BASE_URL}yolo-environment-check/${name}`
type Letterbox = {
  scale: number
  padX: number
  padY: number
  width: number
  height: number
}
export type YoloProvider = 'webgpu' | 'wasm'
export type ProviderEvent = {
  type:
    | 'MODEL_LOADING'
    | 'MODEL_READY'
    | 'PROVIDER_SELECTED'
    | 'PROVIDER_FALLBACK'
    | 'MODEL_ERROR'
  provider?: YoloProvider
  detail: string
}
let sessionPromise: Promise<{
  session: ort.InferenceSession
  provider: YoloProvider
}> | null = null

const COCO_CLASSES = [
  'person',
  'bicycle',
  'car',
  'motorcycle',
  'airplane',
  'bus',
  'train',
  'truck',
  'boat',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'bench',
  'bird',
  'cat',
  'dog',
  'horse',
  'sheep',
  'cow',
  'elephant',
  'bear',
  'zebra',
  'giraffe',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'suitcase',
  'frisbee',
  'skis',
  'snowboard',
  'sports ball',
  'kite',
  'baseball bat',
  'baseball glove',
  'skateboard',
  'surfboard',
  'tennis racket',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'orange',
  'broccoli',
  'carrot',
  'hot dog',
  'pizza',
  'donut',
  'cake',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'toilet',
  'tv',
  'laptop',
  'mouse',
  'remote',
  'keyboard',
  'cell phone',
  'microwave',
  'oven',
  'toaster',
  'sink',
  'refrigerator',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'hair drier',
  'toothbrush',
] as const

async function createSession(provider: YoloProvider) {
  // Let Vite bundle ONNX Runtime's dynamic JSEP module. Pointing wasmPaths at
  // public .mjs files makes the dev server reject their dynamic import.
  ort.env.wasm.numThreads = 1
  return ort.InferenceSession.create(asset('yolo11n.onnx'), {
    executionProviders: [provider],
  })
}

async function session(onEvent?: (event: ProviderEvent) => void) {
  if (!sessionPromise)
    sessionPromise = (async () => {
      onEvent?.({ type: 'MODEL_LOADING', detail: 'YOLO11n ONNX 초기화' })
      try {
        const created = {
          session: await createSession('webgpu'),
          provider: 'webgpu' as const,
        }
        onEvent?.({
          type: 'MODEL_READY',
          provider: 'webgpu',
          detail: 'YOLO11n ONNX 준비 완료',
        })
        onEvent?.({
          type: 'PROVIDER_SELECTED',
          provider: 'webgpu',
          detail: 'WebGPU 선택',
        })
        return created
      } catch (webgpuError) {
        const reason =
          webgpuError instanceof Error
            ? webgpuError.message
            : String(webgpuError)
        onEvent?.({
          type: 'PROVIDER_FALLBACK',
          provider: 'wasm',
          detail: `WebGPU 초기화 실패: ${reason}`,
        })
        try {
          const created = {
            session: await createSession('wasm'),
            provider: 'wasm' as const,
          }
          onEvent?.({
            type: 'MODEL_READY',
            provider: 'wasm',
            detail: 'YOLO11n ONNX 준비 완료',
          })
          onEvent?.({
            type: 'PROVIDER_SELECTED',
            provider: 'wasm',
            detail: 'WASM 선택',
          })
          return created
        } catch (wasmError) {
          sessionPromise = null
          const detail =
            wasmError instanceof Error ? wasmError.message : String(wasmError)
          onEvent?.({ type: 'MODEL_ERROR', detail })
          throw wasmError
        }
      }
    })()
  return sessionPromise
}

function tensor(video: HTMLVideoElement) {
  const scale = Math.min(INPUT / video.videoWidth, INPUT / video.videoHeight)
  const resizedWidth = Math.round(video.videoWidth * scale)
  const resizedHeight = Math.round(video.videoHeight * scale)
  const padX = Math.floor((INPUT - resizedWidth) / 2)
  const padY = Math.floor((INPUT - resizedHeight) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = INPUT
  canvas.height = INPUT
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('CANVAS_UNAVAILABLE')
  context.fillStyle = '#727272'
  context.fillRect(0, 0, INPUT, INPUT)
  context.drawImage(
    video,
    0,
    0,
    video.videoWidth,
    video.videoHeight,
    padX,
    padY,
    resizedWidth,
    resizedHeight,
  )
  const pixels = context.getImageData(0, 0, INPUT, INPUT).data
  const data = new Float32Array(3 * INPUT * INPUT)
  for (let i = 0; i < INPUT * INPUT; i++) {
    data[i] = pixels[i * 4] / 255
    data[INPUT * INPUT + i] = pixels[i * 4 + 1] / 255
    data[2 * INPUT * INPUT + i] = pixels[i * 4 + 2] / 255
  }
  return {
    input: new ort.Tensor('float32', data, [1, 3, INPUT, INPUT]),
    letterbox: {
      scale,
      padX,
      padY,
      width: video.videoWidth,
      height: video.videoHeight,
    },
  }
}

function iou(
  a: Omit<Detection, 'detectionId'>,
  b: Omit<Detection, 'detectionId'>,
) {
  const overlap =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return overlap / (a.width * a.height + b.width * b.height - overlap)
}

export function postprocessDetections(
  output: Float32Array,
  dims: readonly number[],
  box: Letterbox,
): Detection[] {
  const count = dims[2]
  if (dims[1] !== 84 || !count) throw new Error('UNEXPECTED_YOLO_OUTPUT')
  const candidates: Omit<Detection, 'detectionId'>[] = []
  for (let i = 0; i < count; i++) {
    const value = (feature: number) => output[feature * count + i] ?? 0
    let classId = 0
    let confidence = value(4)
    for (let classIndex = 1; classIndex < 80; classIndex++) {
      const score = value(4 + classIndex)
      if (score > confidence) {
        confidence = score
        classId = classIndex
      }
    }
    if (confidence < 0.45) continue
    const x = Math.max(0, (value(0) - value(2) / 2 - box.padX) / box.scale)
    const y = Math.max(0, (value(1) - value(3) / 2 - box.padY) / box.scale)
    const right = Math.min(
      box.width,
      (value(0) + value(2) / 2 - box.padX) / box.scale,
    )
    const bottom = Math.min(
      box.height,
      (value(1) + value(3) / 2 - box.padY) / box.scale,
    )
    if (right > x && bottom > y)
      candidates.push({
        x,
        y,
        width: right - x,
        height: bottom - y,
        confidence,
        classId,
        className: COCO_CLASSES[classId] ?? `class-${classId}`,
      })
  }
  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .filter((candidate, index, all) =>
      all
        .slice(0, index)
        .every(
          (kept) =>
            kept.classId !== candidate.classId || iou(candidate, kept) < 0.45,
        ),
    )
    .map((candidate, index) => ({ ...candidate, detectionId: index + 1 }))
}

export async function inferDetections(
  video: HTMLVideoElement,
  onEvent?: (event: ProviderEvent) => void,
) {
  const prepared = tensor(video)
  let active = await session(onEvent)
  const startedAt = performance.now()
  try {
    const result = await active.session.run({
      [active.session.inputNames[0]]: prepared.input,
    })
    const output = result[active.session.outputNames[0]]
    return {
      detections: postprocessDetections(
        output.data as Float32Array,
        output.dims,
        prepared.letterbox,
      ),
      provider: active.provider,
      durationMs: performance.now() - startedAt,
    }
  } catch (error) {
    if (active.provider !== 'webgpu') throw error
    const reason = error instanceof Error ? error.message : String(error)
    onEvent?.({
      type: 'PROVIDER_FALLBACK',
      provider: 'wasm',
      detail: `WebGPU 실행 실패: ${reason}`,
    })
    active = { session: await createSession('wasm'), provider: 'wasm' }
    sessionPromise = Promise.resolve(active)
    const result = await active.session.run({
      [active.session.inputNames[0]]: prepared.input,
    })
    const output = result[active.session.outputNames[0]]
    return {
      detections: postprocessDetections(
        output.data as Float32Array,
        output.dims,
        prepared.letterbox,
      ),
      provider: active.provider,
      durationMs: performance.now() - startedAt,
    }
  }
}
