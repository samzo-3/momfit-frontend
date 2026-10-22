import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getAdminSummary,
  getExerciseStats,
  getUserStats,
  getVisitStats,
  type StatsQuery,
} from '../api/admin-api'

// 필터를 바꿔 다시 불러오는 동안에는 이전 차트를 그대로 두고 흐리게만 보여준다. (화면이 깜빡이지 않게)
export function useAdminSummary() {
  return useQuery({
    queryKey: ['admin', 'summary'],
    queryFn: getAdminSummary,
  })
}

export function useExerciseStats(query: StatsQuery) {
  return useQuery({
    queryKey: ['admin', 'exercises', query],
    queryFn: () => getExerciseStats(query),
    placeholderData: keepPreviousData,
  })
}

export function useUserStats(query: StatsQuery) {
  return useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () => getUserStats(query),
    placeholderData: keepPreviousData,
  })
}

export function useVisitStats(query: StatsQuery) {
  return useQuery({
    queryKey: ['admin', 'visits', query],
    queryFn: () => getVisitStats(query),
    placeholderData: keepPreviousData,
  })
}
