import type { PoseFrame } from '../../mediapipe/usePoseLandmarker'
import { extractPoseFeaturesV2 } from '../common/pose-feature-extractor-v2'

export type SideKickReadyBaseline = {
  left: number
  right: number
  sampleCount: number
}

const MIN_SAMPLES = 8
const MAX_SAMPLES = 30

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

export class SideKickReadyCalibrator {
  private samples: { left: number; right: number }[] = []

  reset(): void {
    this.samples = []
  }

  add(frame: PoseFrame, readyPoseValid: boolean): boolean {
    if (!readyPoseValid) return false

    const { features } = extractPoseFeaturesV2(frame)

    const left = features.left_thigh_lateral_angle_deg
    const right = features.right_thigh_lateral_angle_deg

    if (
      typeof left !== 'number' ||
      typeof right !== 'number' ||
      !Number.isFinite(left) ||
      !Number.isFinite(right)
    ) {
      return false
    }

    this.samples.push({ left, right })

    if (this.samples.length > MAX_SAMPLES) {
      this.samples.shift()
    }

    return true
  }

  get sampleCount(): number {
    return this.samples.length
  }

  get ready(): boolean {
    return this.samples.length >= MIN_SAMPLES
  }

  getBaseline(): SideKickReadyBaseline | null {
    if (!this.ready) return null

    return {
      left: median(this.samples.map((sample) => sample.left)),
      right: median(this.samples.map((sample) => sample.right)),
      sampleCount: this.samples.length,
    }
  }
}
