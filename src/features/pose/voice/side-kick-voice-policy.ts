import type { SideKickRuntimeSnapshot } from '../analyzers/sideKick/side-kick-study-runtime'
import type { StudyStep } from '../analyzers/sideKick/side-kick-study-flow'

export type CriterionFailure =
  | 'LEG_LIFT_INSUFFICIENT'
  | 'TORSO_BEND_INSUFFICIENT'
  | 'TORSO_ASYMMETRY_INSUFFICIENT'

export type SideKickLiftVoiceSnapshot = {
  valid: boolean
  movementObserved: boolean
  state: string
  measurementStatus?: 'VALID' | 'INVALID'
  criterionFailures?: readonly CriterionFailure[]
}

export type SideKickVoiceSnapshot = Pick<
  SideKickRuntimeSnapshot,
  'flow' | 'returning'
> & {
  lift: SideKickLiftVoiceSnapshot | null
}

export type SideKickVoiceEventCode =
  | 'SK_READY_START'
  | 'SK_LEFT_LIFT_START'
  | 'SK_LEFT_RETURN'
  | 'SK_RIGHT_LIFT_START'
  | 'SK_RIGHT_RETURN'
  | 'SK_WAIT_MOVEMENT'
  | 'SK_TRACKING_LOST'
  | 'SK_HOLD_POSITION'
  | 'SK_HOLD_INTERRUPTED'
  | 'SK_LEG_LIFT_MORE'
  | 'SK_TORSO_BEND_MORE'
  | 'SK_TORSO_ASYMMETRY_MORE'
  | 'SK_STEP_COMPLETED'
  | 'SK_STEP_NOT_PASSED'
  | 'SK_STEP_NOT_EVALUATED'
  | 'SK_STUDY_COMPLETED'

export type SideKickVoiceDecision = {
  eventCode: SideKickVoiceEventCode
  step: StudyStep | null
  priority: 'NORMAL' | 'HIGH'
}

const STEP_START: Record<StudyStep, SideKickVoiceEventCode> = {
  1: 'SK_READY_START',
  2: 'SK_LEFT_LIFT_START',
  3: 'SK_LEFT_RETURN',
  4: 'SK_RIGHT_LIFT_START',
  5: 'SK_RIGHT_RETURN',
}

export const SIDE_KICK_VOICE_COOLDOWN_MS = 8000
const TRACKING_LOST_MS = 3000
const CRITERION_FAILURE_MS = 2000

const CRITERION_FAILURE_EVENTS: Record<
  CriterionFailure,
  SideKickVoiceEventCode
> = {
  LEG_LIFT_INSUFFICIENT: 'SK_LEG_LIFT_MORE',
  TORSO_BEND_INSUFFICIENT: 'SK_TORSO_BEND_MORE',
  TORSO_ASYMMETRY_INSUFFICIENT: 'SK_TORSO_ASYMMETRY_MORE',
}

const CRITERION_FAILURE_PRIORITY: CriterionFailure[] = [
  'LEG_LIFT_INSUFFICIENT',
  'TORSO_BEND_INSUFFICIENT',
  'TORSO_ASYMMETRY_INSUFFICIENT',
]

export class SideKickVoicePolicy {
  private currentStep: StudyStep | null = null
  private lastTimestamp: number | null = null
  private trackingLostAt: number | null = null
  private criterionFailure: CriterionFailure | null = null
  private criterionFailureAt: number | null = null
  private readonly lastEventAt = new Map<string, number>()
  private completedAnnounced = false

  reset(): void {
    this.currentStep = null
    this.lastTimestamp = null
    this.trackingLostAt = null
    this.resetCriterionFailure()
    this.lastEventAt.clear()
    this.completedAnnounced = false
  }

  update(
    timestampMs: number,
    snapshot: SideKickVoiceSnapshot,
  ): SideKickVoiceDecision | null {
    if (!Number.isFinite(timestampMs) || timestampMs < 0) {
      return null
    }

    if (this.lastTimestamp !== null && timestampMs <= this.lastTimestamp) {
      return null
    }

    this.lastTimestamp = timestampMs

    const { flow, lift, returning } = snapshot

    const emit = (
      eventCode: SideKickVoiceEventCode,
      step: StudyStep | null = flow.step,
      priority: SideKickVoiceDecision['priority'] = 'NORMAL',
    ): SideKickVoiceDecision => ({
      eventCode,
      step,
      priority,
    })

    const emitWithCooldown = (
      eventCode: SideKickVoiceEventCode,
      step: StudyStep,
      priority: SideKickVoiceDecision['priority'] = 'NORMAL',
    ): SideKickVoiceDecision | null => {
      const key = `${step}:${eventCode}`
      const lastAt = this.lastEventAt.get(key)
      if (
        lastAt !== undefined &&
        timestampMs - lastAt < SIDE_KICK_VOICE_COOLDOWN_MS
      ) {
        return null
      }
      this.lastEventAt.set(key, timestampMs)
      return emit(eventCode, step, priority)
    }

    if (flow.completed) {
      if (this.completedAnnounced) return null
      this.completedAnnounced = true
      return emit('SK_STUDY_COMPLETED', null, 'HIGH')
    }

    const step = flow.step
    if (step === null) return null

    if (step !== this.currentStep) {
      this.currentStep = step
      this.trackingLostAt = null
      this.resetCriterionFailure()
      return emit(STEP_START[step], step)
    }

    const liftMeasurement = step === 2 || step === 4 ? lift : null
    const measurementValid = liftMeasurement
      ? (liftMeasurement.measurementStatus ??
          (liftMeasurement.valid ? 'VALID' : 'INVALID')) === 'VALID'
      : returning?.valid

    if (measurementValid === undefined) return null

    if (!measurementValid) {
      this.resetCriterionFailure()
      this.trackingLostAt ??= timestampMs

      if (timestampMs - this.trackingLostAt >= TRACKING_LOST_MS) {
        return emitWithCooldown('SK_TRACKING_LOST', step, 'HIGH')
      }

      return null
    }

    if (this.trackingLostAt !== null) {
      this.trackingLostAt = null
      // A recovered measurement begins a new failure episode. Do not carry
      // the previous episode's cooldown into a later tracking failure.
      this.lastEventAt.delete(`${step}:SK_TRACKING_LOST`)
    }

    if (!liftMeasurement) return null

    if (liftMeasurement.state === 'PASS' || !liftMeasurement.movementObserved) {
      this.resetCriterionFailure()
      return null
    }

    const failure = CRITERION_FAILURE_PRIORITY.find((candidate) =>
      liftMeasurement.criterionFailures?.includes(candidate),
    )

    if (!failure) {
      this.resetCriterionFailure()
      return null
    }

    if (failure !== this.criterionFailure) {
      this.criterionFailure = failure
      this.criterionFailureAt = timestampMs
      return null
    }

    if (
      this.criterionFailureAt === null ||
      timestampMs - this.criterionFailureAt < CRITERION_FAILURE_MS
    ) {
      return null
    }

    return emitWithCooldown(CRITERION_FAILURE_EVENTS[failure], step)
  }

  private resetCriterionFailure(): void {
    this.criterionFailure = null
    this.criterionFailureAt = null
  }
}
