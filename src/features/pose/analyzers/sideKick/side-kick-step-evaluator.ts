/** Experimental Side Kick STEP 2/4 lift evaluator.
 * Validated only against limited self-recorded samples; NOT a medical safety standard.
 * Feed one sample per MediaPipe frame, with feature definitions matching
 * side-kick-live-input.ts. One instance per STEP; do not reuse across sides.
 */
export type SideKickSide = 'left' | 'right'
export type LiftState =
  'UNDETERMINED' | 'MOVING' | 'CANDIDATE' | 'HOLDING' | 'PASS'
export type LiftEvent =
  'POSE_CANDIDATE' | 'POSE_HOLD_STARTED' | 'POSE_HOLD_INTERRUPTED' | 'STEP_PASS'

export type LiftInput = {
  timestampMs: number
  thighLateralDeg: number | null
  shoulderPelvisRelativeTiltDeg: number | null
  torsoLengthAsymmetryRatio: number | null
}

export type LiftSnapshot = {
  state: LiftState
  events: LiftEvent[]
  valid: boolean
  movementObserved: boolean
  legDeltaDeg: number | null
  orientedBendDeg: number | null
  orientedAsymmetryRatio: number | null
  holdProgressMs: number
  candidateFrames: number
}

export type LiftPolicy = {
  candidateMinFrames: number
  candidateMinMs: number
  holdMs: number
  maxFrameGapMs: number
}

const DEFAULT_POLICY: LiftPolicy = {
  candidateMinFrames: 3,
  candidateMinMs: 100,
  holdMs: 2000,
  maxFrameGapMs: 500,
}

function finite(v: number | null): v is number {
  return v !== null && Number.isFinite(v)
}

class TrailingMedian {
  private values: (number | null)[] = []
  push(value: number | null): number | null {
    this.values.push(value)
    if (this.values.length > 7) this.values.shift()
    const valid = this.values.filter(finite).sort((a, b) => a - b)
    if (valid.length < 3) return null
    const m = Math.floor(valid.length / 2)
    return valid.length % 2 ? valid[m] : (valid[m - 1] + valid[m]) / 2
  }
  reset(): void {
    this.values = []
  }
}

export class SideKickStepEvaluator {
  private readonly side: SideKickSide
  private readonly readyThighLateralDeg: number
  private readonly leg = new TrailingMedian()
  private readonly bend = new TrailingMedian()
  private readonly asym = new TrailingMedian()
  private lastTimestamp: number | null = null
  private candidateSince: number | null = null
  private candidateFrames = 0
  private holdSince: number | null = null
  private passed = false
  private movementObserved = false
  private lastSnapshot: LiftSnapshot | null = null
  private readonly policy: LiftPolicy

  constructor(
    side: SideKickSide,
    readyThighLateralDeg: number,
    overrides: Partial<LiftPolicy> = {},
  ) {
    this.side = side
    this.readyThighLateralDeg = readyThighLateralDeg
    if (!Number.isFinite(readyThighLateralDeg))
      throw new Error('INVALID_READY_BASELINE')
    this.policy = { ...DEFAULT_POLICY, ...overrides }
    if (
      this.policy.candidateMinFrames < 3 ||
      this.policy.candidateMinMs < 100 ||
      this.policy.holdMs < 100 ||
      this.policy.maxFrameGapMs <= 0 ||
      !Object.values(this.policy).every(Number.isFinite)
    ) {
      throw new Error('INVALID_LIFT_POLICY')
    }
  }

  reset(): void {
    this.leg.reset()
    this.bend.reset()
    this.asym.reset()
    this.lastTimestamp = null
    this.candidateSince = null
    this.candidateFrames = 0
    this.holdSince = null
    this.passed = false
    this.movementObserved = false
    this.lastSnapshot = null
  }

  update(input: LiftInput): LiftSnapshot {
    const t = input.timestampMs
    if (!Number.isFinite(t) || t < 0) throw new Error('INVALID_TIMESTAMP')
    // Do not process duplicate or out-of-order frames, and never emit a duplicate event.
    if (this.lastTimestamp !== null && t <= this.lastTimestamp) {
      if (this.lastSnapshot) return { ...this.lastSnapshot, events: [] }
    }
    if (this.passed && this.lastSnapshot) {
      if (this.lastTimestamp === null || t > this.lastTimestamp)
        this.lastTimestamp = t
      return { ...this.lastSnapshot, events: [] }
    }
    const gap =
      this.lastTimestamp !== null &&
      t - this.lastTimestamp > this.policy.maxFrameGapMs
    this.lastTimestamp = t
    const events: LiftEvent[] = []
    if (gap) {
      this.leg.reset()
      this.bend.reset()
      this.asym.reset()
      this.interrupt(events)
    }
    const orient = this.side === 'left' ? 1 : -1
    const leg = this.leg.push(input.thighLateralDeg)
    const bend = this.bend.push(
      finite(input.shoulderPelvisRelativeTiltDeg)
        ? orient * input.shoulderPelvisRelativeTiltDeg
        : null,
    )
    const asym = this.asym.push(
      finite(input.torsoLengthAsymmetryRatio)
        ? -orient * input.torsoLengthAsymmetryRatio
        : null,
    )
    // Missing raw observations MUST NOT be filled in by previous medians.
    const valid =
      finite(input.thighLateralDeg) &&
      finite(input.shoulderPelvisRelativeTiltDeg) &&
      finite(input.torsoLengthAsymmetryRatio) &&
      finite(leg) &&
      finite(bend) &&
      finite(asym)
    let state: LiftState = 'UNDETERMINED'
    let delta: number | null = null
    if (!valid) {
      this.interrupt(events)
    } else {
      delta = leg - this.readyThighLateralDeg
      const movement = delta >= 14 || (bend >= 22 && asym >= 0.3)
      if (movement) this.movementObserved = true
      const exact = delta >= 20 && bend >= 28 && asym >= 0.4
      if (exact) {
        this.candidateSince ??= t
        this.candidateFrames++
        if (
          this.candidateFrames >= this.policy.candidateMinFrames &&
          t - this.candidateSince >= this.policy.candidateMinMs
        ) {
          if (this.holdSince === null) {
            this.holdSince = t
            events.push('POSE_CANDIDATE', 'POSE_HOLD_STARTED')
          }
          if (t - this.holdSince >= this.policy.holdMs) {
            this.passed = true
            events.push('STEP_PASS')
            state = 'PASS'
          } else {
            state = 'HOLDING'
          }
        } else state = 'CANDIDATE'
      } else {
        this.interrupt(events)
        state = movement ? 'MOVING' : 'UNDETERMINED'
      }
    }
    const snapshot: LiftSnapshot = {
      state,
      events,
      valid,
      movementObserved: this.movementObserved,
      legDeltaDeg: delta,
      orientedBendDeg: bend,
      orientedAsymmetryRatio: asym,
      holdProgressMs:
        this.holdSince === null
          ? 0
          : Math.min(this.policy.holdMs, t - this.holdSince),
      candidateFrames: this.candidateFrames,
    }
    this.lastSnapshot = snapshot
    return snapshot
  }

  private interrupt(events: LiftEvent[]): void {
    if (this.holdSince !== null && !this.passed)
      events.push('POSE_HOLD_INTERRUPTED')
    this.holdSince = null
    this.candidateSince = null
    this.candidateFrames = 0
  }
}
