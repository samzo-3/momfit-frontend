import type { ExerciseInfo, ExercisePoint } from './api/admin-api'
import { CATEGORICAL, OTHER_COLOR } from './components/chart-style'

export interface ExerciseSlot {
  // 차트 데이터의 키. 운동은 `e<id>`, 묶음은 `other`
  key: string
  name: string
  color: string
  totalCount: number
  // 묶음("기타")은 운동마다 점수 기준이 달라 평균을 내지 않는다.
  averageScore: number | null
}

export type ExerciseRow = { periodStart: string } & Record<
  string,
  number | string
>

export const OTHER_KEY = 'other'

// 운동을 색 슬롯에 배정한다. 서버가 id 순으로 주므로 같은 운동은 늘 같은 색이고,
// 슬롯(8개)을 넘는 운동은 새 색을 만들지 않고 "기타"로 합친다.
export function buildExerciseSlots(exercises: ExerciseInfo[]): {
  slots: ExerciseSlot[]
  keyOf: Map<number, string>
} {
  const keyOf = new Map<number, string>()
  const slots: ExerciseSlot[] = []
  const head = exercises.slice(0, CATEGORICAL.length)
  const tail = exercises.slice(CATEGORICAL.length)

  head.forEach((e, index) => {
    const key = `e${e.exerciseId}`
    keyOf.set(e.exerciseId, key)
    slots.push({
      key,
      name: e.exerciseName,
      color: CATEGORICAL[index],
      totalCount: e.totalCount,
      averageScore: e.averageScore,
    })
  })
  if (tail.length > 0) {
    tail.forEach((e) => keyOf.set(e.exerciseId, OTHER_KEY))
    slots.push({
      key: OTHER_KEY,
      name: '기타',
      color: OTHER_COLOR,
      totalCount: tail.reduce((sum, e) => sum + e.totalCount, 0),
      averageScore: null,
    })
  }
  return { slots, keyOf }
}

// 구간별 데이터를 차트 한 줄(구간 + 슬롯별 횟수)로 바꾼다.
export function buildExerciseRows(
  series: ExercisePoint[],
  slots: ExerciseSlot[],
  keyOf: Map<number, string>,
): ExerciseRow[] {
  return series.map((point) => {
    const row: ExerciseRow = { periodStart: point.periodStart }
    for (const slot of slots) row[slot.key] = 0
    for (const [id, count] of Object.entries(point.counts)) {
      const key = keyOf.get(Number(id))
      if (key) row[key] = (row[key] as number) + count
    }
    return row
  })
}
