import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
  type MockRequest,
} from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

const fetchMock = vi.fn<typeof fetch>()
const RECORDS = 'GET /api/exercise-records'
const REPORT = 'POST /api/agent/daily-report'

function recordItem(date: string, isCompleted = true) {
  return {
    id: 1,
    exercise_id: 1,
    status: isCompleted ? 'completed' : 'in_progress',
    is_completed: isCompleted,
    date,
    started_at: `${date}T01:00:00`,
    ended_at: null,
  }
}

// 선택한 날짜의 리포트. 화면에서 어느 날짜의 리포트인지 알아볼 수 있게 한마디에 날짜를 넣는다.
function reportFor({ body }: MockRequest) {
  const date = String(body?.date)
  return jsonResponse(200, {
    date,
    stats: {
      exercise_count: 0,
      record_count: 0,
      completed_count: 0,
      incomplete_count: 0,
      total_minutes: 0,
      exercises: [],
      step_attempt_count: 0,
      steps: [],
      pregnancy_week: 28,
    },
    safety_notice: '안전 안내',
    summary: `${date} 한마디`,
    next_focus: null,
    prompt_version: null,
    provider: null,
    model: null,
    latency_ms: null,
  })
}

// 기록 화면은 선택한 날짜의 리포트도 부르므로, 리포트 응답을 기본으로 함께 등록한다.
function mockRoutes(handlers: Parameters<typeof mockApi>[1]) {
  mockApi(fetchMock, { [REPORT]: reportFor, ...handlers })
}

function reportDates() {
  return requestsTo(fetchMock, REPORT).map(
    ([, init]) => JSON.parse(String(init?.body)).date,
  )
}

// 2026-10-21은 수요일이다.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  resetAuthStore()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  mockRoutes({ [RECORDS]: () => jsonResponse(200, { items: [] }) })
  signIn()
})

afterEach(() => {
  vi.useRealTimers()
})

const day = (name: RegExp | string) => screen.getByRole('button', { name })

