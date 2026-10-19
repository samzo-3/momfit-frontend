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
import { dueDateRange } from '../validation'

const fetchMock = vi.fn<typeof fetch>()
const tokenBody = {
  access_token: 'access-1',
  token_type: 'bearer',
  expires_in: 900,
}
const DUE_DATE = dueDateRange().max

type Handlers = Parameters<typeof mockApi>[1]

function defaultHandlers(overrides: Handlers = {}): Handlers {
  return {
    'GET /api/auth/check-login-id': () =>
      jsonResponse(200, { available: true }),
    'POST /api/auth/email/send-code': () => jsonResponse(204),
    'POST /api/auth/email/verify-code': () =>
      jsonResponse(200, {
        email_verification_token: 'email-token',
        expires_in: 1800,
      }),
    'POST /api/auth/signup': () => jsonResponse(201, tokenBody),
    'GET /api/users/me': () => jsonResponse(200, userBody),
    ...overrides,
  }
}

const button = (name: string) => screen.getByRole('button', { name })

interface Steps {
  checkLoginId?: boolean
  verifyEmail?: boolean
  consents?: boolean
  passwordConfirm?: string
}

async function fillSignup(steps: Steps = {}) {
  const { checkLoginId = true, verifyEmail = true, consents = true } = steps
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('아이디'), 'momfit01')
  if (checkLoginId) {
    await user.click(button('중복 확인'))
    await screen.findByText('사용 가능한 아이디입니다.')
  }
  await user.type(screen.getByLabelText('비밀번호'), 'password1')
  await user.type(
    screen.getByLabelText('비밀번호 확인'),
    steps.passwordConfirm ?? 'password1',
  )
  await user.type(screen.getByLabelText('닉네임'), '맘핏')
  if (verifyEmail) {
    await user.type(screen.getByLabelText('이메일'), 'Mom@Example.com')
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), '123456')
    await user.click(button('인증 확인'))
    await screen.findByText('이메일 인증이 완료되었습니다.')
  }
  await user.type(screen.getByLabelText('출산 예정일'), DUE_DATE)
  await user.click(screen.getByRole('radio', { name: '중' }))
  if (consents) {
    await user.click(screen.getByRole('checkbox', { name: /이용약관/ }))
    await user.click(screen.getByRole('checkbox', { name: /건강정보/ }))
  }
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

describe('회원가입 화면', () => {
  it('모든 단계를 마치면 가입하고 로그인 상태로 /home으로 이동한다', async () => {
    mockApi(fetchMock, defaultHandlers())
    const router = renderApp('/signup')

    const user = await fillSignup()
    await user.click(button('가입하기'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/home'))
    expect(useAuthStore.getState().status).toBe('authenticated')
    const [, init] = requestsTo(fetchMock, 'POST /api/auth/signup')[0]
    expect(JSON.parse(String(init?.body))).toEqual({
      login_id: 'momfit01',
      password: 'password1',
      nickname: '맘핏',
      email: 'mom@example.com',
      email_verification_token: 'email-token',
      due_date: DUE_DATE,
      exercise_level: 'medium',
      consents: { terms: true, health_data: true },
    })
    // 이메일 인증 요청은 소문자로 정규화되어 전송된다.
    expect(
      JSON.parse(
        String(
          requestsTo(fetchMock, 'POST /api/auth/email/send-code')[0][1]?.body,
        ),
      ),
    ).toEqual({ email: 'mom@example.com', purpose: 'signup' })
  })

  it('이메일 인증을 하지 않으면 가입 요청을 보내지 않는다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')

    const user = await fillSignup({ verifyEmail: false })
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('이메일 인증을 완료해 주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/signup')).toHaveLength(0)
  })

  it('아이디 중복 확인을 하지 않으면 가입 요청을 보내지 않는다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')

    const user = await fillSignup({ checkLoginId: false })
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('아이디 중복 확인을 해주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/signup')).toHaveLength(0)
  })

  it('이미 사용 중인 아이디면 사용할 수 없다고 안내한다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'GET /api/auth/check-login-id': () =>
          jsonResponse(200, { available: false }),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('아이디'), 'taken01')
    await user.click(button('중복 확인'))

    expect(
      await screen.findByText('이미 사용 중인 아이디입니다.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'GET /api/auth/check-login-id')[0][0]).toBe(
      '/api/auth/check-login-id?login_id=taken01',
    )
  })

  it('아이디를 고치면 중복 확인 결과가 초기화된다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('아이디'), 'momfit01')
    await user.click(button('중복 확인'))
    await screen.findByText('사용 가능한 아이디입니다.')

    await user.type(screen.getByLabelText('아이디'), '2')

    expect(
      screen.queryByText('사용 가능한 아이디입니다.'),
    ).not.toBeInTheDocument()
  })

  it('아이디는 입력하는 대로 소문자로 바꾼다', async () => {
    renderApp('/signup')

    await userEvent.setup().type(screen.getByLabelText('아이디'), 'MomFit01')

    expect(screen.getByLabelText('아이디')).toHaveValue('momfit01')
  })

  it('비밀번호 확인이 다르면 가입 요청을 보내지 않는다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')

    const user = await fillSignup({ passwordConfirm: 'password2' })
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('비밀번호가 일치하지 않습니다.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/signup')).toHaveLength(0)
  })

  it('필수 약관에 동의하지 않으면 가입 요청을 보내지 않는다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')

    const user = await fillSignup({ consents: false })
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('필수 항목에 모두 동의해 주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/signup')).toHaveLength(0)
  })

  it('서버가 아이디 중복을 알려주면 아이디 필드에 표시한다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/signup': () => errorResponse(409, 'LOGIN_ID_EXISTS'),
      }),
    )
    renderApp('/signup')

    const user = await fillSignup()
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('LOGIN_ID_EXISTS 메시지'),
    ).toBeInTheDocument()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })

  it('이메일 인증이 만료되었다면 인증을 처음부터 다시 하게 한다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/signup': () =>
          errorResponse(400, 'EMAIL_TOKEN_INVALID'),
      }),
    )
    renderApp('/signup')

    const user = await fillSignup()
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('EMAIL_TOKEN_INVALID 메시지'),
    ).toBeInTheDocument()
    expect(button('인증 코드 발송')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toBeEnabled()
  })

  it('서버의 필드별 검증 오류를 해당 필드에 표시한다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/signup': () =>
          jsonResponse(422, {
            error: {
              code: 'VALIDATION_ERROR',
              message: '요청 값이 올바르지 않습니다.',
              fields: {
                due_date: '출산 예정일은 오늘부터 280일 이내여야 합니다.',
              },
            },
          }),
      }),
    )
    renderApp('/signup')

    const user = await fillSignup()
    await user.click(button('가입하기'))

    expect(
      await screen.findByText('출산 예정일은 오늘부터 280일 이내여야 합니다.'),
    ).toBeInTheDocument()
  })
})

