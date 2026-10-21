/**
 * MomFit Side Kick - STUDY Progress Engine
 *
 * 담당 기능:
 * - 5개 STEP 순차 진행
 * - 점수 기반 PASS / NON_PASS
 * - 기준 점수 이상 3초 연속 유지
 * - 오류별 음성 코칭 요청
 * - 최대 5회 코칭 후 NON_PASS
 * - STEP별 점수 및 결과 생성
 *
 * 담당하지 않는 기능:
 * - MediaPipe 관절값 추출
 * - 관절별 점수 계산
 * - 실제 MP3 재생
 * - DB 저장 및 exercise_step_id 조회
 */

export type StudyStepNumber = 1 | 2 | 3 | 4 | 5

export type StudyStepStatus = 'PASS' | 'NON_PASS'

export type StudyJudgment =
  | {
      status: 'EVALUATED'
      score: number
      eventCode: string | null
    }
  | {
      status: 'UNAVAILABLE'
      reason: 'TRACKING' | 'FRONT' | 'POSE'
    }

export type StudyStepRecord = {
  stepNo: StudyStepNumber
  status: StudyStepStatus
  stepScore: number | null
  feedbackCount: number
  completedAtMs: number
}

export type StudyEvent =
  | {
      type: 'VOICE_CUE'
      stepNo: StudyStepNumber
      eventCode: string
    }
  | {
      type: 'STEP_COMPLETED'
      record: StudyStepRecord
    }
  | {
      type: 'STUDY_COMPLETED'
    }

export type StudyResult = {
  stepNo: StudyStepNumber | null
  status: 'RUNNING' | 'COMPLETED'
  holdProgressMs: number
  holdProgressPercent: number
  feedbackCount: number
  currentScore: number | null
  bestScore: number | null
  records: StudyStepRecord[]
  events: StudyEvent[]
}

export type StudyConfig = {
  passScore: number
  holdDurationMs: number
  mismatchDurationMs: number
  maxFeedbackCount: number
  feedbackCooldownMs: number
  maxFrameGapMs: number
  maxStepDurationMs: number
}

export const DEFAULT_STUDY_CONFIG: StudyConfig = {
  passScore: 80,
  holdDurationMs: 2000,
  mismatchDurationMs: 1500,
  maxFeedbackCount: 5,
  feedbackCooldownMs: 2500,
  maxFrameGapMs: 500,
  maxStepDurationMs: 20000,
}

export class SideKickStudyTracker {
  private currentStep = 1

  private stepStartedAt: number | null = null
  private holdStartedAt: number | null = null
  private mismatchStartedAt: number | null = null
  private holdScores: number[] = []

  private feedbackCount = 0
  private lastFeedbackAt: number | null = null
  private lastTimestamp: number | null = null

  private currentScore: number | null = null
  private bestScore: number | null = null

  private records: StudyStepRecord[] = []

  private readonly config: StudyConfig

  constructor(config: Partial<StudyConfig> = {}) {
    this.config = {
      ...DEFAULT_STUDY_CONFIG,
      ...config,
    }

    const {
      passScore,
      holdDurationMs,
      mismatchDurationMs,
      maxFeedbackCount,
      feedbackCooldownMs,
      maxFrameGapMs,
    } = this.config

    if (
      ![
        passScore,
        holdDurationMs,
        mismatchDurationMs,
        maxFeedbackCount,
        feedbackCooldownMs,
        maxFrameGapMs,
      ].every(Number.isFinite) ||
      passScore < 0 ||
      passScore > 100 ||
      holdDurationMs <= 0 ||
      mismatchDurationMs <= 0 ||
      !Number.isInteger(maxFeedbackCount) ||
      maxFeedbackCount <= 0 ||
      feedbackCooldownMs < 0 ||
      maxFrameGapMs <= 0 ||
      !Number.isFinite(this.config.maxStepDurationMs) ||
      this.config.maxStepDurationMs <= 0
    ) {
      throw new Error('INVALID_STUDY_CONFIG')
    }
  }

  private getStepNo(): StudyStepNumber | null {
    if (this.currentStep > 5) {
      return null
    }

    return this.currentStep as StudyStepNumber
  }

  private clearHold(): void {
    this.holdStartedAt = null
    this.holdScores = []
  }

  private resetStepState(): void {
    this.stepStartedAt = null
    this.clearHold()
    this.mismatchStartedAt = null
    this.feedbackCount = 0
    this.lastFeedbackAt = null
    this.currentScore = null
    this.bestScore = null
  }

  private snapshot(events: StudyEvent[] = []): StudyResult {
    const now = this.lastTimestamp ?? 0

    const holdProgressMs =
      this.holdStartedAt === null
        ? 0
        : Math.min(
            Math.max(0, now - this.holdStartedAt),
            this.config.holdDurationMs,
          )

    return {
      stepNo: this.getStepNo(),
      status: this.currentStep > 5 ? 'COMPLETED' : 'RUNNING',
      holdProgressMs,
      holdProgressPercent: Math.round(
        (holdProgressMs / this.config.holdDurationMs) * 100,
      ),
      feedbackCount: this.feedbackCount,
      currentScore: this.currentScore,
      bestScore: this.bestScore,
      records: this.records.map((record) => ({ ...record })),
      events,
    }
  }

  private roundScore(score: number): number {
    return Math.round(score * 100) / 100
  }

