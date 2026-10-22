import { jsonResponse, mockApi } from './auth-test-utils'

export const summaryBody = {
  total_users: 1234,
  new_users_today: 5,
  withdrawn_users: 2,
  exercises_today: 17,
  visitors_today: 9,
}

export const exercisesBody = {
  period: 'day',
  start: '2026-10-20',
  end: '2026-10-22',
  exercises: [
    {
      exercise_id: 1,
      exercise_name: '사이드 킥',
      total_count: 2,
      average_score: 80,
    },
    {
      exercise_id: 2,
      exercise_name: '스쿼트',
      total_count: 3,
      average_score: 84.3,
    },
  ],
  series: [
    {
      period_start: '2026-10-20',
      counts: [
        { exercise_id: 1, count: 2 },
        { exercise_id: 2, count: 0 },
      ],
    },
    {
      period_start: '2026-10-21',
      counts: [
        { exercise_id: 1, count: 0 },
        { exercise_id: 2, count: 0 },
      ],
    },
    {
      period_start: '2026-10-22',
      counts: [
        { exercise_id: 1, count: 0 },
        { exercise_id: 2, count: 3 },
      ],
    },
  ],
}

export const usersBody = {
  period: 'day',
  start: '2026-10-20',
  end: '2026-10-22',
  total_signups: 4,
  total_withdrawals: 1,
  series: [
    { period_start: '2026-10-20', signups: 1, withdrawals: 0 },
    { period_start: '2026-10-21', signups: 0, withdrawals: 1 },
    { period_start: '2026-10-22', signups: 3, withdrawals: 0 },
  ],
}

export const visitsBody = {
  period: 'day',
  start: '2026-10-20',
  end: '2026-10-22',
  unique_visitors: 14,
  current: { dau: 9, wau: 31, mau: 88 },
  series: [
    { period_start: '2026-10-20', visitors: 6 },
    { period_start: '2026-10-21', visitors: 0 },
    { period_start: '2026-10-22', visitors: 9 },
  ],
}

export function mockAdminApi(
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>,
) {
  mockApi(fetchMock, {
    'GET /api/admin/stats/summary': () => jsonResponse(200, summaryBody),
    'GET /api/admin/stats/exercises': () => jsonResponse(200, exercisesBody),
    'GET /api/admin/stats/users': () => jsonResponse(200, usersBody),
    'GET /api/admin/stats/visits': () => jsonResponse(200, visitsBody),
  })
}

export function memberItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nickname: '맘핏',
    email: 'mom@example.com',
    login_id: 'momfit01',
    provider: 'local',
    status: 'active',
    created_at: '2026-10-01T03:00:00Z',
    withdrawn_at: null,
    purge_at: null,
    last_visit_date: '2026-10-21',
    completed_exercises: 7,
    ...overrides,
  }
}

export function memberDetailBody(overrides: Record<string, unknown> = {}) {
  return {
    ...memberItem(),
    onboarding_completed: true,
    exercise_level: 'medium',
    due_date: '2027-01-11',
    visit_days_last_30: 12,
    recent_records: [
      {
        started_at: '2026-10-21T01:30:00Z',
        exercise_name: '사이드 킥',
        is_completed: true,
        total_score: 91.5,
      },
      {
        started_at: '2026-10-20T01:30:00Z',
        exercise_name: '스쿼트',
        is_completed: false,
        total_score: null,
      },
    ],
    history: [
      {
        action: 'view_member',
        admin_nickname: '운영자',
        created_at: '2026-10-22T05:00:00Z',
      },
    ],
    ...overrides,
  }
}

export function memberListBody(
  items: unknown[],
  extra: Record<string, unknown> = {},
) {
  return { items, total: items.length, page: 1, size: 20, ...extra }
}
