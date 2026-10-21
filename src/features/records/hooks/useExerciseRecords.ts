import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getExerciseRecords } from '../api/records-api'

export function useExerciseRecords(from: string, to: string) {
  return useQuery({
    queryKey: ['exercise-records', from, to],
    queryFn: () => getExerciseRecords(from, to),
  })
}

// 운동을 마친 날짜 집합. 아직 불러오는 중이거나 실패했으면 null이라, 빈 상태와 구분할 수 있다.
export function useCompletedDates(from: string, to: string) {
  const query = useExerciseRecords(from, to)
  const dates = useMemo(
    () =>
      query.data
        ? new Set(query.data.filter((r) => r.isCompleted).map((r) => r.date))
        : null,
    [query.data],
  )
  return { ...query, dates }
}