  private average(scores: number[]): number {
    if (scores.length === 0) {
      throw new Error('EMPTY_STUDY_SCORES')
    }

    const sum = scores.reduce((total, score) => total + score, 0)
    return this.roundScore(sum / scores.length)
  }

  private finishStep(
    status: StudyStepStatus,
    timestampMs: number,
  ): StudyResult {
    const stepNo = this.getStepNo()

    if (stepNo === null) {
      return this.snapshot()
    }

    // PASS: 3초 유지 구간에 기록한 점수의 평균
    // NON_PASS: 유효하게 측정된 점수 중 최고값
    const stepScore =
      status === 'PASS'
        ? this.average(this.holdScores)
        : this.bestScore === null
          ? null
          : this.roundScore(this.bestScore)

    const record: StudyStepRecord = {
      stepNo,
      status,
      stepScore,
      feedbackCount: this.feedbackCount,
      completedAtMs: timestampMs,
    }

    this.records.push(record)
    this.currentStep += 1
    this.resetStepState()

    const events: StudyEvent[] = [
      {
        type: 'STEP_COMPLETED',
        record: { ...record },
      },
    ]

    if (this.currentStep > 5) {
      events.push({ type: 'STUDY_COMPLETED' })
    }

    return this.snapshot(events)
  }

  update(timestampMs: number, judgment: StudyJudgment): StudyResult {
    if (!Number.isFinite(timestampMs) || timestampMs < 0) {
      throw new Error('INVALID_STUDY_TIMESTAMP')
    }

    // 중복 프레임이나 역순 입력은 무시한다.
    if (this.lastTimestamp !== null && timestampMs <= this.lastTimestamp) {
      return this.snapshot()
    }

    // 프레임이 오래 끊겼다면 이전 유지 시간을 인정하지 않는다.
    if (
      this.lastTimestamp !== null &&
      timestampMs - this.lastTimestamp > this.config.maxFrameGapMs
    ) {
      this.clearHold()
      this.mismatchStartedAt = null
    }

    this.lastTimestamp = timestampMs

    if (this.currentStep > 5) {
      return this.snapshot()
    }

    // STEP 시작 이후 20초가 경과하면 NON_PASS.
    // 인식 실패는 점수 0점으로 처리하지 않는다.
    if (judgment.status === 'EVALUATED' && this.stepStartedAt === null) {
      this.stepStartedAt = timestampMs
    }

    if (
      this.stepStartedAt !== null &&
      judgment.status === 'EVALUATED' &&
      timestampMs - this.stepStartedAt >= this.config.maxStepDurationMs
    ) {
      return this.finishStep('NON_PASS', timestampMs)
    }

    // MediaPipe 인식 실패 및 정면 불확실성은
    // 점수 0점이나 자세 실패로 처리하지 않는다.
    if (judgment.status === 'UNAVAILABLE') {
      this.clearHold()
      this.mismatchStartedAt = null
      this.currentScore = null
      return this.snapshot()
    }

    const score = judgment.score

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('INVALID_STUDY_SCORE')
    }

    this.currentScore = score

    if (this.bestScore === null || score > this.bestScore) {
      this.bestScore = score
    }

    // ============================
    // 기준 점수 이상: HOLD 시작
    // ============================
    if (score >= this.config.passScore) {
      this.mismatchStartedAt = null
      if (this.holdStartedAt === null) {
        this.holdStartedAt = timestampMs
        this.holdScores = []
      }

      this.holdScores.push(score)

      if (timestampMs - this.holdStartedAt >= this.config.holdDurationMs) {
        return this.finishStep('PASS', timestampMs)
      }

      return this.snapshot()
    }

    // ============================
    // 기준 점수 미달: HOLD 취소
    // ============================
    this.clearHold()

    if (this.mismatchStartedAt === null) {
      this.mismatchStartedAt = timestampMs
    }

    const eventCode = judgment.eventCode?.trim()

    // 자세 점수는 낮지만 원인이 확정되지 않았다면
    // 임의의 음성 오류 코드를 만들지 않는다.
    if (!eventCode) {
      this.mismatchStartedAt = null
      return this.snapshot()
    }

    // 잘못된 자세가 일정 시간 유지되었을 때만 코칭한다.
    if (timestampMs - this.mismatchStartedAt < this.config.mismatchDurationMs) {
      return this.snapshot()
    }

    // 동일 STEP에서 음성 코칭을 너무 자주 요청하지 않는다.
    if (
      this.lastFeedbackAt !== null &&
      timestampMs - this.lastFeedbackAt < this.config.feedbackCooldownMs
    ) {
      return this.snapshot()
    }

    this.feedbackCount += 1
    this.lastFeedbackAt = timestampMs
    this.mismatchStartedAt = timestampMs

    const cue: StudyEvent = {
      type: 'VOICE_CUE',
      stepNo: this.currentStep as StudyStepNumber,
      eventCode,
    }

    // 5번째 코칭 요청 발생 후 NON_PASS 처리
    if (this.feedbackCount >= this.config.maxFeedbackCount) {
      const completed = this.finishStep('NON_PASS', timestampMs)

      return {
        ...completed,
        events: [cue, ...completed.events],
      }
    }

    return this.snapshot([cue])
  }

  reset(): void {
    this.currentStep = 1
    this.resetStepState()
    this.lastTimestamp = null
    this.records = []
  }

  getRecords(): StudyStepRecord[] {
    return this.records.map((record) => ({ ...record }))
  }

  getConfig(): StudyConfig {
    return { ...this.config }
  }
}
