import { describe, expect, it } from 'vitest'
import {
  SideKickReturnEvaluator,
} from './side-kick-return-evaluator'
import type { LiftInput, SideKickSide } from './side-kick-step-evaluator'

const BASELINE = {
  left: -6.879,
  right: -4.444,
}

function input(
  side: SideKickSide,
  t: number,
  legDelta = 0,
  bend = 0,
  asym = 0,
): LiftInput {
  const orientation = side === 'left' ? 1 : -1

  return {
    timestampMs: t,
    thighLateralDeg: BASELINE[side] + legDelta,
    shoulderPelvisRelativeTiltDeg: orientation * bend,
    torsoLengthAsymmetryRatio: -orientation * asym,
  }
}

for (const side of ['left', 'right'] as const) {
  describe(`${side} return evaluator`, () => {
    it('READY 복귀 2프레임이면 확정한다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      expect(evaluator.update(input(side, 0)).neutralConfirmed).toBe(false)
      expect(evaluator.update(input(side, 70)).neutralConfirmed).toBe(true)
    })

    it('한 프레임만 READY이면 확정하지 않는다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      expect(evaluator.update(input(side, 0)).state).toBe('NEUTRAL_CANDIDATE')
    })

    it('다리가 여전히 올라간 상태는 복귀가 아니다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      for (let t = 0; t <= 700; t += 70) {
        expect(
          evaluator.update(input(side, t, 25, 0, 0)).neutralConfirmed,
        ).toBe(false)
      }
    })

    it('몸통이 기울어진 상태는 복귀가 아니다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      for (let t = 0; t <= 700; t += 70) {
        expect(
          evaluator.update(input(side, t, 0, 29, 0.5)).neutralConfirmed,
        ).toBe(false)
      }
    })

    it('복귀 중 다시 이탈하면 확인을 처음부터 시작한다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      evaluator.update(input(side, 0))
      evaluator.update(input(side, 70, 25))

      expect(evaluator.update(input(side, 140)).neutralConfirmed).toBe(false)
      expect(evaluator.update(input(side, 210)).neutralConfirmed).toBe(true)
    })

    it('측정 누락 상태에서는 복귀를 확정하지 않는다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      evaluator.update(input(side, 0))

      const missing = {
        ...input(side, 70),
        torsoLengthAsymmetryRatio: null,
      }

      expect(evaluator.update(missing).neutralConfirmed).toBe(false)
      expect(evaluator.update(input(side, 140)).neutralConfirmed).toBe(false)
      expect(evaluator.update(input(side, 210)).neutralConfirmed).toBe(true)
    })

    it('프레임 간격이 너무 길면 확인 시간을 초기화한다', () => {
      const evaluator = new SideKickReturnEvaluator(side, BASELINE[side])

      evaluator.update(input(side, 0))

      expect(evaluator.update(input(side, 1000)).neutralConfirmed).toBe(false)
      expect(evaluator.update(input(side, 1070)).neutralConfirmed).toBe(true)
    })
  })
}
