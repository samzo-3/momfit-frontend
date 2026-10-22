import type { ExerciseInfo, ExercisePoint } from './api/admin-api'
import { buildExerciseRows, buildExerciseSlots } from './exercise-series'
import { CATEGORICAL, OTHER_COLOR } from './components/chart-style'

function exercise(id: number, total = 0, avg: number | null = null) {
  return {
    exerciseId: id,
    exerciseName: `운동${id}`,
    totalCount: total,
    averageScore: avg,
  } satisfies ExerciseInfo
}

describe('buildExerciseSlots', () => {
  it('운동을 id 순서대로 같은 색에 배정한다', () => {
    const { slots, keyOf } = buildExerciseSlots([
      exercise(3, 5, 80),
      exercise(7, 1, null),
    ])

    expect(slots.map((s) => [s.key, s.name, s.color])).toEqual([
      ['e3', '운동3', CATEGORICAL[0]],
      ['e7', '운동7', CATEGORICAL[1]],
    ])
    expect(slots[0]).toMatchObject({ totalCount: 5, averageScore: 80 })
    expect(keyOf.get(7)).toBe('e7')
  })

  it('운동이 하나 줄어도 남은 운동의 색은 그대로다(순위가 아니라 순서 기준)', () => {
    const full = buildExerciseSlots([exercise(1, 9), exercise(2, 0)])
    const reordered = buildExerciseSlots([exercise(1, 0), exercise(2, 9)])

    expect(full.slots[1].color).toBe(reordered.slots[1].color)
  })

  it('8개를 넘으면 나머지는 새 색을 만들지 않고 기타로 합친다', () => {
    const exercises = Array.from({ length: 10 }, (_, i) =>
      exercise(i + 1, i + 1, 70),
    )

    const { slots, keyOf } = buildExerciseSlots(exercises)

    expect(slots).toHaveLength(CATEGORICAL.length + 1)
    const other = slots[slots.length - 1]
    expect(other).toMatchObject({
      key: 'other',
      name: '기타',
      color: OTHER_COLOR,
      totalCount: 9 + 10,
      averageScore: null,
    })
    expect(keyOf.get(9)).toBe('other')
    expect(keyOf.get(10)).toBe('other')
    expect(keyOf.get(8)).toBe('e8')
  })

  it('운동이 없으면 슬롯도 없다', () => {
    expect(buildExerciseSlots([]).slots).toEqual([])
  })
})

describe('buildExerciseRows', () => {
  const series: ExercisePoint[] = [
    { periodStart: '2026-10-20', counts: { 1: 2, 2: 0 } },
    { periodStart: '2026-10-21', counts: { 1: 0, 2: 3 } },
  ]

  it('구간마다 슬롯별 횟수로 펼친다', () => {
    const { slots, keyOf } = buildExerciseSlots([exercise(1), exercise(2)])

    expect(buildExerciseRows(series, slots, keyOf)).toEqual([
      { periodStart: '2026-10-20', e1: 2, e2: 0 },
      { periodStart: '2026-10-21', e1: 0, e2: 3 },
    ])
  })

  it('기타로 묶인 운동의 횟수는 더해서 담는다', () => {
    const exercises = Array.from({ length: 10 }, (_, i) => exercise(i + 1))
    const { slots, keyOf } = buildExerciseSlots(exercises)
    const rows = buildExerciseRows(
      [{ periodStart: '2026-10-20', counts: { 9: 2, 10: 3, 1: 1 } }],
      slots,
      keyOf,
    )

    expect(rows[0].other).toBe(5)
    expect(rows[0].e1).toBe(1)
  })
})
