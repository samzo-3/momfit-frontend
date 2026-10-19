import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
  userBody,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'

const fetchMock = vi.fn<typeof fetch>()
const tokenBody = {
  access_token: 'access-1',
  token_type: 'bearer',
  expires_in: 900,
}

async function fillAndSubmit(loginId = 'momfit01', password = 'password1') {
  const user = userEvent.setup()
  if (loginId) await user.type(screen.getByLabelText('아이디'), loginId)
  if (password) await user.type(screen.getByLabelText('비밀번호'), password)
  await user.click(screen.getByRole('button', { name: '로그인' }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
  useAuthStore.getState().clear() // 세션 복구가 끝난 비로그인 상태
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('로그인 화면', () => {
  it('로그인에 성공하면 세션을 시작하고 /home으로 이동한다', async () => {
    mockApi(fetchMock, {
      'POST /api/auth/login': () => jsonResponse(200, tokenBody),
      'GET /api/users/me': () => jsonResponse(200, userBody),
    })
    const router = renderApp('/login')

    await fillAndSubmit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().accessToken).toBe('access-1')
    expect(requestsTo(fetchMock, 'POST /api/auth/login')[0][1]?.body).toBe(
      JSON.stringify({ login_id: 'momfit01', password: 'password1' }),
    )
  })

  it('보호 경로에서 넘어왔다면 로그인 후 원래 경로로 돌아간다', async () => {
    mockApi(fetchMock, {
      'POST /api/auth/login': () => jsonResponse(200, tokenBody),
      'GET /api/users/me': () => jsonResponse(200, userBody),
    })
    const router = renderApp('/login', { from: { pathname: '/home' } })

    await fillAndSubmit()

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
  })

  it('온보딩 전 사용자는 로그인 후 /onboarding으로 이동한다', async () => {
    mockApi(fetchMock, {
      'POST /api/auth/login': () => jsonResponse(200, tokenBody),
      'GET /api/users/me': () =>
        jsonResponse(200, { ...userBody, onboarding_completed: false }),
    })
    const router = renderApp('/login')

    await fillAndSubmit()

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/onboarding'),
    )
  })

  it('아이디나 비밀번호가 틀리면 서버 메시지를 보여주고 로그인하지 않는다', async () => {
    mockApi(fetchMock, {
      'POST /api/auth/login': () => errorResponse(401, 'INVALID_CREDENTIALS'),
    })
    renderApp('/login')

    await fillAndSubmit('momfit01', 'wrong-pass1')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'INVALID_CREDENTIALS 메시지',
    )
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
  })

  it('입력이 비어 있으면 요청을 보내지 않는다', async () => {
    renderApp('/login')

    await fillAndSubmit('momfit01', '')

    expect(screen.getByRole('alert')).toHaveTextContent(
      '아이디와 비밀번호를 입력해 주세요.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('요청 중에는 버튼을 비활성화한다', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi(fetchMock, {
      'POST /api/auth/login': () =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    })
    renderApp('/login')

    await fillAndSubmit()

    expect(
      await screen.findByRole('button', { name: '로그인 중...' }),
    ).toBeDisabled()
    finish(errorResponse(401, 'INVALID_CREDENTIALS'))
    await screen.findByRole('alert')
  })

  it('가입·비밀번호 찾기 링크가 있다', () => {
    renderApp('/login')

    expect(screen.getByRole('link', { name: '회원가입' })).toHaveAttribute(
      'href',
      '/signup',
    )
    expect(screen.getByRole('link', { name: '비밀번호 찾기' })).toHaveAttribute(
      'href',
      '/password/reset',
    )
  })

  it('비밀번호 재설정 후 넘어오면 안내 문구를 보여준다', () => {
    renderApp('/login', { notice: '비밀번호가 변경되었습니다.' })

    expect(screen.getByRole('status')).toHaveTextContent(
      '비밀번호가 변경되었습니다.',
    )
  })
})
