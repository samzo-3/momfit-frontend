import type {
  SideKickFeatureResult,
  SideKickMetrics,
} from './side-kick-features'
import type { SideKickSide } from './side-kick-reference'

export type FrontStatus = 'FRONT_OK' | 'FRONT_UNCERTAIN' | 'NOT_FRONT'

export type SideKickMotionPhase = 'READY' | 'RAISING' | 'RETURNING'

export type SideKickMotionEvent =
  | {
      type: 'REP_COMPLETED'
      side: SideKickSide
      peakMovement: number
      peakTimestampMs: number
      peakMetrics: SideKickMetrics
      timestampMs: number
    }
  | {
      type: 'MOTION_PAUSED'
      reason: 'FRONT_UNAVAILABLE' | 'FEATURE_UNAVAILABLE'
    }

export type SideKickMotionInput = {
  timestampMs: number
  frontStatus: FrontStatus
  features: SideKickFeatureResult
}

export type SideKickMotionConfig = {
  returnThreshold: number
  startThreshold: number
  minPeakMovement: number
  minReturnMs: number
  maxFrameGapMs: number
}

export type SideKickMotionResult = {
  phase: SideKickMotionPhase
  activeSide: SideKickSide | null
  completedReps: number
  leftReps: number
  rightReps: number
  peakMovement: number
  events: SideKickMotionEvent[]
}

export const DEFAULT_SIDE_KICK_MOTION_CONFIG: SideKickMotionConfig = {
  returnThreshold: 0.15,
  startThreshold: 0.35,
  minPeakMovement: 0.6,
  minReturnMs: 60,
  maxFrameGapMs: 500,
}

type Movement = {
  LEFT: number
  RIGHT: number
}

export class SideKickMotionTracker {
  private phase: SideKickMotionPhase = 'READY'
  private activeSide: SideKickSide | null = null
  private peakMovement = 0
  private peakTimestampMs: number | null = null
  private peakMetrics: SideKickMetrics | null = null
  private lastMovement = 0
  private returnStartedAt: number | null = null
  private lastTimestamp: number | null = null
  private completedReps = 0
  private leftReps = 0
  private rightReps = 0
  private readyObserved = false

  private readonly config: SideKickMotionConfig

  constructor(config: SideKickMotionConfig = DEFAULT_SIDE_KICK_MOTION_CONFIG) {
    this.config = config
    const {
      returnThreshold,
      startThreshold,
      minPeakMovement,
      minReturnMs,
      maxFrameGapMs,
    } = config

    if (
      ![
        returnThreshold,
        startThreshold,
        minPeakMovement,
        minReturnMs,
        maxFrameGapMs,
      ].every(Number.isFinite) ||
      returnThreshold < 0 ||
      startThreshold <= returnThreshold ||
      minPeakMovement <= startThreshold ||
      minReturnMs < 0 ||
      maxFrameGapMs <= 0
    ) {
      throw new Error('INVALID_SIDE_KICK_MOTION_CONFIG')
    }
  }

  reset(): void {
    this.clearMotion()
    this.lastTimestamp = null
    this.readyObserved = false
    this.completedReps = 0
    this.leftReps = 0
    this.rightReps = 0
  }

  private clearMotion(): void {
    this.phase = 'READY'
    this.activeSide = null
    this.peakMovement = 0
    this.peakTimestampMs = null
    this.peakMetrics = null
    this.lastMovement = 0
    this.returnStartedAt = null
    this.readyObserved = false
  }

  private snapshot(events: SideKickMotionEvent[] = []): SideKickMotionResult {
    return {
      phase: this.phase,
      activeSide: this.activeSide,
      completedReps: this.completedReps,
      leftReps: this.leftReps,
      rightReps: this.rightReps,
      peakMovement: this.peakMovement,
      events,
    }
  }

