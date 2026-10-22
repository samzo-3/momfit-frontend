import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  getMember,
  listMembers,
  restoreMember,
  withdrawMember,
  type MemberDetail,
  type MemberListQuery,
} from '../api/members-api'

export function useMemberList(query: MemberListQuery) {
  return useQuery({
    queryKey: ['admin', 'members', query],
    queryFn: () => listMembers(query),
    placeholderData: keepPreviousData,
  })
}

// 상세를 불러올 때마다 서버에 조회 이력이 남는다. 창을 다시 보거나 화면을 오가는 것만으로
// 이력이 쌓이지 않도록 한 번 받은 값은 다시 받지 않는다. (조치 후에는 응답으로 직접 갱신한다)
export function useMember(id: number) {
  return useQuery({
    queryKey: ['admin', 'member', id],
    queryFn: () => getMember(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

function useMemberAction(action: (id: number) => Promise<MemberDetail>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: (detail) => {
      queryClient.setQueryData(['admin', 'member', detail.id], detail)
      // 목록의 상태와 요약 카드의 숫자가 달라졌으므로 다음에 열 때 다시 받는다.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'members'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] })
    },
  })
}

export const useWithdrawMember = () => useMemberAction(withdrawMember)
export const useRestoreMember = () => useMemberAction(restoreMember)
