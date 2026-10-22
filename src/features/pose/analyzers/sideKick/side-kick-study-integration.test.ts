import { describe, expect, it } from 'vitest'
import { SideKickStudyFlow } from './side-kick-study-flow'
import { SideKickReturnEvaluator } from './side-kick-return-evaluator'
import type { SideKickSide } from './side-kick-step-evaluator'

const baseline = { left: -6.879, right: -4.444 }

function pose(side: SideKickSide, t: number, legDelta: number) {
  return {
    timestampMs: t,
    thighLateralDeg: baseline[side] + legDelta,
    shoulderPelvisRelativeTiltDeg: 0,
    torsoLengthAsymmetryRatio: 0,
  }
}

describe('Side Kick STEP integration', () => {
  it('STEP 2 PASS 후 왼쪽 다리가 내려오기 전에는 STEP 4로 가지 않는다', () => {
    const flow = new SideKickStudyFlow()
    const ret = new SideKickReturnEvaluator('left', baseline.left)

    flow.update({ timestampMs: 0, readyConfirmed: true })
    flow.update({
      timestampMs: 100,
      liftPassed: true,
      movement: 'YES',
    })

    expect(flow.getSnapshot().step).toBe(3)

    for (const t of [200, 270, 340, 410]) {
      const result = ret.update(pose('left', t, 30))
      flow.update({
        timestampMs: t,
        neutralConfirmed: result.neutralConfirmed,
      })
    }

    expect(flow.getSnapshot().step).toBe(3)

    for (const t of [480, 550]) {
      const result = ret.update(pose('left', t, 0))
      flow.update({
        timestampMs: t,
        neutralConfirmed: result.neutralConfirmed,
      })
    }

    expect(flow.getSnapshot().step).toBe(4)
    expect(flow.getSnapshot().records[1].outcome).toBe('PASS')
    expect(flow.getSnapshot().records[2].outcome).toBe('PASS')
  })

  it('STEP 4 NON_PASS여도 오른쪽 복귀 후 최종 NON_PASS를 유지한다', () => {
    const flow = new SideKickStudyFlow()
    const left = new SideKickReturnEvaluator('left', baseline.left)
    const right = new SideKickReturnEvaluator('right', baseline.right)

    flow.update({ timestampMs: 0, readyConfirmed: true })
    flow.update({
      timestampMs: 100,
      liftPassed: true,
      movement: 'YES',
    })

    for (const t of [200, 270]) {
      flow.update({
        timestampMs: t,
        neutralConfirmed: left.update(pose('left', t, 0)).neutralConfirmed,
      })
    }

    expect(flow.getSnapshot().step).toBe(4)

    flow.update({ timestampMs: 300, movement: 'YES' })
    flow.update({ timestampMs: 20400 })
    expect(flow.getSnapshot().step).toBe(5)

    for (const t of [20500, 20570]) {
      flow.update({
        timestampMs: t,
        neutralConfirmed: right.update(pose('right', t, 0)).neutralConfirmed,
      })
    }

    const result = flow.getSnapshot()
    expect(result.completed).toBe(true)
    expect(result.finalResult).toBe('NON_PASS')
    expect(result.records[3].outcome).toBe('NON_PASS')
  })

  it('측정 누락은 STEP 3 복귀로 간주하지 않는다', () => {
    const flow = new SideKickStudyFlow()
    const ret = new SideKickReturnEvaluator('left', baseline.left)

    flow.update({ timestampMs: 0, readyConfirmed: true })
    flow.update({ timestampMs: 100, liftPassed: true })

    const frame = {
      ...pose('left', 200, 0),
      torsoLengthAsymmetryRatio: null,
    }

    flow.update({
      timestampMs: 200,
      neutralConfirmed: ret.update(frame).neutralConfirmed,
    })

    expect(flow.getSnapshot().step).toBe(3)
  })
})
