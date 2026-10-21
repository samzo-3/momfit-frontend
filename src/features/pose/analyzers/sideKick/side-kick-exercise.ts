import type { SideKickMotionEvent } from './side-kick-motion'

export type SideKickExercisePhase = 'WAIT_LEFT' | 'WAIT_RIGHT' | 'COMPLETED'

export type SideKickExerciseEvent =
  | {
      type: 'SET_COMPLETED'
      setNo: number
      timestampMs: number
    }
  | {
      type: 'PARTIAL_SET_CANCELLED'
      reason: 'TRACKING_LOST' | 'UNEXPECTED_RIGHT'
    }

export type SideKickExerciseResult = {
  phase: SideKickExercisePhase
  completedSets: number
  currentSet: number
  targetSets: number
  events: SideKickExerciseEvent[]
}

export class SideKickExerciseTracker {
  private completedSets = 0
  private phase: SideKickExercisePhase = 'WAIT_LEFT'
  private readonly targetSets: number

  constructor(targetSets = 10) {
    if (
      !Number.isInteger(targetSets) ||
      targetSets < 1
    ) {
      throw new Error('INVALID_TARGET_SETS')
    }

    this.targetSets = targetSets
  }

  reset(): void {
    this.completedSets = 0
    this.phase = 'WAIT_LEFT'
  }

  private snapshot(
    events: SideKickExerciseEvent[] = [],
  ): SideKickExerciseResult {
    return {
      phase: this.phase,
      completedSets: this.completedSets,
      currentSet: Math.min(
        this.completedSets + 1,
        this.targetSets,
      ),
      targetSets: this.targetSets,
      events,
    }
  }

  update(
    motionEvents: SideKickMotionEvent[],
  ): SideKickExerciseResult {
    const events: SideKickExerciseEvent[] = []

    if (this.phase === 'COMPLETED') {
      return this.snapshot()
    }

    for (const event of motionEvents) {
      if (event.type === 'MOTION_PAUSED') {
        if (this.phase === 'WAIT_RIGHT') {
          events.push({
            type: 'PARTIAL_SET_CANCELLED',
            reason: 'TRACKING_LOST',
          })
        }

        this.phase = 'WAIT_LEFT'
        continue
      }

      if (event.type !== 'REP_COMPLETED') {
        continue
      }

      if (this.phase === 'WAIT_LEFT') {
        if (event.side === 'LEFT') {
          this.phase = 'WAIT_RIGHT'
        } else {
          events.push({
            type: 'PARTIAL_SET_CANCELLED',
            reason: 'UNEXPECTED_RIGHT',
          })
        }

        continue
      }

      if (this.phase === 'WAIT_RIGHT') {
        if (event.side === 'RIGHT') {
          this.completedSets += 1

          events.push({
            type: 'SET_COMPLETED',
            setNo: this.completedSets,
            timestampMs: event.timestampMs,
          })

          this.phase =
            this.completedSets >= this.targetSets
              ? 'COMPLETED'
              : 'WAIT_LEFT'
        }
        // LEFT 반복은 기존 왼쪽 완료 상태를 유지한다.
      }

      if (this.phase === 'COMPLETED') {
        break
      }
    }

    return this.snapshot(events)
  }

  getResult(): SideKickExerciseResult {
    return this.snapshot()
  }
}
