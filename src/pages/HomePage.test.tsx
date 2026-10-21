import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
} from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

const fetchMock = vi.fn<typeof fetch>()
const RECORDS = 'GET /api/exercise-records'

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

beforeEach(() => {
  resetAuthStore()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // 이번 주 기록은 기본으로 비어 있다.
  mockApi(fetchMock, { [RECORDS]: () => jsonResponse(200, { items: [] }) })
})

// 지금 보이는(접근 가능한) 슬라이드
function visibleSlide() {
  return screen.getByRole('group', { name: /\d \/ 3/ })
}

describe('HomePage 히어로', () => {
  it('첫 슬라이드는 운동을 고르게 안내하고 운동 고르기로 이어진다', () => {
    signIn()
    renderApp('/home')

    const slide = visibleSlide()
    expect(within(slide).getByRole('heading', { level: 2 })).toHaveTextContent(
      '오늘은 어떻게 움직이고 싶나요?',
    )
    expect(
      within(slide).getByRole('link', { name: /나에게 맞는 운동 살펴보기/ }),
    ).toHaveAttribute('href', '/workouts')
    expect(
      within(slide).getByRole('img', { name: /매트 위에서 몸을 풀고/ }),
    ).toBeInTheDocument()
  })

  it('닉네임과 임신 주차를 슬라이드에서 인사한다', async () => {
    signIn({ nickname: '테스트맘', pregnancyWeek: 28 })
    renderApp('/home')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '다음 슬라이드' }))

    expect(
      within(visibleSlide()).getByRole('heading', { level: 2 }),
    ).toHaveTextContent('테스트맘님, 임신 28주차예요')
  })

  it('임신 주차를 모르면 이름만으로 인사한다', async () => {
    signIn({ nickname: '테스트맘', pregnancyWeek: null })
    renderApp('/home')

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '다음 슬라이드' }))

    const heading = within(visibleSlide()).getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('테스트맘님, 오늘도 편안하게 시작해요')
    expect(heading).not.toHaveTextContent('주차')
  })

  it('슬라이드마다 제목 위에 별 아이콘과 다른 라벨이 붙는다', async () => {
    signIn()
    renderApp('/home')
    const user = userEvent.setup()

    for (const tag of ['작은 움직임부터', '오늘의 컨디션', '나를 위한 시간']) {
      const label = within(visibleSlide()).getByText(tag)
      expect(label.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    }
  })

  it('모든 슬라이드의 버튼이 운동 고르기로 이어진다', async () => {
    signIn()
    renderApp('/home')
    const user = userEvent.setup()

    for (let i = 0; i < 3; i += 1) {
      expect(
        within(visibleSlide()).getByRole('link', { name: /운동/ }),
      ).toHaveAttribute('href', '/workouts')
      await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    }
  })

  it('화면 제목(h1)은 하나이고 스크린리더에만 읽힌다', () => {
    signIn()
    renderApp('/home')

    const title = screen.getByRole('heading', { level: 1 })
    expect(title).toHaveTextContent('홈')
    expect(title).toHaveClass('sr-only')
  })
})

