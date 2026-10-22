import { apiRequest } from '../../../shared/api'

export type MemberStatus = 'active' | 'withdrawn'
export type MemberAction = 'view_member' | 'withdraw_member' | 'restore_member'

export interface MemberListItem {
  id: number
  nickname: string
  email: string | null
  loginId: string | null
  provider: 'local' | 'kakao'
  status: MemberStatus
  createdAt: string
  withdrawnAt: string | null
  purgeAt: string | null
  lastVisitDate: string | null
  completedExercises: number
}

export interface MemberRecord {
  startedAt: string
  exerciseName: string
  isCompleted: boolean
  totalScore: number | null
}

export interface MemberHistory {
  action: MemberAction
  adminNickname: string
  createdAt: string
}

export interface MemberDetail extends MemberListItem {
  onboardingCompleted: boolean
  exerciseLevel: 'low' | 'medium' | 'high' | null
  dueDate: string | null
  visitDaysLast30: number
  recentRecords: MemberRecord[]
  history: MemberHistory[]
}

export interface MemberListPage {
  items: MemberListItem[]
  total: number
  page: number
  size: number
}

export interface MemberListQuery {
  q: string
  status: MemberStatus | ''
  page: number
}

export const MEMBER_PAGE_SIZE = 20

interface ItemResponse {
  id: number
  nickname: string
  email: string | null
  login_id: string | null
  provider: 'local' | 'kakao'
  status: MemberStatus
  created_at: string
  withdrawn_at: string | null
  purge_at: string | null
  last_visit_date: string | null
  completed_exercises: number
}

interface DetailResponse extends ItemResponse {
  onboarding_completed: boolean
  exercise_level: 'low' | 'medium' | 'high' | null
  due_date: string | null
  visit_days_last_30: number
  recent_records: {
    started_at: string
    exercise_name: string
    is_completed: boolean
    total_score: number | null
  }[]
  history: {
    action: MemberAction
    admin_nickname: string
    created_at: string
  }[]
}

function toItem(r: ItemResponse): MemberListItem {
  return {
    id: r.id,
    nickname: r.nickname,
    email: r.email,
    loginId: r.login_id,
    provider: r.provider,
    status: r.status,
    createdAt: r.created_at,
    withdrawnAt: r.withdrawn_at,
    purgeAt: r.purge_at,
    lastVisitDate: r.last_visit_date,
    completedExercises: r.completed_exercises,
  }
}

function toDetail(r: DetailResponse): MemberDetail {
  return {
    ...toItem(r),
    onboardingCompleted: r.onboarding_completed,
    exerciseLevel: r.exercise_level,
    dueDate: r.due_date,
    visitDaysLast30: r.visit_days_last_30,
    recentRecords: r.recent_records.map((x) => ({
      startedAt: x.started_at,
      exerciseName: x.exercise_name,
      isCompleted: x.is_completed,
      totalScore: x.total_score,
    })),
    history: r.history.map((h) => ({
      action: h.action,
      adminNickname: h.admin_nickname,
      createdAt: h.created_at,
    })),
  }
}

export async function listMembers(q: MemberListQuery): Promise<MemberListPage> {
  const r = await apiRequest<{
    items: ItemResponse[]
    total: number
    page: number
    size: number
  }>('/admin/members', {
    query: {
      q: q.q || undefined,
      status: q.status || undefined,
      page: q.page,
      size: MEMBER_PAGE_SIZE,
    },
  })
  return { ...r, items: r.items.map(toItem) }
}

// 상세를 열면 서버가 "조회했다"는 이력을 남긴다.
export async function getMember(id: number): Promise<MemberDetail> {
  return toDetail(await apiRequest<DetailResponse>(`/admin/members/${id}`))
}

export async function withdrawMember(id: number): Promise<MemberDetail> {
  return toDetail(
    await apiRequest<DetailResponse>(`/admin/members/${id}/withdraw`, {
      method: 'POST',
    }),
  )
}

export async function restoreMember(id: number): Promise<MemberDetail> {
  return toDetail(
    await apiRequest<DetailResponse>(`/admin/members/${id}/restore`, {
      method: 'POST',
    }),
  )
}
