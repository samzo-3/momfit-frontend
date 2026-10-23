import type { PoseFrame } from '../../mediapipe/usePoseLandmarker'
import criteriaDraft from './side-kick-study-criteria.draft.json'
import { createSideKickLiftInput } from './side-kick-live-input'
import {
  SideKickReadyCalibrator,
  type SideKickReadyBaseline,
} from './side-kick-ready-baseline'
import {
  SideKickStepEvaluator,
  type LiftPolicy,
  type LiftSnapshot,
  type SideKickSide,
} from './side-kick-step-evaluator'
import {
  SideKickReturnEvaluator,
  type ReturnPolicy,
  type ReturnSnapshot,
} from './side-kick-return-evaluator'
import {
  SideKickStudyFlow,
  type FlowSnapshot,
  type StudyStep,
} from './side-kick-study-flow'

type LiftConfirmation = {
  candidate_min_frames: number
  candidate_min_ms: number
  hold_ms: number
  max_frame_gap_ms: number
}

type ReturnConfirmation = {
  min_frames: number
  min_duration_ms: number
  max_frame_gap_ms: number
}

export type SideKickDraftRule = {
  metric: string
  operator: string
  value: number
  transform?: string
}

type LiftThresholds = Pick<
  LiftPolicy,
  'minLegDeltaDeg' | 'minBendDeg' | 'minAsymmetryRatio'
>

type ReturnThresholds = Pick<
  ReturnPolicy,
  'maxLegDeltaDeg' | 'maxBendDeg' | 'maxAsymmetryRatio'
>

function confirmationFor<T>(stepCode: string): T {
  const step = criteriaDraft.steps.find((item) => item.step_code === stepCode)
  const confirmation = step?.criteria.confirmation

  if (!confirmation) {
    throw new Error(`INVALID_SIDE_KICK_DRAFT_CRITERIA:${stepCode}`)
  }

  return confirmation as T
}

function rulesFor(stepCode: string): SideKickDraftRule[] {
  const step = criteriaDraft.steps.find((item) => item.step_code === stepCode)
  const criteria = step?.criteria

  if (!criteria || !('rules' in criteria) || !Array.isArray(criteria.rules)) {
    throw new Error(`INVALID_SIDE_KICK_DRAFT_RULES:${stepCode}`)
  }

  return criteria.rules as SideKickDraftRule[]
}

function thresholdValues(
  stepCode: string,
  rules: SideKickDraftRule[],
  expectedOperator: 'GTE' | 'LTE',
  expectedTransform: 'ABS' | undefined,
): Record<string, number> {
  const values: Record<string, number> = {}
  const supportedMetrics = new Set([
    'leg_delta_deg',
    'oriented_bend_deg',
    'oriented_asymmetry_ratio',
  ])

  for (const rule of rules) {
    if (!supportedMetrics.has(rule.metric)) {
      throw new Error(`UNSUPPORTED_SIDE_KICK_RULE_METRIC:${rule.metric}`)
    }
    if (rule.operator !== expectedOperator) {
      throw new Error(
        `UNSUPPORTED_SIDE_KICK_RULE_OPERATOR:${stepCode}:${rule.operator}`,
      )
    }
    if (rule.transform !== expectedTransform) {
      throw new Error(
        `UNSUPPORTED_SIDE_KICK_RULE_TRANSFORM:${stepCode}:${rule.transform ?? 'NONE'}`,
      )
    }
    if (!Number.isFinite(rule.value) || rule.value < 0) {
      throw new Error(`INVALID_SIDE_KICK_RULE_VALUE:${stepCode}:${rule.metric}`)
    }
    if (values[rule.metric] !== undefined) {
      throw new Error(
        `DUPLICATE_SIDE_KICK_RULE_METRIC:${stepCode}:${rule.metric}`,
      )
    }
    values[rule.metric] = rule.value
  }

  for (const metric of supportedMetrics) {
    if (values[metric] === undefined) {
      throw new Error(`MISSING_SIDE_KICK_RULE_METRIC:${stepCode}:${metric}`)
    }
  }

  return values
}

