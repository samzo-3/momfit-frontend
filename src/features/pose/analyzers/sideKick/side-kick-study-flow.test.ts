import { describe, expect, it } from 'vitest'
import { SideKickStudyFlow } from './side-kick-study-flow'

function begin(flow: SideKickStudyFlow) {
  flow.update({ timestampMs: 0, readyConfirmed: true })
}

function returnNeutral(flow: SideKickStudyFlow, start: number) {
  return flow.update({
    timestampMs: start,
    neutralConfirmed: true,
  })
}

describe('SideKickStudyFlow', () => {
  it('READY 확인 전 STEP 2로 이동하지 않는다', () => {
    const flow = new SideKickStudyFlow()
    expect(flow.update({ timestampMs: 0 }).step).toBe(1)
    expect(
      flow.update({
        timestampMs: 70,
        readyConfirmed: true,
      }).step,
    ).toBe(2)
  })

  it('STEP 2 PASS 후 복귀 전에는 STEP 4로 이동하지 않는다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({
      timestampMs: 100,
      liftPassed: true,
      movement: 'YES',
    })
    expect(flow.update({ timestampMs: 200 }).step).toBe(3)
    expect(flow.update({ timestampMs: 21000 }).step).toBe(3)
    expect(returnNeutral(flow, 21100).step).toBe(4)
  })

  it('STEP 2가 실패해도 복귀 단계로 이동한다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({ timestampMs: 100, movement: 'YES' })
    expect(flow.update({ timestampMs: 20200 }).step).toBe(3)
    expect(returnNeutral(flow, 20300).step).toBe(4)
    expect(flow.getSnapshot().records[1].outcome).toBe('NON_PASS')
  })

  it('코칭 5회를 사용하면 NON_PASS 후 복귀한다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    for (let i = 1; i <= 5; i++) {
      flow.update({
        timestampMs: i * 100,
        feedbackIssued: true,
        movement: 'YES',
      })
    }
    expect(flow.getSnapshot().step).toBe(3)
    expect(flow.getSnapshot().records[1].feedbackCount).toBe(5)
  })

  it('움직임이 없고 READY가 확인되면 복귀를 생략할 수 있다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({ timestampMs: 100, movement: 'NO' })
    flow.update({ timestampMs: 20200 })
    expect(returnNeutral(flow, 20300).step).toBe(4)
    expect(flow.getSnapshot().records[2].outcome).toBe('NOT_EVALUATED')
  })

  it('READY 확인 없이 복귀를 생략하지 않는다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({ timestampMs: 100, movement: 'UNKNOWN' })
    flow.update({ timestampMs: 20200 })
    expect(flow.update({ timestampMs: 20300 }).step).toBe(3)
  })

  it('STEP 2와 4가 모두 PASS면 최종 PASS다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({ timestampMs: 100, liftPassed: true })
    returnNeutral(flow, 200)
    flow.update({ timestampMs: 400, liftPassed: true })
    const result = returnNeutral(flow, 500)
    expect(result.completed).toBe(true)
    expect(result.finalResult).toBe('PASS')
    expect(result.records).toHaveLength(5)
  })

  it('중요 STEP 하나라도 실패하면 최종 NON_PASS다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({ timestampMs: 100 })
    flow.update({ timestampMs: 20200 })
    returnNeutral(flow, 20300)
    flow.update({ timestampMs: 20500, liftPassed: true })
    const result = returnNeutral(flow, 20600)
    expect(result.finalResult).toBe('NON_PASS')
  })

  it('중복 타임스탬프에서 이벤트를 다시 발생시키지 않는다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    expect(
      flow.update({
        timestampMs: 100,
        liftPassed: true,
      }).events,
    ).toContain('STEP_2_PASS')
    expect(
      flow.update({
        timestampMs: 100,
        liftPassed: true,
      }).events,
    ).toEqual([])
  })

  it('재시작하면 STEP과 결과를 초기화한다', () => {
    const flow = new SideKickStudyFlow()
    begin(flow)
    flow.update({ timestampMs: 100, liftPassed: true })
    flow.reset()
    expect(flow.getSnapshot().step).toBe(1)
    expect(flow.getSnapshot().records).toHaveLength(0)
  })
})
