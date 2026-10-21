import { describe, expect, it } from 'vitest'
import {
  getSideKickPeakReference,
  getSideKickReferenceVersion,
  isSideKickReferenceApproved,
  validateSideKickReference,
} from './side-kick-reference'

describe('Side Kick 정면 기준 후보', () => {
  it('정면 1~5세트 전용 기준값을 사용한다', () => {
    expect(validateSideKickReference()).toBe(true)
  })

  it('오른쪽 최고점 기준 후보를 조회한다', () => {
    const result = getSideKickPeakReference('RIGHT')

    expect(result.knee_angle_deg).toBeCloseTo(176.7707, 4)
    expect(result.ankle_away_magnitude_ratio).toBeCloseTo(1.2551, 4)
    expect(result.shoulder_screen_tilt_deg).toBeCloseTo(39.4446, 4)
  })

  it('왼쪽 최고점 기준 후보를 조회한다', () => {
    const result = getSideKickPeakReference('LEFT')

    expect(result.knee_angle_deg).toBeCloseTo(178.1402, 4)
    expect(result.ankle_away_magnitude_ratio).toBeCloseTo(1.2756, 4)
    expect(result.pelvis_screen_tilt_deg).toBeCloseTo(22.9649, 4)
  })

  it('기준값 버전을 확인한다', () => {
    expect(getSideKickReferenceVersion()).toBe('0.1.0')
  })

  it('실험용 기준값을 승인된 기준으로 취급하지 않는다', () => {
    expect(isSideKickReferenceApproved()).toBe(false)
  })
})
