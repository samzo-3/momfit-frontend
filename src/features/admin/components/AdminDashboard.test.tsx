import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  exercisesBody,
  mockAdminApi as mockAdminApiBase,
  summaryBody,
  usersBody,
  visitsBody,
} from '../../../test/admin-test-utils'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'

const fetchMock = vi.fn<typeof fetch>()

function mockAdminApi() {
  mockAdminApiBase(fetchMock)
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  signIn({ role: 'admin', nickname: '운영자' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderDashboard() {
  const router = renderApp('/admin')
  await screen.findByRole('heading', { name: '관리자' })
  return router
}

describe('AdminDashboard', () => {
  it('오늘 현황 요약 카드에 서버 값을 보여 준다', async () => {
    mockAdminApi()
    await renderDashboard()

    const today = await screen.findByRole('region', { name: '오늘 현황' })
    await waitFor(() =>
      expect(within(today).getByText('1,234')).toBeInTheDocument(),
    )
    expect(within(today).getByText('전체 회원')).toBeInTheDocument()
    expect(within(today).getByText('5')).toBeInTheDocument()
    expect(within(today).getByText('2')).toBeInTheDocument()
    expect(within(today).getByText('17')).toBeInTheDocument()
    expect(within(today).getByText('오늘 방문')).toBeInTheDocument()
    expect(within(today).getByText('9')).toBeInTheDocument()
  })

  it('기본은 최근 30일·일별로 두 통계를 요청한다', async () => {
    mockAdminApi()
    await renderDashboard()

    await screen.findByRole('region', { name: '운동별 완료 횟수' })
    const [[exerciseUrl]] = requestsTo(
      fetchMock,
      'GET /api/admin/stats/exercises',
    )
    const params = new URL(String(exerciseUrl), 'http://x').searchParams
    expect(params.get('period')).toBe('day')
    const from = Date.parse(params.get('from')!)
    const to = Date.parse(params.get('to')!)
    expect((to - from) / 86_400_000).toBe(29)
    expect(requestsTo(fetchMock, 'GET /api/admin/stats/users')).toHaveLength(1)
  })

  it('방문자 카드에 오늘·최근 7일·최근 30일 방문자를 보여 준다', async () => {
    mockAdminApi()
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '방문자 수' })
    expect(within(card).getByText('9명')).toBeInTheDocument()
    expect(within(card).getByText('31명')).toBeInTheDocument()
    expect(within(card).getByText('88명')).toBeInTheDocument()
    expect(
      within(card).getByText('하루에 한 번이라도 방문한 회원 수 (DAU)'),
    ).toBeInTheDocument()
  })

  it('방문자 표는 구간별 방문자를 보여 준다', async () => {
    mockAdminApi()
    const user = userEvent.setup()
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '방문자 수' })
    await user.click(within(card).getByRole('button', { name: '표로 보기' }))

    const rows = within(
      within(card).getByRole('table', { name: '기간별 방문자 수' }),
    ).getAllByRole('row')
    expect(rows).toHaveLength(4)
    expect(within(rows[1]).getByText('10/20')).toBeInTheDocument()
    expect(within(rows[1]).getByText('6')).toBeInTheDocument()
    expect(within(rows[3]).getByText('9')).toBeInTheDocument()
  })

  it('묶는 단위를 바꾸면 방문자 설명도 WAU·MAU로 바뀐다', async () => {
    mockAdminApi()
    const user = userEvent.setup()
    await renderDashboard()
    await screen.findByRole('region', { name: '방문자 수' })

    await user.click(screen.getByRole('button', { name: '주별' }))
    expect(
      await screen.findByText('한 주에 한 번이라도 방문한 회원 수 (WAU)'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '월별' }))
    expect(
      await screen.findByText('한 달에 한 번이라도 방문한 회원 수 (MAU)'),
    ).toBeInTheDocument()

    const calls = requestsTo(fetchMock, 'GET /api/admin/stats/visits')
    const last = new URL(String(calls[calls.length - 1][0]), 'http://x')
    expect(last.searchParams.get('period')).toBe('month')
  })

  it('하나가 실패해도 나머지 카드는 보인다', async () => {
    mockApi(fetchMock, {
      'GET /api/admin/stats/summary': () => jsonResponse(200, summaryBody),
      'GET /api/admin/stats/exercises': () => jsonResponse(200, exercisesBody),
      'GET /api/admin/stats/users': () => jsonResponse(200, usersBody),
      'GET /api/admin/stats/visits': () => errorResponse(500, 'SERVER_ERROR'),
    })
    await renderDashboard()

    expect(
      await screen.findByText('방문자 통계를 불러오지 못했어요.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: '운동별 완료 횟수' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: '가입·탈퇴 추이' }),
    ).toBeInTheDocument()
  })

  it('운동별 카드는 운동마다 합계와 평균 점수를 범례에 적는다', async () => {
    mockAdminApi()
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '운동별 완료 횟수' })
    const legend = within(card).getByRole('list', { name: '운동별 합계' })
    const items = within(legend).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('사이드 킥')).toBeInTheDocument()
    expect(within(items[0]).getByText(/2회 · 평균 80점/)).toBeInTheDocument()
    expect(within(items[1]).getByText('스쿼트')).toBeInTheDocument()
    expect(within(items[1]).getByText(/3회 · 평균 84.3점/)).toBeInTheDocument()
  })

  it('총 운동 횟수 같은 합산 수치는 보여 주지 않고 가장 많이 한 운동을 알려 준다', async () => {
    mockAdminApi()
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '운동별 완료 횟수' })
    expect(within(card).getByText('가장 많이 한 운동')).toBeInTheDocument()
    const figure = within(card).getByText('가장 많이 한 운동').parentElement!
    expect(within(figure).getByText('스쿼트')).toBeInTheDocument()
    expect(within(card).queryByText('합계')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: '운동 종류별 횟수' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: '완료한 운동 횟수' }),
    ).not.toBeInTheDocument()
  })

  it('표로 보기를 누르면 구간별 운동별 횟수와 합계·평균 점수가 나온다', async () => {
    mockAdminApi()
    const user = userEvent.setup()
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '운동별 완료 횟수' })
    await user.click(within(card).getByRole('button', { name: '표로 보기' }))

    const table = within(card).getByRole('table', {
      name: '기간별 운동별 완료 횟수',
    })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(6) // 머리글 + 3일 + 합계 + 평균 점수
    expect(
      within(rows[0])
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['기간', '사이드 킥', '스쿼트'])
    const cells = (row: HTMLElement) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    expect(cells(rows[1])).toEqual(['10/20', '2', '0'])
    expect(cells(rows[3])).toEqual(['10/22', '0', '3'])
    expect(cells(rows[4])).toEqual(['합계', '2', '3'])
    expect(cells(rows[5])).toEqual(['평균 점수', '80점', '84.3점'])
    expect(
      within(card).getByRole('button', { name: '차트로 보기' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('운동이 8개를 넘으면 나머지는 기타로 묶어 보여 준다', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      exercise_id: i + 1,
      exercise_name: `운동${i + 1}`,
      total_count: i + 1,
      average_score: 70,
    }))
    mockApi(fetchMock, {
      'GET /api/admin/stats/summary': () => jsonResponse(200, summaryBody),
      'GET /api/admin/stats/exercises': () =>
        jsonResponse(200, {
          ...exercisesBody,
          exercises: many,
          series: [
            {
              period_start: '2026-10-20',
              counts: many.map((e) => ({
                exercise_id: e.exercise_id,
                count: e.total_count,
              })),
            },
          ],
        }),
      'GET /api/admin/stats/users': () => jsonResponse(200, usersBody),
      'GET /api/admin/stats/visits': () => jsonResponse(200, visitsBody),
    })
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '운동별 완료 횟수' })
    const items = within(
      within(card).getByRole('list', { name: '운동별 합계' }),
    ).getAllByRole('listitem')
    expect(items).toHaveLength(9) // 8개 + 기타
    expect(within(items[8]).getByText('기타')).toBeInTheDocument()
    expect(within(items[8]).getByText(/19회/)).toBeInTheDocument() // 9 + 10
  })

  it('가입·탈퇴 추이는 범례와 합계를 보여 준다', async () => {
    mockAdminApi()
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '가입·탈퇴 추이' })
    const legend = within(card).getByRole('list', { name: '범례' })
    expect(within(legend).getByText('신규 가입')).toBeInTheDocument()
    expect(within(legend).getByText('탈퇴 요청')).toBeInTheDocument()
    expect(within(card).getByText('4명')).toBeInTheDocument()
    expect(within(card).getByText('1명')).toBeInTheDocument()
  })

  it('기간과 묶는 단위를 바꾸면 모든 통계를 다시 요청한다', async () => {
    mockAdminApi()
    const user = userEvent.setup()
    await renderDashboard()
    await screen.findByRole('region', { name: '운동별 완료 횟수' })

    await user.click(screen.getByRole('button', { name: '최근 7일' }))
    await user.click(screen.getByRole('button', { name: '주별' }))

    await waitFor(() => {
      const calls = requestsTo(fetchMock, 'GET /api/admin/stats/exercises')
      const last = new URL(String(calls[calls.length - 1][0]), 'http://x')
      expect(last.searchParams.get('period')).toBe('week')
      const days =
        (Date.parse(last.searchParams.get('to')!) -
          Date.parse(last.searchParams.get('from')!)) /
        86_400_000
      expect(days).toBe(6)
    })
    const userCalls = requestsTo(fetchMock, 'GET /api/admin/stats/users')
    const lastUsers = new URL(
      String(userCalls[userCalls.length - 1][0]),
      'http://x',
    )
    expect(lastUsers.searchParams.get('period')).toBe('week')
    expect(screen.getByRole('button', { name: '최근 7일' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('기간 동안 완료한 운동이 없으면 안내 문구를 보여 준다', async () => {
    mockApi(fetchMock, {
      'GET /api/admin/stats/summary': () => jsonResponse(200, summaryBody),
      'GET /api/admin/stats/exercises': () =>
        jsonResponse(200, {
          ...exercisesBody,
          exercises: exercisesBody.exercises.map((e) => ({
            ...e,
            total_count: 0,
            average_score: null,
          })),
        }),
      'GET /api/admin/stats/users': () => jsonResponse(200, usersBody),
      'GET /api/admin/stats/visits': () => jsonResponse(200, visitsBody),
    })
    await renderDashboard()

    const card = await screen.findByRole('region', { name: '운동별 완료 횟수' })
    expect(
      within(card).getByText('이 기간에 완료한 운동이 없어요.'),
    ).toBeInTheDocument()
    expect(
      within(card).queryByText('가장 많이 한 운동'),
    ).not.toBeInTheDocument()
  })

  it('통계를 불러오지 못하면 오류 안내를 보여 준다', async () => {
    mockApi(fetchMock, {
      'GET /api/admin/stats/summary': () => errorResponse(500, 'SERVER_ERROR'),
      'GET /api/admin/stats/exercises': () =>
        errorResponse(500, 'SERVER_ERROR'),
      'GET /api/admin/stats/users': () => errorResponse(500, 'SERVER_ERROR'),
      'GET /api/admin/stats/visits': () => errorResponse(500, 'SERVER_ERROR'),
    })
    await renderDashboard()

    expect(
      await screen.findByText('요약을 불러오지 못했어요.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('운동 통계를 불러오지 못했어요.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('방문자 통계를 불러오지 못했어요.'),
    ).toBeInTheDocument()
  })
})
