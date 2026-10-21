import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
} from '../../../test/auth-test-utils'
import DailyReport from './DailyReport'

const fetchMock = vi.fn<typeof fetch>()
const REPORT = 'POST /api/agent/daily-report'
const SAFETY =
  '운동 중 어지러움, 복통, 출혈 같은 증상이 있었다면 운동을 멈추고 담당 의료진과 상의해 주세요.'

// 10월 19일 서버 응답(fixture evaluated와 같은 숫자)
function reportBody(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-10-19',
    stats: {
      exercise_count: 1,
      record_count: 3,
      completed_count: 3,
      incomplete_count: 0,
      total_minutes: 36,
      exercises: [
        {
          exercise_id: 1,
          exercise_name: '사이드 스텝 & 열린 창문',
          record_count: 3,
          best_score: 80,
          first_score: 60,
          last_score: 80,
          sets: [
            { completed_sets: 6, target_sets: 10 },
            { completed_sets: 7, target_sets: 10 },
            { completed_sets: 8, target_sets: 10 },
          ],
        },
      ],
      step_attempt_count: 7,
      steps: [
        {
          exercise_step_id: 12,
          step_name: '오른쪽 스텝',
          attempt_count: 5,
          best_score: 86,
          last_score: 86,
          evaluation_counts: {},
          feedback_code_counts: {},
          pass_count: 2,
        },
        {
          exercise_step_id: 13,
          step_name: '왼쪽 스텝',
          attempt_count: 2,
          best_score: 71.5,
          last_score: 71.5,
          evaluation_counts: {},
          feedback_code_counts: {},
          pass_count: 1,
        },
      ],
      pregnancy_week: 30,
    },
    safety_notice: SAFETY,
    summary: '오늘 총 36분 동안 운동을 잘 마치셨어요.',
    next_focus: {
      step_id: 12,
      reason: '팔을 어깨 높이까지 벌리는 데 신경 써 봐요.',
    },
    prompt_version: 'daily-v3',
    provider: 'mock',
    model: 'mock-1',
    latency_ms: 1,
    ...overrides,
  }
}

const EMPTY_STATS = {
  exercise_count: 0,
  record_count: 0,
  completed_count: 0,
  incomplete_count: 0,
  total_minutes: 0,
  exercises: [],
  step_attempt_count: 0,
  steps: [],
  pregnancy_week: 30,
}

// 기본 설정(실패 시 3번 재시도)의 QueryClient로 렌더링해서, 훅이 재시도를 끄는지도 함께 본다.
function renderReport(date: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DailyReport date={date} />
    </QueryClientProvider>,
  )
}