  update(input: SideKickMotionInput): SideKickMotionResult {
    const { timestampMs, frontStatus, features } = input

    if (!Number.isFinite(timestampMs) || timestampMs < 0) {
      throw new Error('INVALID_TIMESTAMP')
    }

    // 역순 또는 중복 타임스탬프는 무시한다.
    if (this.lastTimestamp !== null && timestampMs <= this.lastTimestamp) {
      return this.snapshot()
    }

    if (
      this.lastTimestamp !== null &&
      timestampMs - this.lastTimestamp > this.config.maxFrameGapMs
    ) {
      this.clearMotion()
    }

    this.lastTimestamp = timestampMs

    // 정면 유지 여부와 관절 인식 유효성은 별도 조건이다.
    if (frontStatus !== 'FRONT_OK' || !features.valid) {
      this.clearMotion()

      return this.snapshot([
        {
          type: 'MOTION_PAUSED',
          reason:
            frontStatus !== 'FRONT_OK'
              ? 'FRONT_UNAVAILABLE'
              : 'FEATURE_UNAVAILABLE',
        },
      ])
    }

    const metrics = features.metrics

    const movement: Movement = {
      LEFT: Math.abs(metrics.left_ankle_relative_x_ratio),
      RIGHT: Math.abs(metrics.right_ankle_relative_x_ratio),
    }

    if (!Object.values(movement).every(Number.isFinite)) {
      this.clearMotion()
      return this.snapshot([
        { type: 'MOTION_PAUSED', reason: 'FEATURE_UNAVAILABLE' },
      ])
    }

    const { returnThreshold, startThreshold, minPeakMovement } = this.config

    if (this.phase === 'READY') {
      if (
        movement.LEFT <= returnThreshold &&
        movement.RIGHT <= returnThreshold
      ) {
        this.readyObserved = true
        return this.snapshot()
      }

      // READY가 한번 관측되기 전에는 움직임을 세지 않는다.
      if (!this.readyObserved) {
        return this.snapshot()
      }

      const leftStarted = movement.LEFT >= startThreshold
      const rightStarted = movement.RIGHT >= startThreshold

      // 양쪽이 동시에 크게 움직이면 어느 쪽인지 확정하지 않는다.
      if (leftStarted === rightStarted) {
        return this.snapshot()
      }

      this.activeSide = leftStarted ? 'LEFT' : 'RIGHT'
      this.phase = 'RAISING'
      this.peakMovement = movement[this.activeSide]
      this.peakTimestampMs = timestampMs
      this.peakMetrics = { ...metrics }
      this.lastMovement = this.peakMovement
      return this.snapshot()
    }

    if (this.activeSide === null) {
      this.clearMotion()
      return this.snapshot()
    }

    const currentMovement = movement[this.activeSide]
    if (currentMovement > this.peakMovement) {
      this.peakMovement = currentMovement
      this.peakTimestampMs = timestampMs
      this.peakMetrics = { ...metrics }
    }

    if (this.phase === 'RAISING') {
      // 최고점이 충분히 관측된 뒤 하강하면 RETURNING 진입.
      if (
        this.peakMovement >= minPeakMovement &&
        currentMovement < this.lastMovement &&
        currentMovement < this.peakMovement
      ) {
        this.phase = 'RETURNING'
      }

      this.lastMovement = currentMovement
      return this.snapshot()
    }

    if (this.phase === 'RETURNING') {
      if (currentMovement <= returnThreshold) {
        if (this.returnStartedAt === null) {
          this.returnStartedAt = timestampMs
        }

        if (timestampMs - this.returnStartedAt >= this.config.minReturnMs) {
          const completedSide = this.activeSide
          const completedPeak = this.peakMovement
          const completedPeakTimestamp = this.peakTimestampMs
          const completedPeakMetrics = this.peakMetrics

          if (
            completedPeakTimestamp === null ||
            completedPeakMetrics === null
          ) {
            this.clearMotion()
            return this.snapshot()
          }

          this.completedReps += 1

          if (completedSide === 'LEFT') {
            this.leftReps += 1
          } else {
            this.rightReps += 1
          }

          this.clearMotion()
          this.readyObserved = true

          return this.snapshot([
            {
              type: 'REP_COMPLETED',
              side: completedSide,
              peakMovement: completedPeak,
              peakTimestampMs: completedPeakTimestamp,
              peakMetrics: completedPeakMetrics,
              timestampMs,
            },
          ])
        }
      } else {
        this.returnStartedAt = null
      }

      this.lastMovement = currentMovement
    }

    return this.snapshot()
  }
}
