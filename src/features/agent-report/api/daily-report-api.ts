import { apiRequest } from '../../../shared/api'

// 일반 운동 기록 하나의 세트 진행. 목표 세트는 팀 점수 규칙에 없는 운동이면 null이다.
export interface SetProgress {
  completedSets: number | null
  targetSets: number | null
}

export interface ExerciseSummary {
  exerciseId: number
  exerciseName: string
  recordCount: number
  sets: SetProgress[]
}

// 자세 배우기 스텝 하나. 통과 횟수는 스텝 기록 status(PASS, 80점 이상)를 센 것이다.
export interface StepSummary {
  exerciseStepId: number
  stepName: string
  attemptCount: number
  bestScore: number | null
  passCount: number
}

export interface DailyReportStats {
  recordCount: number
  totalMinutes: number
  exercises: ExerciseSummary[]
  stepAttemptCount: number
  steps: StepSummary[]
}

export interface NextFocus {
  stepId: number
  reason: string
}

// 숫자는 서버 코드가 팀 기록에서 센 것이고, summary와 nextFocus의 reason만 LLM이 쓴다.
export interface DailyReport {
  date: string
  stats: DailyReportStats
  safetyNotice: string
  summary: string
  nextFocus: NextFocus | null
}

interface DailyReportResponse {
  date: string
  stats: {
    record_count: number
    total_minutes: number
    exercises: {
      exercise_id: number
      exercise_name: string
      record_count: number
      sets: { completed_sets: number | null; target_sets: number | null }[]
    }[]
    step_attempt_count: number
    steps: {
      exercise_step_id: number
      step_name: string
      attempt_count: number
      best_score: number | null
      pass_count: number
    }[]
  }
  safety_notice: string
  summary: string
  next_focus: { step_id: number; reason: string } | null
}

// date는 "YYYY-MM-DD"(KST). 서버는 그날 기록이 그대로면 저장한 리포트를 돌려주고, 지난 날짜는 다시 만들지 않는다.
export async function getDailyReport(date: string): Promise<DailyReport> {
  const body = await apiRequest<DailyReportResponse>('/agent/daily-report', {
    method: 'POST',
    body: { date },
  })
  return {
    date: body.date,
    stats: {
      recordCount: body.stats.record_count,
      totalMinutes: body.stats.total_minutes,
      exercises: body.stats.exercises.map((item) => ({
        exerciseId: item.exercise_id,
        exerciseName: item.exercise_name,
        recordCount: item.record_count,
        sets: item.sets.map((progress) => ({
          completedSets: progress.completed_sets,
          targetSets: progress.target_sets,
        })),
      })),
      stepAttemptCount: body.stats.step_attempt_count,
      steps: body.stats.steps.map((item) => ({
        exerciseStepId: item.exercise_step_id,
        stepName: item.step_name,
        attemptCount: item.attempt_count,
        bestScore: item.best_score,
        passCount: item.pass_count,
      })),
    },
    safetyNotice: body.safety_notice,
    summary: body.summary,
    nextFocus: body.next_focus
      ? { stepId: body.next_focus.step_id, reason: body.next_focus.reason }
      : null,
  }
}