export function liftThresholdsFromRules(
  stepCode: string,
  rules: SideKickDraftRule[],
): LiftThresholds {
  const values = thresholdValues(stepCode, rules, 'GTE', undefined)
  return {
    minLegDeltaDeg: values.leg_delta_deg,
    minBendDeg: values.oriented_bend_deg,
    minAsymmetryRatio: values.oriented_asymmetry_ratio,
  }
}

export function returnThresholdsFromRules(
  stepCode: string,
  rules: SideKickDraftRule[],
): ReturnThresholds {
  const values = thresholdValues(stepCode, rules, 'LTE', 'ABS')
  return {
    maxLegDeltaDeg: values.leg_delta_deg,
    maxBendDeg: values.oriented_bend_deg,
    maxAsymmetryRatio: values.oriented_asymmetry_ratio,
  }
}

export const SIDE_KICK_RUNTIME_CRITERIA = {
  measurementProfileVersion: criteriaDraft.measurement_profile_version,
  // DRAFT JSON에는 DB exercise criteria version 식별자가 아직 없다.
  // 이를 추측하면 다른 기준 버전으로 기록될 수 있으므로 저장 경로가 차단한다.
  criteriaVersion: null as string | null,
  status: criteriaDraft.status,
  lift: {
    LEFT_LIFT: confirmationFor<LiftConfirmation>('LEFT_LIFT'),
    RIGHT_LIFT: confirmationFor<LiftConfirmation>('RIGHT_LIFT'),
  },
  returning: {
    LEFT_RETURN: confirmationFor<ReturnConfirmation>('LEFT_RETURN'),
    RIGHT_RETURN: confirmationFor<ReturnConfirmation>('RIGHT_RETURN'),
  },
  liftThresholds: {
    LEFT_LIFT: liftThresholdsFromRules('LEFT_LIFT', rulesFor('LEFT_LIFT')),
    RIGHT_LIFT: liftThresholdsFromRules('RIGHT_LIFT', rulesFor('RIGHT_LIFT')),
  },
  returnThresholds: {
    LEFT_RETURN: returnThresholdsFromRules(
      'LEFT_RETURN',
      rulesFor('LEFT_RETURN'),
    ),
    RIGHT_RETURN: returnThresholdsFromRules(
      'RIGHT_RETURN',
      rulesFor('RIGHT_RETURN'),
    ),
  },
} as const

export type SideKickRuntimeSnapshot = {
  flow: FlowSnapshot
  baseline: SideKickReadyBaseline | null
  readySampleCount: number
  lift: LiftSnapshot | null
  returning: ReturnSnapshot | null
}

export class SideKickStudyRuntime {
  private readonly calibrator = new SideKickReadyCalibrator()
  private readonly flow = new SideKickStudyFlow()

  private baseline: SideKickReadyBaseline | null = null
  private lift: SideKickStepEvaluator | null = null
  private returning: SideKickReturnEvaluator | null = null
  private activeStep: StudyStep | null = null
  private lastTimestamp: number | null = null

  reset(): void {
    this.calibrator.reset()
    this.flow.reset()
    this.baseline = null
    this.lift = null
    this.returning = null
    this.activeStep = null
    this.lastTimestamp = null
  }

  getSnapshot(): SideKickRuntimeSnapshot {
    return {
      flow: this.flow.getSnapshot(),
      baseline: this.baseline,
      readySampleCount: this.calibrator.sampleCount,
      lift: null,
      returning: null,
    }
  }

