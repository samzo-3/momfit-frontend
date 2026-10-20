import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  signIn,
  userBody,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'
import { dueDateRange } from '../validation'

const fetchMock = vi.fn<typeof fetch>()
const ONBOARDING = 'POST /api/users/me/onboarding'
const DUE_DATE = dueDateRange().max

const completedBody = {
  ...userBody,
  provider: 'kakao',
  login_id: null,
  email: null,
  nickname: '카카오맘',
  due_date: DUE_DATE,
  exercise_level: 'medium',
  onboarding_completed: true,
}

const submit = () => screen.getByRole('button', { name: '시작하기' })

async function fillAll(
  user: ReturnType<typeof userEvent.setup>,
  options: { consents?: boolean } = {},
) {
  await user.type(screen.getByLabelText('출산 예정일'), DUE_DATE)
  await user.click(screen.getByRole('radio', { name: '중' }))
  if (options.consents ?? true) {
    await user.click(screen.getByRole('checkbox', { name: /이용약관/ }))
    await user.click(screen.getByRole('checkbox', { name: /건강정보/ }))
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
  signIn({
    provider: 'kakao',
    loginId: null,
    email: null,
    nickname: '카카오맘',
    dueDate: null,
    pregnancyWeek: null,
    exerciseLevel: null,
    onboardingCompleted: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('온보딩 화면', () => {
  it('카카오에서 받은 닉네임이 채워져 있고 나머지는 비어 있다', () => {
    renderApp('/onboarding')

    expect(screen.getByLabelText('닉네임')).toHaveValue('카카오맘')
    expect(screen.getByLabelText('출산 예정일')).toHaveValue('')
    expect(
      screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked),
    ).toBe(false)
    expect(screen.getByRole('checkbox', { name: /이용약관/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /건강정보/ })).not.toBeChecked()
  })

  it('입력 폼 안에서도 의학적 면책 문구를 보여준다', () => {
    renderApp('/onboarding')

    // 공통 푸터에도 같은 문구가 있으므로 본문(main) 안에서 확인한다.
    expect(
      within(screen.getByRole('main')).getByText(
        /의학적 진단이나 치료를 대신하지 않습니다/,
      ),
    ).toBeInTheDocument()
  })

  it('모두 입력해 제출하면 snake_case로 보내고 /home으로 이동한다', async () => {
    mockApi(fetchMock, { [ONBOARDING]: () => jsonResponse(200, completedBody) })
    const router = renderApp('/onboarding')
    const user = userEvent.setup()

    await fillAll(user)
    await user.click(submit())

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
    expect(
      JSON.parse(String(requestsTo(fetchMock, ONBOARDING)[0][1]?.body)),
    ).toEqual({
      nickname: '카카오맘',
      due_date: DUE_DATE,
      exercise_level: 'medium',
      consents: { terms: true, health_data: true },
    })
    expect(useAuthStore.getState().user?.onboardingCompleted).toBe(true)
  })

  it('닉네임을 바꾸면 앞뒤 공백을 지우고 보낸다', async () => {
    mockApi(fetchMock, { [ONBOARDING]: () => jsonResponse(200, completedBody) })
    renderApp('/onboarding')
    const user = userEvent.setup()
    const field = screen.getByLabelText('닉네임')

    await user.clear(field)
    await user.type(field, '  새닉네임  ')
    await fillAll(user)
    await user.click(submit())

    await waitFor(() =>
      expect(requestsTo(fetchMock, ONBOARDING)).toHaveLength(1),
    )
    expect(
      JSON.parse(String(requestsTo(fetchMock, ONBOARDING)[0][1]?.body))
        .nickname,
    ).toBe('새닉네임')
  })

  it('필수 동의를 하지 않으면 요청을 보내지 않는다', async () => {
    renderApp('/onboarding')
    const user = userEvent.setup()

    await fillAll(user, { consents: false })
    await user.click(submit())

    expect(
      screen.getByText('필수 항목에 모두 동의해 주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ONBOARDING)).toHaveLength(0)
  })

  it('동의 항목 하나만 체크해도 요청을 보내지 않는다', async () => {
    renderApp('/onboarding')
    const user = userEvent.setup()

    await fillAll(user, { consents: false })
    await user.click(screen.getByRole('checkbox', { name: /이용약관/ }))
    await user.click(submit())

    expect(
      screen.getByText('필수 항목에 모두 동의해 주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ONBOARDING)).toHaveLength(0)
  })

  it('빈 폼을 제출하면 항목별 안내를 보여주고 요청을 보내지 않는다', async () => {
    renderApp('/onboarding')
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('닉네임'))
    await user.click(submit())

    expect(
      screen.getByText('닉네임은 1~20자로 입력해 주세요.'),
    ).toBeInTheDocument()
    expect(screen.getByText('출산 예정일을 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('운동 경험을 선택해 주세요.')).toBeInTheDocument()
    expect(
      screen.getByText('필수 항목에 모두 동의해 주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ONBOARDING)).toHaveLength(0)
  })

  it('범위를 벗어난 출산 예정일은 요청을 보내지 않는다', async () => {
    renderApp('/onboarding')
    const user = userEvent.setup()

    await fillAll(user)
    await user.clear(screen.getByLabelText('출산 예정일'))
    await user.type(screen.getByLabelText('출산 예정일'), '2020-01-01')
    await user.click(submit())

    expect(
      screen.getByText('출산 예정일은 오늘부터 280일 이내여야 합니다.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, ONBOARDING)).toHaveLength(0)
  })

  it('입력을 고치면 해당 항목의 안내가 사라진다', async () => {
    renderApp('/onboarding')
    const user = userEvent.setup()
    await user.click(submit())
    expect(screen.getByText('운동 경험을 선택해 주세요.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '하' }))

    expect(
      screen.queryByText('운동 경험을 선택해 주세요.'),
    ).not.toBeInTheDocument()
  })

  it('서버의 필드별 오류를 해당 항목에 보여주고 이동하지 않는다', async () => {
    mockApi(fetchMock, {
      [ONBOARDING]: () =>
        jsonResponse(422, {
          error: {
            code: 'VALIDATION_ERROR',
            message: '요청 값이 올바르지 않습니다.',
            fields: { 'consents.health_data': '서버가 거절한 동의입니다.' },
          },
        }),
    })
    const router = renderApp('/onboarding')
    const user = userEvent.setup()
    await fillAll(user)

    await user.click(submit())

    expect(
      await screen.findByText('서버가 거절한 동의입니다.'),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
    expect(useAuthStore.getState().user?.onboardingCompleted).toBe(false)
  })

  it('저장에 실패하면 안내를 보여주고 입력은 그대로 둔다', async () => {
    mockApi(fetchMock, { [ONBOARDING]: () => errorResponse(500, 'INTERNAL') })
    renderApp('/onboarding')
    const user = userEvent.setup()
    await fillAll(user)

    await user.click(submit())

    expect(await screen.findByText('INTERNAL 메시지')).toBeInTheDocument()
    expect(screen.getByLabelText('출산 예정일')).toHaveValue(DUE_DATE)
    expect(screen.getByRole('radio', { name: '중' })).toBeChecked()
  })

  it('이미 온보딩을 마쳤다면 최신 정보를 불러와 홈으로 보낸다', async () => {
    mockApi(fetchMock, {
      [ONBOARDING]: () => errorResponse(409, 'ONBOARDING_ALREADY_COMPLETED'),
      'GET /api/users/me': () => jsonResponse(200, completedBody),
    })
    const router = renderApp('/onboarding')
    const user = userEvent.setup()
    await fillAll(user)

    await user.click(submit())

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
    expect(
      screen.queryByText('ONBOARDING_ALREADY_COMPLETED 메시지'),
    ).not.toBeInTheDocument()
  })

  it('저장하는 동안에는 버튼을 잠근다', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi(fetchMock, {
      [ONBOARDING]: () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    })
    renderApp('/onboarding')
    const user = userEvent.setup()
    await fillAll(user)

    await user.click(submit())

    expect(
      await screen.findByRole('button', { name: '저장 중...' }),
    ).toBeDisabled()
    finish(jsonResponse(200, completedBody))
    await waitFor(() =>
      expect(useAuthStore.getState().user?.onboardingCompleted).toBe(true),
    )
  })
})
