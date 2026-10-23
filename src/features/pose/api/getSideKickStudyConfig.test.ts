import { describe, expect, it } from 'vitest'
import {
  matchesSideKickRuntimeCriteriaVersion,
  type SideKickStudyConfig,
} from './getSideKickStudyConfig'

const config: SideKickStudyConfig = {
  exercise_id: 91,
  exercise_name: 'Side Kick',
  exercise_criteria_version_id: 301,
  criteria_version: '1.0.0',
  steps: [1, 2, 3, 4, 5].map((step_no) => ({
    step_no,
    exercise_step_id: 100 + step_no,
    step_name: `STEP ${step_no}`,
  })),
}

describe('Side Kick study config criteria binding', () => {
  it('JSON criteria version이 없거나 다르면 기록 저장을 차단한다', () => {
    expect(matchesSideKickRuntimeCriteriaVersion(config, null)).toBe(false)
    expect(matchesSideKickRuntimeCriteriaVersion(config, '2.0.0')).toBe(false)
  })

  it('명시적으로 같은 criteria version일 때만 저장을 허용한다', () => {
    expect(matchesSideKickRuntimeCriteriaVersion(config, '1.0.0')).toBe(true)
  })
})
