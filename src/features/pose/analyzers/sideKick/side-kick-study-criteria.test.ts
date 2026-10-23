import { describe, expect, it } from 'vitest'
import criteriaDraft from './side-kick-study-criteria.draft.json'
import { SideKickReturnEvaluator } from './side-kick-return-evaluator'
import { SideKickStepEvaluator } from './side-kick-step-evaluator'
import {
  liftThresholdsFromRules,
  returnThresholdsFromRules,
  SIDE_KICK_RUNTIME_CRITERIA,
} from './side-kick-study-runtime'

const baseline = -6.879

describe('Side Kick DRAFT criteria runtime binding', () => {
  it('DRAFT/EXPERIMENTAL confirmation과 rules를 Runtime에 연결한다', () => {
    expect(criteriaDraft.status).toBe('DRAFT_EXPERIMENTAL')
    expect(SIDE_KICK_RUNTIME_CRITERIA.status).toBe('DRAFT_EXPERIMENTAL')
    expect(SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT).toEqual(
      SIDE_KICK_RUNTIME_CRITERIA.lift.RIGHT_LIFT,
    )
    expect(SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT).toEqual({
      candidate_min_frames: 3,
      candidate_min_ms: 100,
      hold_ms: 2000,
      max_frame_gap_ms: 500,
    })
    expect(SIDE_KICK_RUNTIME_CRITERIA.returning.LEFT_RETURN).toEqual(
      SIDE_KICK_RUNTIME_CRITERIA.returning.RIGHT_RETURN,
    )
    expect(SIDE_KICK_RUNTIME_CRITERIA.returning.LEFT_RETURN).toEqual({
      min_frames: 2,
      min_duration_ms: 30,
      max_frame_gap_ms: 500,
    })
    expect(SIDE_KICK_RUNTIME_CRITERIA.liftThresholds.LEFT_LIFT).toEqual({
      minLegDeltaDeg: 20,
      minBendDeg: 28,
      minAsymmetryRatio: 0.4,
    })
    expect(SIDE_KICK_RUNTIME_CRITERIA.returnThresholds.LEFT_RETURN).toEqual({
      maxLegDeltaDeg: 15,
      maxBendDeg: 20,
      maxAsymmetryRatio: 0.3,
    })
  })

  it('JSON 적용 전후 lift PASS와 미통과 입력의 상태 전환이 같다', () => {
    const legacy = new SideKickStepEvaluator('left', baseline)
    const fromJson = new SideKickStepEvaluator('left', baseline, {
      candidateMinFrames:
        SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.candidate_min_frames,
      candidateMinMs:
        SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.candidate_min_ms,
      holdMs: SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.hold_ms,
      maxFrameGapMs: SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.max_frame_gap_ms,
      ...SIDE_KICK_RUNTIME_CRITERIA.liftThresholds.LEFT_LIFT,
    })

    const compare = (thighDelta: number, bend: number, asym: number) => {
      for (let t = 0; t <= 2300; t += 70) {
        const input = {
          timestampMs: t,
          thighLateralDeg: baseline + thighDelta,
          shoulderPelvisRelativeTiltDeg: bend,
          torsoLengthAsymmetryRatio: -asym,
        }
        expect(fromJson.update(input)).toEqual(legacy.update(input))
      }
    }

    compare(30, 34, 0.56)
    expect(
      fromJson.update({
        timestampMs: 2400,
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: 34,
        torsoLengthAsymmetryRatio: -0.56,
      }).state,
    ).toBe('PASS')

    const incompleteLegacy = new SideKickStepEvaluator('left', baseline)
    const incompleteFromJson = new SideKickStepEvaluator('left', baseline, {
      candidateMinFrames:
        SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.candidate_min_frames,
      candidateMinMs:
        SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.candidate_min_ms,
      holdMs: SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.hold_ms,
      maxFrameGapMs: SIDE_KICK_RUNTIME_CRITERIA.lift.LEFT_LIFT.max_frame_gap_ms,
      ...SIDE_KICK_RUNTIME_CRITERIA.liftThresholds.LEFT_LIFT,
    })
    for (let t = 0; t <= 2300; t += 70) {
      const input = {
        timestampMs: t,
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: 5,
        torsoLengthAsymmetryRatio: -0.1,
      }
      expect(incompleteFromJson.update(input)).toEqual(
        incompleteLegacy.update(input),
      )
    }
    expect(
      incompleteFromJson.update({
        timestampMs: 2400,
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: 5,
        torsoLengthAsymmetryRatio: -0.1,
      }).state,
    ).not.toBe('PASS')
  })

  it('JSON 적용 전후 return PASS와 측정 누락의 판정이 같다', () => {
    const legacy = new SideKickReturnEvaluator('left', baseline)
    const fromJson = new SideKickReturnEvaluator('left', baseline, {
      minFrames: SIDE_KICK_RUNTIME_CRITERIA.returning.LEFT_RETURN.min_frames,
      minDurationMs:
        SIDE_KICK_RUNTIME_CRITERIA.returning.LEFT_RETURN.min_duration_ms,
      maxFrameGapMs:
        SIDE_KICK_RUNTIME_CRITERIA.returning.LEFT_RETURN.max_frame_gap_ms,
      ...SIDE_KICK_RUNTIME_CRITERIA.returnThresholds.LEFT_RETURN,
    })

    for (const t of [0, 70]) {
      const input = {
        timestampMs: t,
        thighLateralDeg: baseline,
        shoulderPelvisRelativeTiltDeg: 0,
        torsoLengthAsymmetryRatio: 0,
      }
      expect(fromJson.update(input)).toEqual(legacy.update(input))
    }

    expect(
      fromJson.update({
        timestampMs: 140,
        thighLateralDeg: baseline,
        shoulderPelvisRelativeTiltDeg: 0,
        torsoLengthAsymmetryRatio: null,
      }),
    ).toEqual(
      legacy.update({
        timestampMs: 140,
        thighLateralDeg: baseline,
        shoulderPelvisRelativeTiltDeg: 0,
        torsoLengthAsymmetryRatio: null,
      }),
    )
  })

  it('JSON rule 값 변경은 lift 판정 임계값에 반영된다', () => {
    const leftLift = criteriaDraft.steps.find(
      (step) => step.step_code === 'LEFT_LIFT',
    )
    if (
      !leftLift ||
      !('rules' in leftLift.criteria) ||
      !Array.isArray(leftLift.criteria.rules)
    ) {
      throw new Error('LEFT_LIFT_RULES_NOT_FOUND')
    }

    const leftLiftRules = leftLift.criteria.rules
    const stricterRules = leftLiftRules.map((rule) =>
      rule.metric === 'leg_delta_deg' ? { ...rule, value: 31 } : rule,
    )
    const defaultEvaluator = new SideKickStepEvaluator('left', baseline, {
      ...SIDE_KICK_RUNTIME_CRITERIA.liftThresholds.LEFT_LIFT,
    })
    const stricterEvaluator = new SideKickStepEvaluator('left', baseline, {
      ...liftThresholdsFromRules('LEFT_LIFT', stricterRules),
    })

    for (let t = 0; t <= 2400; t += 100) {
      const input = {
        timestampMs: t,
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: 34,
        torsoLengthAsymmetryRatio: -0.56,
      }
      defaultEvaluator.update(input)
      stricterEvaluator.update(input)
    }

    expect(
      defaultEvaluator.update({
        timestampMs: 2500,
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: 34,
        torsoLengthAsymmetryRatio: -0.56,
      }).state,
    ).toBe('PASS')
    expect(
      stricterEvaluator.update({
        timestampMs: 2500,
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: 34,
        torsoLengthAsymmetryRatio: -0.56,
      }).state,
    ).not.toBe('PASS')
  })

  it('지원하지 않는 metric과 operator는 명시적으로 거부한다', () => {
    expect(() =>
      liftThresholdsFromRules('LEFT_LIFT', [
        { metric: 'unsupported', operator: 'GTE', value: 20 },
      ]),
    ).toThrow('UNSUPPORTED_SIDE_KICK_RULE_METRIC:unsupported')
    expect(() =>
      returnThresholdsFromRules('LEFT_RETURN', [
        {
          metric: 'leg_delta_deg',
          operator: 'GTE',
          value: 15,
          transform: 'ABS',
        },
      ]),
    ).toThrow('UNSUPPORTED_SIDE_KICK_RULE_OPERATOR:LEFT_RETURN:GTE')
  })
})