describe('이메일 인증 입력', () => {
  it('이메일 형식이 틀리면 코드를 발송하지 않는다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'not-an-email')
    await user.click(button('인증 코드 발송'))

    expect(
      screen.getByText('이메일 형식이 올바르지 않습니다.'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('코드를 보내면 재발송 대기 시간을 보여준다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))

    expect(
      await screen.findByRole('button', { name: '재발송 (60초)' }),
    ).toBeDisabled()
  })

  it('발송 제한(429)에 걸리면 메시지를 보여주고 받아 둔 코드를 입력할 수 있다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/email/send-code': () =>
          errorResponse(429, 'RATE_LIMITED'),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))

    expect(await screen.findByText('RATE_LIMITED 메시지')).toBeInTheDocument()
    expect(screen.getByLabelText('인증 코드')).toBeEnabled()
  })

  it('발송 제한 뒤에도 받아 둔 코드로 인증을 마칠 수 있다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/email/send-code': () =>
          errorResponse(429, 'RATE_LIMITED'),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), '123456')
    await user.click(button('인증 확인'))

    expect(
      await screen.findByText('이메일 인증이 완료되었습니다.'),
    ).toBeInTheDocument()
  })

  it('코드가 틀리면 다시 입력할 수 있다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/email/verify-code': () =>
          errorResponse(400, 'CODE_INVALID'),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), '000000')
    await user.click(button('인증 확인'))

    expect(await screen.findByText('CODE_INVALID 메시지')).toBeInTheDocument()
    expect(screen.getByLabelText('인증 코드')).toBeEnabled()
  })

  it('코드는 숫자 6자리만 확인 요청한다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), 'ab12')
    await user.click(button('인증 확인'))

    expect(screen.getByLabelText('인증 코드')).toHaveValue('12')
    expect(
      screen.getByText('6자리 숫자 인증 코드를 입력해 주세요.'),
    ).toBeInTheDocument()
    expect(
      requestsTo(fetchMock, 'POST /api/auth/email/verify-code'),
    ).toHaveLength(0)
  })

  it('이메일 변경을 누르면 인증을 처음부터 다시 한다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))
    await user.click(await screen.findByRole('button', { name: '이메일 변경' }))

    expect(screen.getByLabelText('이메일')).toBeEnabled()
    expect(button('인증 코드 발송')).toBeInTheDocument()
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
  })
})
