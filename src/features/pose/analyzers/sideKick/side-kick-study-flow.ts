export type StudyStep = 1 | 2 | 3 | 4 | 5
export type StepOutcome = 'PASS' | 'NON_PASS' | 'NOT_EVALUATED'
export type MovementEvidence = 'YES' | 'NO' | 'UNKNOWN'

export type FlowRecord = {
  step: StudyStep
  outcome: StepOutcome
  feedbackCount: number
}

export type FlowInput = {
  timestampMs: number
  readyConfirmed?: boolean
  liftPassed?: boolean
  movement?: MovementEvidence
  neutralConfirmed?: boolean
  feedbackIssued?: boolean
}

export type FlowSnapshot = {
  step: StudyStep | null
  completed: boolean
  finalResult: 'PASS' | 'NON_PASS' | null
  records: FlowRecord[]
  events: string[]
  feedbackCount: number
}

const MAX_STEP_MS = 20000
const MAX_FEEDBACK = 5

export class SideKickStudyFlow {
  private step: StudyStep | null = 1
  private startedAt: number | null = null
  private lastAt: number | null = null
  private feedbackCount = 0
  private movement: MovementEvidence = 'UNKNOWN'
  private records: FlowRecord[] = []

  reset(): void {
    this.step = 1
    this.startedAt = null
    this.lastAt = null
    this.feedbackCount = 0
    this.movement = 'UNKNOWN'
    this.records = []
  }

  getSnapshot(events: string[] = []): FlowSnapshot {
    const completed = this.step === null
    const important = this.records.filter(
      (record) => record.step === 2 || record.step === 4,
    )

    return {
      step: this.step,
      completed,
      finalResult: completed
        ? important.length === 2 &&
          important.every((record) => record.outcome === 'PASS')
          ? 'PASS'
          : 'NON_PASS'
        : null,
      records: this.records.map((record) => ({ ...record })),
      events,
      feedbackCount: this.feedbackCount,
    }
  }

  private finish(outcome: StepOutcome, events: string[]): void {
    const finished = this.step
    if (finished === null) return

    this.records.push({
      step: finished,
      outcome,
      feedbackCount: this.feedbackCount,
    })
    events.push(`STEP_${finished}_${outcome}`)

    this.step = finished === 5 ? null : ((finished + 1) as StudyStep)
    this.startedAt = null
    this.feedbackCount = 0

    if (finished === 3 || finished === 5) {
      this.movement = 'UNKNOWN'
    }

    if (this.step === null) events.push('STUDY_COMPLETED')
  }

  update(input: FlowInput): FlowSnapshot {
    const t = input.timestampMs

    if (!Number.isFinite(t) || t < 0) {
      throw new Error('INVALID_TIMESTAMP')
    }

    if (this.lastAt !== null && t <= this.lastAt) {
      return this.getSnapshot()
    }

    this.lastAt = t
    if (this.step === null) return this.getSnapshot()

    this.startedAt ??= t
    const events: string[] = []

    if (this.step === 1) {
      if (input.readyConfirmed === true) {
        this.finish('PASS', events)
      }
      return this.getSnapshot(events)
    }

    if (this.step === 2 || this.step === 4) {
      if (input.movement === 'YES') {
        this.movement = 'YES'
      } else if (input.movement === 'NO' && this.movement === 'UNKNOWN') {
        this.movement = 'NO'
      }

      if (input.liftPassed === true) {
        this.finish('PASS', events)
      } else {
        if (input.feedbackIssued === true) {
          this.feedbackCount = Math.min(MAX_FEEDBACK, this.feedbackCount + 1)
        }

        if (
          t - this.startedAt >= MAX_STEP_MS ||
          this.feedbackCount >= MAX_FEEDBACK
        ) {
          this.finish('NON_PASS', events)
        }
      }

      return this.getSnapshot(events)
    }

    // STEP 3/5: 복귀 판정기는 2프레임/30ms를 이미 확인한다.
    // Flow에는 확정된 neutralConfirmed만 전달한다.
    if (input.neutralConfirmed === true) {
      const outcome = this.movement === 'NO' ? 'NOT_EVALUATED' : 'PASS'
      this.finish(outcome, events)
    }

    return this.getSnapshot(events)
  }
}