describe('RecordsPage', () => {
  it('제목과 이번 달 캘린더를 보여준다', async () => {
    renderApp('/records')

    expect(
      screen.getByRole('heading', { level: 1, name: '나의 운동 기록' }),
    ).toBeInTheDocument()
    expect(screen.getByText('오늘도 한 걸음')).toBeInTheDocument()
    const calendar = screen.getByRole('region', { name: '운동 캘린더' })
    expect(calendar).toHaveTextContent('2026년 10월')
    // 1~31일 버튼
    expect(
      within(calendar).getAllByRole('button', { name: /^10월 \d+일/ }),
    ).toHaveLength(31)
    // 2026-10-01은 목요일
    expect(day(/^10월 1일 목요일/)).toBeInTheDocument()
    await screen.findByRole('group', { name: '2026년 10월' })
  })

  it('토요일과 일요일은 요일과 날짜를 같은 색으로 표시한다', () => {
    renderApp('/records')

    // 요일 줄
    for (const label of ['토', '일']) {
      expect(screen.getByText(label)).toHaveClass('text-danger')
    }
    for (const label of ['월', '화', '수', '목', '금']) {
      expect(screen.getByText(label)).not.toHaveClass('text-danger')
    }
    // 2026-10-03은 토요일, 10-04는 일요일, 10-05는 월요일
    expect(day(/^10월 3일 토요일/)).toHaveClass('text-danger')
    expect(day(/^10월 4일 일요일/)).toHaveClass('text-danger')
    expect(day(/^10월 5일 월요일/)).not.toHaveClass('text-danger')
  })

  it('이번 달 전체 범위로 기록을 조회한다', async () => {
    renderApp('/records')

    await screen.findByRole('button', { name: /^10월 19일/ })
    const [url] = requestsTo(fetchMock, RECORDS)[0]
    expect(String(url)).toBe(
      '/api/exercise-records?from=2026-10-01&to=2026-10-31',
    )
  })

  it('오늘이 기본으로 선택되고 오늘 표시가 붙는다', () => {
    renderApp('/records')

    expect(day(/^10월 21일 수요일 \(오늘\)/)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(day(/^10월 21일/)).toHaveAttribute('aria-current', 'date')
    expect(day(/^10월 20일/)).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByRole('region', { name: '선택한 날짜의 기록' }),
    ).toHaveTextContent('2026년 10월 21일 (수)')
  })

  it('운동을 마친 날은 기록 있음으로 표시한다', async () => {
    mockRoutes({
      [RECORDS]: () =>
        jsonResponse(200, {
          items: [
            recordItem('2026-10-05'),
            recordItem('2026-10-19'),
            recordItem('2026-10-19'),
            // 끝내지 않은 기록은 표시하지 않는다.
            recordItem('2026-10-22', false),
          ],
        }),
    })
    renderApp('/records')

    expect(
      await screen.findByRole('button', {
        name: '10월 5일 월요일, 운동 기록 있음',
      }),
    ).toBeInTheDocument()
    expect(day('10월 19일 월요일, 운동 기록 있음')).toBeInTheDocument()
    expect(day('10월 22일 목요일')).toBeInTheDocument()
    expect(day('10월 6일 화요일')).toBeInTheDocument()
  })

  it('날짜를 누르면 오른쪽 카드가 그 날짜로 바뀌고 기록 여부를 알려준다', async () => {
    mockRoutes({
      [RECORDS]: () => jsonResponse(200, { items: [recordItem('2026-10-19')] }),
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')

    await user.click(await screen.findByRole('button', { name: /^10월 19일/ }))

    const panel = screen.getByRole('region', { name: '선택한 날짜의 기록' })
    expect(panel).toHaveTextContent('10월 19일 · 운동 기록')
    expect(panel).toHaveTextContent('2026년 10월 19일 (월)')
    expect(panel).toHaveTextContent('기록 완료')
    expect(day(/^10월 19일/)).toHaveAttribute('aria-pressed', 'true')
    expect(day(/^10월 21일/)).toHaveAttribute('aria-pressed', 'false')

    await user.click(day(/^10월 20일/))
    expect(panel).toHaveTextContent('기록 없음')
  })

  it('선택한 날짜의 리포트를 카드 안에 보여준다', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')

    const slot = screen.getByTestId('records-report-slot')
    expect(
      await within(slot).findByText('2026-10-21 한마디'),
    ).toBeInTheDocument()

    await user.click(day(/^10월 19일/))

    expect(
      await within(slot).findByText('2026-10-19 한마디'),
    ).toBeInTheDocument()
    expect(reportDates()).toEqual(['2026-10-21', '2026-10-19'])
  })

  it('지난 날짜는 다시 골라도 다시 부르지 않고, 오늘은 다시 부른다', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')
    await screen.findByText('2026-10-21 한마디')

    await user.click(day(/^10월 19일/))
    await screen.findByText('2026-10-19 한마디')
    await user.click(day(/^10월 21일/))
    await screen.findByText('2026-10-21 한마디')
    await user.click(day(/^10월 19일/))
    await screen.findByText('2026-10-19 한마디')

    // 지난 날짜는 서버도 다시 만들지 않는다. 오늘은 그 사이 기록이 생겼을 수 있다.
    const dates = reportDates()
    expect(dates.filter((date) => date === '2026-10-19')).toHaveLength(1)
    expect(dates.filter((date) => date === '2026-10-21')).toHaveLength(2)
  })

  it('아직 오지 않은 날을 고르면 리포트를 부르지 않는다', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')
    await screen.findByText('2026-10-21 한마디')

    await user.click(day(/^10월 22일/))

    expect(
      within(screen.getByTestId('records-report-slot')).getByText(
        '아직 오지 않은 날이에요.',
      ),
    ).toBeInTheDocument()
    expect(reportDates()).toEqual(['2026-10-21'])
  })

  it('이전 달로 가면 그 달 범위로 다시 조회하고 선택을 비운다', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')

    await user.click(screen.getByRole('button', { name: '이전 달' }))

    expect(
      screen.getByRole('region', { name: '운동 캘린더' }),
    ).toHaveTextContent('2026년 9월')
    // 9월은 30일까지
    expect(
      within(screen.getByRole('region', { name: '운동 캘린더' })).getAllByRole(
        'button',
        { name: /^9월 \d+일/ },
      ),
    ).toHaveLength(30)
    expect(
      screen.getByRole('region', { name: '선택한 날짜의 기록' }),
    ).toHaveTextContent('캘린더에서 날짜를 골라 주세요.')
    const urls = requestsTo(fetchMock, RECORDS).map(([url]) => String(url))
    expect(urls).toContain(
      '/api/exercise-records?from=2026-09-01&to=2026-09-30',
    )
  })

  it('이번 달에서는 다음 달로 갈 수 없고, 돌아오면 오늘이 다시 선택된다', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')

    expect(screen.getByRole('button', { name: '다음 달' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '이전 달' }))
    await user.click(screen.getByRole('button', { name: '다음 달' }))

    expect(
      screen.getByRole('region', { name: '운동 캘린더' }),
    ).toHaveTextContent('2026년 10월')
    expect(day(/^10월 21일/)).toHaveAttribute('aria-pressed', 'true')
  })

  it('연도를 넘어 이전 달로 갈 수 있다', async () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12))
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')

    await user.click(screen.getByRole('button', { name: '이전 달' }))

    expect(
      screen.getByRole('region', { name: '운동 캘린더' }),
    ).toHaveTextContent('2025년 12월')
  })

  it('기록을 불러오지 못하면 안내하고 다시 시도할 수 있다', async () => {
    mockRoutes({
      [RECORDS]: () => errorResponse(500, 'INTERNAL_ERROR'),
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp('/records')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '운동 기록을 불러오지 못했어요.',
    )

    mockRoutes({
      [RECORDS]: () => jsonResponse(200, { items: [recordItem('2026-10-19')] }),
    })
    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(
      await screen.findByRole('button', {
        name: '10월 19일 월요일, 운동 기록 있음',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
