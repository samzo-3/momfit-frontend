import { useId } from 'react'
import type { DailyReport, SetProgress } from '../api/daily-report-api'

interface DailyReportBodyProps {
  report: DailyReport
}

// 일반 운동 점수는 자세 점수가 아니라서 보여주지 않고, 기록마다 완료 세트 / 목표 세트만 보여준다.
function formatSets({ completedSets, targetSets }: SetProgress): string {
  if (completedSets === null) return '-'
  return targetSets === null
    ? String(completedSets)
    : `${completedSets}/${targetSets}`
}

function formatScore(score: number): string {
  return String(Number(score.toFixed(1)))
}

// 리포트 내용. 한마디 → 다음 집중 스텝 → 운동 숫자 → 자세 배우기 숫자 → 안전 안내 순서로 둔다.
function DailyReportBody({ report }: DailyReportBodyProps) {
  const exercisesTitleId = useId()
  const stepsTitleId = useId()
  const { stats, nextFocus } = report
  const hasRecords = stats.recordCount > 0 || stats.stepAttemptCount > 0
  const focusStep = nextFocus
    ? stats.steps.find((step) => step.exerciseStepId === nextFocus.stepId)
    : undefined
  const exerciseLine = [
    stats.totalMinutes > 0 ? `${stats.totalMinutes}분` : null,
    `${stats.recordCount}회`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="text-[17px] leading-relaxed font-medium text-cocoa">
        {report.summary}
      </p>

      {nextFocus && (
        <div className="rounded-2xl bg-sage-soft px-4 py-3">
          <p className="text-[13px] font-semibold text-sage">
            다음에 집중할 스텝{focusStep ? ` · ${focusStep.stepName}` : ''}
          </p>
          <p className="mt-1 text-[15px] text-cocoa">{nextFocus.reason}</p>
        </div>
      )}

      {stats.exercises.length > 0 && (
        <section aria-labelledby={exercisesTitleId}>
          <h3
            id={exercisesTitleId}
            className="text-[13px] font-semibold text-cocoa-secondary"
          >
            운동
          </h3>
          <p className="mt-1 text-[15px] text-cocoa">{exerciseLine}</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {stats.exercises.map((exercise) => (
              <li
                key={exercise.exerciseId}
                className="text-[15px] text-cocoa-secondary"
              >
                {exercise.exerciseName} · 완료 세트{' '}
                {exercise.sets.map(formatSets).join(' · ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.steps.length > 0 && (
        <section aria-labelledby={stepsTitleId}>
          <h3
            id={stepsTitleId}
            className="text-[13px] font-semibold text-cocoa-secondary"
          >
            자세 배우기
          </h3>
          <ul className="mt-1 flex flex-col gap-0.5">
            {stats.steps.map((step) => (
              <li
                key={step.exerciseStepId}
                className="flex justify-between gap-3 text-[15px]"
              >
                <span className="text-cocoa">{step.stepName}</span>
                <span className="text-cocoa-secondary">
                  {step.bestScore === null
                    ? '점수 없음'
                    : `최고 ${formatScore(step.bestScore)}점`}{' '}
                  · 통과 {step.passCount}/{step.attemptCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 운동한 날에만 붙인다. 기록이 없는 날은 안내할 운동이 없다. */}
      {hasRecords && (
        <p className="text-[13px] leading-relaxed text-cocoa-secondary">
          {report.safetyNotice}
        </p>
      )}
    </div>
  )
}

export default DailyReportBody