  private selectStep(step: StudyStep): void {
    if (step === this.activeStep) return

    this.activeStep = step
    this.lift = null
    this.returning = null

    if (!this.baseline) return

    if (step === 2 || step === 4) {
      const side: SideKickSide = step === 2 ? 'left' : 'right'
      const confirmation =
        step === 2
          ? SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT
          : SIDE_KICK_RUNTIME_CRITERIA.lift.RIGHT_LIFT
      const thresholds =
        step === 2
          ? SIDE_KICK_RUNTIME_CRITERIA.liftThresholds.LEFT_LIFT
          : SIDE_KICK_RUNTIME_CRITERIA.liftThresholds.RIGHT_LIFT

      this.lift = new SideKickStepEvaluator(side, this.baseline[side], {
        candidateMinFrames: confirmation.candidate_min_frames,
        candidateMinMs: confirmation.candidate_min_ms,
        holdMs: confirmation.hold_ms,
        maxFrameGapMs: confirmation.max_frame_gap_ms,
        ...thresholds,
      })
    }

    if (step === 3 || step === 5) {
      const side: SideKickSide = step === 3 ? 'left' : 'right'
      const confirmation =
        step === 3
          ? SIDE_KICK_RUNTIME_CRITERIA.returning.LEFT_RETURN
          : SIDE_KICK_RUNTIME_CRITERIA.returning.RIGHT_RETURN
      const thresholds =
        step === 3
          ? SIDE_KICK_RUNTIME_CRITERIA.returnThresholds.LEFT_RETURN
          : SIDE_KICK_RUNTIME_CRITERIA.returnThresholds.RIGHT_RETURN

      this.returning = new SideKickReturnEvaluator(side, this.baseline[side], {
        minFrames: confirmation.min_frames,
        minDurationMs: confirmation.min_duration_ms,
        maxFrameGapMs: confirmation.max_frame_gap_ms,
        ...thresholds,
      })
    }
  }

  update(
    frame: PoseFrame,
    options: {
      readyPoseValid?: boolean
      feedbackIssued?: boolean
    } = {},
  ): SideKickRuntimeSnapshot {
    const t = frame.timestampMs

    if (!Number.isFinite(t) || t < 0) {
      throw new Error('INVALID_TIMESTAMP')
    }

    if (this.lastTimestamp !== null && t <= this.lastTimestamp) {
      return this.getSnapshot()
    }

    this.lastTimestamp = t
    const step = this.flow.getSnapshot().step

    if (step === null) return this.getSnapshot()

    this.selectStep(step)

    if (step === 1) {
      this.calibrator.add(frame, options.readyPoseValid === true)

      if (options.readyPoseValid && this.calibrator.ready) {
        this.baseline = this.calibrator.getBaseline()
      }

      const result = this.flow.update({
        timestampMs: t,
        readyConfirmed: this.baseline !== null,
      })

      return this.snapshot(result)
    }

    if (!this.baseline) {
      // READY가 없으면 이후 자세를 성공으로 처리하지 않는다.
      return this.snapshot(this.flow.getSnapshot())
    }

    if (step === 2 || step === 4) {
      const side = step === 2 ? 'left' : 'right'
      const lift =
        this.lift?.update(createSideKickLiftInput(frame, side)) ?? null

      const result = this.flow.update({
        timestampMs: t,
        liftPassed: lift?.state === 'PASS',
        movement: lift?.movementObserved ? 'YES' : 'UNKNOWN',
        feedbackIssued: options.feedbackIssued === true,
      })

      return this.snapshot(result, lift)
    }

    const side = step === 3 ? 'left' : 'right'
    const returning =
      this.returning?.update(createSideKickLiftInput(frame, side)) ?? null

    const result = this.flow.update({
      timestampMs: t,
      neutralConfirmed: returning?.neutralConfirmed === true,
    })

    return this.snapshot(result, null, returning)
  }

  private snapshot(
    flow: FlowSnapshot,
    lift: LiftSnapshot | null = null,
    returning: ReturnSnapshot | null = null,
  ): SideKickRuntimeSnapshot {
    return {
      flow,
      baseline: this.baseline,
      readySampleCount: this.calibrator.sampleCount,
      lift,
      returning,
    }
  }
}