describe('HomePage 요약', () => {
  // 2026-10-20은 화요일이다.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const journey = () => screen.getByRole('region', { name: '출산까지의 여정' })
  const weekly = () => screen.getByRole('region', { name: '이번 주 운동' })

  it('임신 주차와 구간, 출산 예정일과 남은 날을 보여준다', () => {
    signIn({ pregnancyWeek: 28, dueDate: '2027-01-11' })
    renderApp('/home')

    const card = journey()
    expect(card).toHaveTextContent('임신 28주차')
    expect(within(card).getAllByText('후기')[0]).toBeInTheDocument()
    expect(card).toHaveTextContent('D-83')
    expect(card).toHaveTextContent('2027년 1월 11일')
    // 운동 경험은 보여주지 않는다.
    expect(screen.queryByText(/운동 경험/)).not.toBeInTheDocument()
  })

  it('진행 막대가 40주 중 현재 주차를 알리고 지난 구간은 가득 채운다', () => {
    signIn({ pregnancyWeek: 28, dueDate: '2027-01-11' })
    renderApp('/home')

    const bar = within(journey()).getByRole('progressbar', {
      name: '임신 진행',
    })
    expect(bar).toHaveAttribute('aria-valuenow', '28')
    expect(bar).toHaveAttribute('aria-valuemax', '40')
    expect(bar).toHaveAttribute('aria-valuetext', '40주 중 28주차')
    expect(screen.getByTestId('stage-fill-early')).toHaveStyle({
      width: '100%',
    })
    expect(screen.getByTestId('stage-fill-mid')).toHaveStyle({ width: '100%' })
    // 후기 13주 중 첫 주
    expect(
      parseFloat(screen.getByTestId('stage-fill-late').style.width),
    ).toBeCloseTo(100 / 13)
  })

  it('임신 주차를 모르면 대시로 보여주고 막대는 비어 있다', () => {
    signIn({ pregnancyWeek: null, dueDate: null })
    renderApp('/home')

    const card = journey()
    expect(card).not.toHaveTextContent('주차')
    expect(card).toHaveTextContent('-')
    expect(screen.getByTestId('stage-fill-early')).toHaveStyle({ width: '0%' })
    expect(
      within(card).getByRole('progressbar', { name: '임신 진행' }),
    ).toHaveAttribute('aria-valuetext', '주차를 알 수 없음')
  })

  it('이번 주 운동은 월~일 요일 표시를 보여주고 오늘 요일을 표시한다', async () => {
    signIn()
    renderApp('/home')

    const card = weekly()
    // 목표 횟수("0 / 3회") 같은 숫자는 보여주지 않는다.
    expect(card).not.toHaveTextContent('/ 3')
    const days = within(card).getAllByRole('listitem')
    expect(days.map((day) => day.textContent)).toEqual([
      '월',
      '화',
      '수',
      '목',
      '금',
      '토',
      '일',
    ])
    expect(
      within(card).getByRole('listitem', { name: '화요일 (오늘)' }),
    ).toHaveAttribute('aria-current', 'date')
    expect(
      within(card).getByRole('listitem', { name: '월요일' }),
    ).not.toHaveAttribute('aria-current')
    await within(card).findByText('아직 기록이 없어요')
  })

  it('이번 주(월~일) 범위로 기록을 조회한다', async () => {
    signIn()
    renderApp('/home')

    await within(weekly()).findByText('아직 기록이 없어요')
    const [url] = requestsTo(fetchMock, RECORDS)[0]
    expect(String(url)).toBe(
      '/api/exercise-records?from=2026-10-19&to=2026-10-25',
    )
  })

  it('운동을 마친 요일은 완료로 표시하고 일수를 알려준다', async () => {
    mockApi(fetchMock, {
      [RECORDS]: () =>
        jsonResponse(200, {
          items: [
            recordItem('2026-10-19'),
            recordItem('2026-10-19'),
            recordItem('2026-10-20'),
            // 끝내지 않은 기록은 운동한 날로 치지 않는다.
            recordItem('2026-10-21', false),
          ],
        }),
    })
    signIn()
    renderApp('/home')

    const card = weekly()
    expect(
      await within(card).findByRole('listitem', {
        name: '월요일, 운동 완료',
      }),
    ).toBeInTheDocument()
    expect(
      within(card).getByRole('listitem', { name: '화요일 (오늘), 운동 완료' }),
    ).toBeInTheDocument()
    expect(
      within(card).getByRole('listitem', { name: '수요일' }),
    ).toBeInTheDocument()
    expect(card).toHaveTextContent('이번 주 2일 운동했어요')
  })

  it('불러오는 동안에는 기록이 없다고 단정하지 않는다', () => {
    mockApi(fetchMock, { [RECORDS]: () => new Promise<Response>(() => {}) })
    signIn()
    renderApp('/home')

    expect(weekly()).not.toHaveTextContent('아직 기록이 없어요')
    expect(weekly()).not.toHaveTextContent('운동했어요')
  })

  it('운동 기록 보기 링크는 캘린더 화면으로 이어진다', async () => {
    signIn()
    renderApp('/home')

    expect(
      await within(weekly()).findByRole('link', { name: '운동 기록 보기' }),
    ).toHaveAttribute('href', '/records')
  })
})
