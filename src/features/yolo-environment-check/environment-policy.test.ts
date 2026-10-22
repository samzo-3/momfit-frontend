import { describe, expect, it } from 'vitest'
import { evaluateEnvironment, poseAlignment } from './environment-policy'

describe('environment policy', () => {
  it('requires one person and a visible aligned pose', () => {
    const landmarks = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 1,
      presence: 1,
    }))
    const pose = poseAlignment(landmarks)
    expect(evaluateEnvironment([], pose).ready).toBe(false)
    expect(
      evaluateEnvironment(
        [
          {
            detectionId: 1,
            classId: 0,
            className: 'person',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            confidence: 1,
          },
        ],
        pose,
      ).ready,
    ).toBe(true)
  })

  it('rejects a cropped body even when shoulders and hips are visible', () => {
    const landmarks = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      visibility: 1,
      presence: 1,
    }))
    landmarks[31] = { x: 0.5, y: 1.02, visibility: 0.1, presence: 0.1 }
    expect(poseAlignment(landmarks)).toEqual({
      poseTracked: true,
      fullBodyValid: false,
      inGuide: false,
      guideAlignment: 'NOT_EVALUABLE',
    })
  })
})
