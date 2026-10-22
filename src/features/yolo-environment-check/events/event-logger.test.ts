import { describe, expect, it } from 'vitest'
import { EnvironmentEventLogger } from './event-logger'

describe('EnvironmentEventLogger', () => {
  it('records MULTIPLE_PEOPLE only on a state change requested by the caller and closes once', () => {
    const logger = new EnvironmentEventLogger()
    const started = logger.start('EXERCISE')
    expect(started.session_id).toMatch(/^[0-9a-f-]{36}$/i)

    expect(logger.record('CAMERA_ON')).toBe(true)
    expect(logger.record('CAMERA_ON')).toBe(false)
    expect(logger.record('MULTIPLE_PEOPLE', { person_count: 2 })).toBe(true)
    const finished = logger.finish('PASS', 'PASS_AUTO_START', {
      hold_ms: 2_000,
    })

    expect(finished?.result).toBe('PASS')
    expect(finished?.events.map((event) => event.type)).toEqual([
      'CAMERA_ON',
      'MULTIPLE_PEOPLE',
      'PASS_AUTO_START',
    ])
    expect(finished?.events[1]).toMatchObject({
      source: 'ENVIRONMENT_POLICY',
      level: 'WARNING',
      details: { person_count: 2 },
    })
    expect(logger.record('COUNTDOWN_RESET')).toBe(false)
    expect(logger.finish('FAIL', 'FAIL_MANUAL_END')).toBeNull()
  })
})
