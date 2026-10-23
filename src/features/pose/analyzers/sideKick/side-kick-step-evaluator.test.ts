import { describe, expect, it } from 'vitest'
import { SideKickStepEvaluator } from './side-kick-step-evaluator'

const baseline = -6.879

function updateForStableMeasurement(
  evaluator: SideKickStepEvaluator,
  input: Omit<Parameters<SideKickStepEvaluator['update']>[0], 'timestampMs'>,
) {
  evaluator.update({ timestampMs: 0, ...input })
  evaluator.update({ timestampMs: 100, ...input })
  return evaluator.update({ timestampMs: 200, ...input })
}

describe('SideKickStepEvaluator criterion failures', () => {
  it('측정값이 부족하면 INVALID와 빈 원인을 반환한다', () => {
    const snapshot = new SideKickStepEvaluator('left', baseline).update({
      timestampMs: 0,
      thighLateralDeg: baseline + 30,
      shoulderPelvisRelativeTiltDeg: null,
      torsoLengthAsymmetryRatio: -0.56,
    })

    expect(snapshot).toMatchObject({
      valid: false,
      measurementStatus: 'INVALID',
      criterionFailures: [],
    })
  })

  it('유효한 STEP 2 측정에서 JSON PASS 기준에 미달한 항목만 반환한다', () => {
    const snapshot = updateForStableMeasurement(
      new SideKickStepEvaluator('left', baseline),
      {
        thighLateralDeg: baseline + 19,
        shoulderPelvisRelativeTiltDeg: 27,
        torsoLengthAsymmetryRatio: -0.39,
      },
    )

    expect(snapshot).toMatchObject({
      valid: true,
      measurementStatus: 'VALID',
      criterionFailures: [
        'LEG_LIFT_INSUFFICIENT',
        'TORSO_BEND_INSUFFICIENT',
        'TORSO_ASYMMETRY_INSUFFICIENT',
      ],
    })
  })

  it('STEP 4의 오른쪽 방향 보정값으로 원인을 계산한다', () => {
    const snapshot = updateForStableMeasurement(
      new SideKickStepEvaluator('right', baseline),
      {
        thighLateralDeg: baseline + 30,
        shoulderPelvisRelativeTiltDeg: -27,
        torsoLengthAsymmetryRatio: 0.39,
      },
    )

    expect(snapshot).toMatchObject({
      valid: true,
      measurementStatus: 'VALID',
      criterionFailures: [
        'TORSO_BEND_INSUFFICIENT',
        'TORSO_ASYMMETRY_INSUFFICIENT',
      ],
    })
  })

  it('PASS 뒤에는 기준 미달 원인을 반환하지 않는다', () => {
    const evaluator = new SideKickStepEvaluator('left', baseline)
    const input = {
      thighLateralDeg: baseline + 30,
      shoulderPelvisRelativeTiltDeg: 34,
      torsoLengthAsymmetryRatio: -0.56,
    }

    let snapshot = evaluator.update({ timestampMs: 0, ...input })
    for (let timestampMs = 100; timestampMs <= 2400; timestampMs += 100) {
      snapshot = evaluator.update({ timestampMs, ...input })
    }

    expect(snapshot).toMatchObject({
      state: 'PASS',
      measurementStatus: 'VALID',
      criterionFailures: [],
    })
  })
})
