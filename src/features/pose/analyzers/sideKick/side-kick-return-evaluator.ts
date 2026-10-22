import type { LiftInput, SideKickSide } from './side-kick-step-evaluator'

export type ReturnState =
  | 'UNDETERMINED'
  | 'RETURNING'
  | 'NEUTRAL_CANDIDATE'
  | 'CONFIRMED'

export type ReturnSnapshot = {
  state: ReturnState
  neutralConfirmed: boolean
  valid: boolean
  neutralFrames: number
  neutralDurationMs: number
}

export type ReturnPolicy = {
  maxLegDeltaDeg: number
  maxBendDeg: number
  maxAsymmetryRatio: number
  minFrames: number
  minDurationMs: number
  maxFrameGapMs: number
}

const DEFAULT_POLICY: ReturnPolicy = {
  maxLegDeltaDeg: 15,
  maxBendDeg: 20,
  maxAsymmetryRatio: 0.30,
  minFrames: 2,
  minDurationMs: 30,
  maxFrameGapMs: 500,
}

function finite(value: number | null): value is number {
  return value !== null && Number.isFinite(value)
}

export class SideKickReturnEvaluator {
  private readonly side: SideKickSide
  private readonly readyThighDeg: number
  private lastTimestamp: number | null = null
  private neutralSince: number | null = null
  private neutralFrames = 0
  private confirmed = false
  private readonly policy: ReturnPolicy

  constructor(
    side: SideKickSide,
    readyThighDeg: number,
    overrides: Partial<ReturnPolicy> = {},
  ) {
    this.side = side
    this.readyThighDeg = readyThighDeg
    if (!Number.isFinite(readyThighDeg)) {
      throw new Error('INVALID_READY_BASELINE')
    }

    this.policy = { ...DEFAULT_POLICY, ...overrides }

    if (
      !Object.values(this.policy).every(Number.isFinite) ||
      this.policy.maxLegDeltaDeg < 0 ||
      this.policy.maxBendDeg < 0 ||
      this.policy.maxAsymmetryRatio < 0 ||
      !Number.isInteger(this.policy.minFrames) ||
      this.policy.minFrames < 2 ||
      this.policy.minDurationMs < 30 ||
      this.policy.maxFrameGapMs <= 0
    ) {
      throw new Error('INVALID_RETURN_POLICY')
    }
  }

  reset(): void {
    this.lastTimestamp = null
    this.neutralSince = null
    this.neutralFrames = 0
    this.confirmed = false
  }

  update(input: LiftInput): ReturnSnapshot {
    const t = input.timestampMs

    if (!Number.isFinite(t) || t < 0) {
      throw new Error('INVALID_TIMESTAMP')
    }

    // 오래된 프레임으로 복귀를 확정하지 않는다.
    if (this.lastTimestamp !== null && t <= this.lastTimestamp) {
      return this.snapshot(this.confirmed ? 'CONFIRMED' : 'UNDETERMINED', false, t)
    }

    if (this.confirmed) {
      this.lastTimestamp = t
      return this.snapshot('CONFIRMED', true, t)
    }

    if (
      this.lastTimestamp !== null &&
      t - this.lastTimestamp > this.policy.maxFrameGapMs
    ) {
      this.clearCandidate()
    }

    this.lastTimestamp = t

    const {
      thighLateralDeg,
      shoulderPelvisRelativeTiltDeg,
      torsoLengthAsymmetryRatio,
    } = input

    const valid =
      finite(thighLateralDeg) &&
      finite(shoulderPelvisRelativeTiltDeg) &&
      finite(torsoLengthAsymmetryRatio)

    if (!valid) {
      this.clearCandidate()
      return this.snapshot('UNDETERMINED', false, t)
    }

    const orientation = this.side === 'left' ? 1 : -1

    const legDelta = Math.abs(thighLateralDeg - this.readyThighDeg)
    const bend = Math.abs(orientation * shoulderPelvisRelativeTiltDeg)
    const asym = Math.abs(-orientation * torsoLengthAsymmetryRatio)

    const neutral =
      legDelta <= this.policy.maxLegDeltaDeg &&
      bend <= this.policy.maxBendDeg &&
      asym <= this.policy.maxAsymmetryRatio

    if (!neutral) {
      this.clearCandidate()
      return this.snapshot('RETURNING', true, t)
    }

    this.neutralSince ??= t
    this.neutralFrames++

    if (
      this.neutralFrames >= this.policy.minFrames &&
      t - this.neutralSince >= this.policy.minDurationMs
    ) {
      this.confirmed = true
      return this.snapshot('CONFIRMED', true, t)
    }

    return this.snapshot('NEUTRAL_CANDIDATE', true, t)
  }

  private clearCandidate(): void {
    this.neutralSince = null
    this.neutralFrames = 0
  }

  private snapshot(
    state: ReturnState,
    valid: boolean,
    timestampMs: number,
  ): ReturnSnapshot {
    return {
      state,
      neutralConfirmed: this.confirmed,
      valid,
      neutralFrames: this.neutralFrames,
      neutralDurationMs:
        this.neutralSince === null
          ? 0
          : timestampMs - this.neutralSince,
    }
  }
}
