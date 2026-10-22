import { describe, expect, it } from 'vitest'
import { ReadyHoldTracker } from './ready-hold'

describe('ReadyHoldTracker', () => {
  it('resets when readiness fails', () => {
    const tracker = new ReadyHoldTracker()
    tracker.update(true, 0)
    expect(tracker.update(true, 1_999).completed).toBe(false)
    expect(tracker.update(true, 2_000).completed).toBe(true)
    tracker.update(false, 2_001)
    tracker.update(true, 3_000)
    expect(tracker.update(true, 4_999).completed).toBe(false)
    expect(tracker.update(true, 5_000).completed).toBe(true)
  })
})