// 2026-10-21이 오늘이다.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DailyReport', () => {
  it('한마디, 다음 집중 스텝, 운동과 자세 배우기 숫자, 안전 안내를 보여준다', async () => {
    mockApi(fetchMock, { [REPORT]: () => jsonResponse(200, reportBody()) })
    renderReport('2026-10-19')

    expect(
      await screen.findByText('오늘 총 36분 동안 운동을 잘 마치셨어요.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('다음에 집중할 스텝 · 오른쪽 스텝'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('팔을 어깨 높이까지 벌리는 데 신경 써 봐요.'),
    ).toBeInTheDocument()

    const exercises = screen.getByRole('region', { name: '운동' })
    expect(exercises).toHaveTextContent('36분 · 3회')
    // 일반 운동 점수는 자세 점수가 아니라서 세트만 보여준다.
    expect(exercises).toHaveTextContent(
      '사이드 스텝 & 열린 창문 · 완료 세트 6/10 · 7/10 · 8/10',
    )
    expect(exercises).not.toHaveTextContent('80')

    const steps = within(screen.getByRole('region', { name: '자세 배우기' }))
    expect(steps.getByText('오른쪽 스텝').parentElement).toHaveTextContent(
      '최고 86점 · 통과 2/5',
    )
    expect(steps.getByText('왼쪽 스텝').parentElement).toHaveTextContent(
      '최고 71.5점 · 통과 1/2',
    )
    expect(screen.getByText(SAFETY)).toBeInTheDocument()

    const [[, init]] = requestsTo(fetchMock, REPORT)
    expect(JSON.parse(String(init?.body))).toEqual({ date: '2026-10-19' })
  })

  it('다음 집중 스텝이 없으면 그 칸을 두지 않는다', async () => {
    mockApi(fetchMock, {
      [REPORT]: () => jsonResponse(200, reportBody({ next_focus: null })),
    })
    renderReport('2026-10-19')

    await screen.findByText('오늘 총 36분 동안 운동을 잘 마치셨어요.')
    expect(screen.queryByText(/다음에 집중할 스텝/)).not.toBeInTheDocument()
  })

  it('목표 세트가 없는 운동은 완료 세트만, 점수가 없는 스텝은 점수 없음으로 보여준다', async () => {
    const stats = {
      ...EMPTY_STATS,
      record_count: 2,
      total_minutes: 12,
      exercises: [
        {
          exercise_id: 2,
          exercise_name: '점수 규칙이 없는 운동',
          record_count: 2,
          best_score: null,
          first_score: null,
          last_score: null,
          sets: [
            { completed_sets: 6, target_sets: null },
            { completed_sets: null, target_sets: 10 },
          ],
        },
      ],
      step_attempt_count: 2,
      steps: [
        {
          exercise_step_id: 13,
          step_name: '왼쪽 스텝',
          attempt_count: 2,
          best_score: null,
          last_score: null,
          evaluation_counts: {},
          feedback_code_counts: {},
          pass_count: 1,
        },
      ],
    }
    mockApi(fetchMock, {
      [REPORT]: () =>
        jsonResponse(200, reportBody({ stats, next_focus: null })),
    })
    renderReport('2026-10-19')

    expect(
      await screen.findByRole('region', { name: '운동' }),
    ).toHaveTextContent('완료 세트 6 · -')
    expect(screen.getByText('왼쪽 스텝').parentElement).toHaveTextContent(
      '점수 없음 · 통과 1/2',
    )
  })

  it('기록이 없는 날은 서버 문장만 보여주고 안전 안내는 두지 않는다', async () => {
    mockApi(fetchMock, {
      [REPORT]: () =>
        jsonResponse(
          200,
          reportBody({
            date: '2026-10-18',
            stats: EMPTY_STATS,
            summary: '이날은 운동 기록이 없어요.',
            next_focus: null,
          }),
        ),
    })
    renderReport('2026-10-18')

    expect(
      await screen.findByText('이날은 운동 기록이 없어요.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.queryByText(SAFETY)).not.toBeInTheDocument()
  })

  it('오늘 리포트는 만드는 동안 시간이 걸릴 수 있다고 안내한다', async () => {
    mockApi(fetchMock, { [REPORT]: () => new Promise<Response>(() => {}) })
    renderReport('2026-10-21')

    expect(await screen.findByRole('status')).toHaveTextContent(
      '오늘 리포트를 만들고 있어요. 조금 걸릴 수 있어요.',
    )
  })

  it('지난 날짜는 불러오는 중이라고만 안내한다', async () => {
    mockApi(fetchMock, { [REPORT]: () => new Promise<Response>(() => {}) })
    renderReport('2026-10-19')

    expect(await screen.findByRole('status')).toHaveTextContent(
      '리포트를 불러오고 있어요.',
    )
  })

  it('아직 오지 않은 날은 리포트를 부르지 않는다', () => {
    mockApi(fetchMock, { [REPORT]: () => jsonResponse(200, reportBody()) })
    renderReport('2026-10-22')

    expect(screen.getByText('아직 오지 않은 날이에요.')).toBeInTheDocument()
    expect(requestsTo(fetchMock, REPORT)).toHaveLength(0)
  })

  it('불러오지 못하면 자동으로 다시 부르지 않고, 다시 시도를 누르면 다시 부른다', async () => {
    mockApi(fetchMock, {
      [REPORT]: () => errorResponse(503, 'AGENT_DATA_UNAVAILABLE'),
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderReport('2026-10-19')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '리포트를 불러오지 못했어요.',
    )
    expect(requestsTo(fetchMock, REPORT)).toHaveLength(1)

    mockApi(fetchMock, { [REPORT]: () => jsonResponse(200, reportBody()) })
    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(
      await screen.findByText('오늘 총 36분 동안 운동을 잘 마치셨어요.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, REPORT)).toHaveLength(2)
  })
})
