import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  errorResponse,
  jsonResponse,
  mockApi,
  requestsTo,
  resetAuthStore,
} from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'
import { setupAuth } from '../auth-session'
import { useAuthStore } from '../store/auth-store'

const fetchMock = vi.fn<typeof fetch>()

type Handlers = Parameters<typeof mockApi>[1]

function handlers(overrides: Handlers = {}): Handlers {
  return {
    'POST /api/auth/email/send-code': () => jsonResponse(204),
    'POST /api/auth/email/verify-code': () =>
      jsonResponse(200, {
        email_verification_token: 'reset-token',
        expires_in: 1800,
      }),
    'POST /api/auth/password/reset': () => jsonResponse(204),
    ...overrides,
  }
}

const button = (name: string) => screen.getByRole('button', { name })

async function verifyEmail() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
  await user.click(button('인증 코드 발송'))
  await user.type(await screen.findByLabelText('인증 코드'), '123456')
  await user.click(button('인증 확인'))
  await screen.findByText('이메일 인증이 완료되었습니다.')
  return user
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  resetAuthStore()
  setupAuth()
  useAuthStore.getState().clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('비밀번호 재설정 화면', () => {
  it('이메일 인증 전에는 새 비밀번호 입력이 보이지 않는다', () => {
    renderApp('/password/reset')

    expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument()
  })

  it('가입 여부를 드러내지 않는 안내를 보여준다', async () => {
    mockApi(fetchMock, handlers())
    renderApp('/password/reset')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))

    expect(
      await screen.findByText('가입된 이메일이면 인증 코드가 발송됩니다.'),
    ).toBeInTheDocument()
    expect(
      JSON.parse(
        String(
          requestsTo(fetchMock, 'POST /api/auth/email/send-code')[0][1]?.body,
        ),
      ),
    ).toEqual({ email: 'mom@example.com', purpose: 'password_reset' })
  })

  it('인증 후 새 비밀번호를 저장하면 안내와 함께 로그인 화면으로 이동한다', async () => {
    mockApi(fetchMock, handlers())
    const router = renderApp('/password/reset')

    const user = await verifyEmail()
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass99')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass99')
    await user.click(button('비밀번호 변경'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    // 라우터 상태가 바뀐 시점과 화면이 갱신되는 시점 사이에 틈이 있으므로 화면 기준으로 기다린다.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '비밀번호가 변경되었습니다.',
      ),
    )
    expect(
      JSON.parse(
        String(
          requestsTo(fetchMock, 'POST /api/auth/password/reset')[0][1]?.body,
        ),
      ),
    ).toEqual({
      email: 'mom@example.com',
      email_verification_token: 'reset-token',
      new_password: 'newpass99',
    })
  })

  it('비밀번호 규칙을 어기면 요청을 보내지 않는다', async () => {
    mockApi(fetchMock, handlers())
    renderApp('/password/reset')

    const user = await verifyEmail()
    await user.type(screen.getByLabelText('새 비밀번호'), 'short1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'short1')
    await user.click(button('비밀번호 변경'))

    expect(
      screen.getByText('8자 이상, 영문과 숫자를 포함해 주세요.', {
        selector: '[role=alert]',
      }),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/password/reset')).toHaveLength(
      0,
    )
  })

  it('비밀번호 확인이 다르면 요청을 보내지 않는다', async () => {
    mockApi(fetchMock, handlers())
    renderApp('/password/reset')

    const user = await verifyEmail()
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass99')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass98')
    await user.click(button('비밀번호 변경'))

    expect(
      screen.getByText('비밀번호가 일치하지 않습니다.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/password/reset')).toHaveLength(
      0,
    )
  })

  it('인증이 만료되었다면 처음부터 다시 인증하게 한다', async () => {
    mockApi(
      fetchMock,
      handlers({
        'POST /api/auth/password/reset': () =>
          errorResponse(400, 'EMAIL_TOKEN_INVALID'),
      }),
    )
    renderApp('/password/reset')

    const user = await verifyEmail()
    await user.type(screen.getByLabelText('새 비밀번호'), 'newpass99')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'newpass99')
    await user.click(button('비밀번호 변경'))

    expect(
      await screen.findByText('EMAIL_TOKEN_INVALID 메시지'),
    ).toBeInTheDocument()
    expect(button('인증 코드 발송')).toBeInTheDocument()
    expect(screen.queryByLabelText('새 비밀번호')).not.toBeInTheDocument()
  })
})
