// 임신 주차를 초기·중기·후기로 나눈 구간. 일반적으로 쓰는 구분(1~13 / 14~27 / 28~40주)이며
// 의학적 진단이 아니라 화면에서 진행 정도를 보여 주기 위한 표시다.
export const STAGES = [
  { key: 'early', label: '초기', from: 1, to: 13 },
  { key: 'mid', label: '중기', from: 14, to: 27 },
  { key: 'late', label: '후기', from: 28, to: 40 },
] as const

export type Stage = (typeof STAGES)[number]

export const TOTAL_WEEKS = 40

// 주차가 속한 구간. 40주를 넘기거나 알 수 없으면(null) 마지막 구간·null이다.
export function stageOf(week: number | null): Stage | null {
  if (week === null || week < 1) return null
  return STAGES.find((stage) => week <= stage.to) ?? STAGES[STAGES.length - 1]
}

// 구간 안에서 채워진 비율(0~1). 현재 주차까지 채운 것으로 본다.
export function stageFill(stage: Stage, week: number | null): number {
  if (week === null) return 0
  const length = stage.to - stage.from + 1
  return Math.min(Math.max((week - stage.from + 1) / length, 0), 1)
}
