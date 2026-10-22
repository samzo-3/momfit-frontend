import type { PoseFrame } from '../../mediapipe/usePoseLandmarker'
import { createSideKickLiftInput } from './side-kick-live-input'
import {
  SideKickReadyCalibrator,
  type SideKickReadyBaseline,
} from './side-kick-ready-baseline'
import {
  SideKickStepEvaluator,
  type LiftSnapshot,
  type SideKickSide,
} from './side-kick-step-evaluator'
import {
  SideKickReturnEvaluator,
  type ReturnSnapshot,
} from './side-kick-return-evaluator'
import {
  SideKickStudyFlow,
  type FlowSnapshot,
  type StudyStep,
} from './side-kick-study-flow'

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

      this.lift = new SideKickStepEvaluator(
        side,
        this.baseline[side],
      )
    }

    if (step === 3 || step === 5) {
      const side: SideKickSide = step === 3 ? 'left' : 'right'

      this.returning = new SideKickReturnEvaluator(
        side,
        this.baseline[side],
      )
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
      const lift = this.lift?.update(
        createSideKickLiftInput(frame, side),
      ) ?? null

      const result = this.flow.update({
        timestampMs: t,
        liftPassed: lift?.state === 'PASS',
        movement: lift?.movementObserved ? 'YES' : 'UNKNOWN',
        feedbackIssued: options.feedbackIssued === true,
      })

      return this.snapshot(result, lift)
    }

    const side = step === 3 ? 'left' : 'right'
    const returning = this.returning?.update(
      createSideKickLiftInput(frame, side),
    ) ?? null

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
