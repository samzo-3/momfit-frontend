import { screen, waitFor, within } from '@testing-library/react'
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 사용 중인 아이디입니다.',
    )
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

    await waitFor(() =>
      expect(hasAlert('비밀번호가 일치하지 않습니다.')).toBe(true),
    )
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'LOGIN_ID_EXISTS 메시지',
    )
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
    // 인증을 처음부터 다시 시작한다: 이메일 칸은 비어 있고 입력할 수 있으며,
    // 올바른 이메일을 입력하면 칸 안에 발송 버튼이 다시 나타난다.
    expect(screen.getByLabelText('이메일')).toBeEnabled()
    expect(screen.getByLabelText('이메일')).toHaveValue('')
    await userEvent
      .setup()
      .type(screen.getByLabelText('이메일'), 'mom@example.com')
    expect(button('인증 코드 발송')).toBeInTheDocument()
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
  it('이메일 형식이 틀리면 발송 버튼이 나타나지 않아 코드를 보낼 수 없다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'not-an-email')
    await user.tab()

    expect(
      screen.queryByRole('button', { name: '인증 코드 발송' }),
    ).not.toBeInTheDocument()
    expect(hasAlert('이메일 형식이 올바르지 않습니다.')).toBe(true)
    expect(
      within(
        screen.getByLabelText('이메일').parentElement as HTMLElement,
      ).getByRole('tooltip'),
    ).toHaveTextContent('이메일 형식이 올바르지 않습니다.')
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
    await user.tab()

    expect(screen.getByLabelText('인증 코드')).toHaveValue('12')
    expect(hasAlert('6자리 숫자 인증 코드를 입력해 주세요.')).toBe(true)
    expect(
      screen.queryByRole('button', { name: '인증 확인' }),
    ).not.toBeInTheDocument()
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

describe('회원가입 - 플레이스홀더', () => {
  it('각 입력칸에 예시 문구를 보여준다', () => {
    renderApp('/signup')

    expect(screen.getByLabelText('아이디')).toHaveAttribute(
      'placeholder',
      '영문 소문자·숫자 4~20자',
    )
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute(
      'placeholder',
      '8자 이상, 영문과 숫자 포함',
    )
    expect(screen.getByLabelText('비밀번호 확인')).toHaveAttribute(
      'placeholder',
      '비밀번호를 한 번 더 입력',
    )
    expect(screen.getByLabelText('닉네임')).toHaveAttribute(
      'placeholder',
      '1~20자 (공백만은 불가)',
    )
    expect(screen.getByLabelText('이메일')).toHaveAttribute(
      'placeholder',
      'example@email.com',
    )
  })

  it('인증 코드 입력칸에도 예시 문구가 있다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))

    expect(await screen.findByLabelText('인증 코드')).toHaveAttribute(
      'placeholder',
      '6자리 숫자',
    )
  })
})

// 비밀번호·닉네임 오류는 칸 안 툴팁에 보이고, 알림(role=alert)으로도 읽힌다.
function hasAlert(text: string) {
  return screen.queryAllByRole('alert').some((el) => el.textContent === text)
}

describe('회원가입 - 입력 중 형식 검사', () => {
  const ID_ERROR = '영문 소문자와 숫자 4~20자로 입력해 주세요.'
  const PASSWORD_ERROR = '8자 이상, 영문과 숫자를 포함해 주세요.'
  const MISMATCH = '비밀번호가 일치하지 않습니다.'

  it('입력하는 도중에는 오류를 보여주지 않고, 칸을 벗어나면 보여준다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('아이디'), 'ab')
    expect(hasAlert(ID_ERROR)).toBe(false)

    await user.tab()

    expect(hasAlert(ID_ERROR)).toBe(true)
  })

  it('형식이 맞지 않으면 테두리가 빨갛게 바뀌고 접근성 오류 상태가 된다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    const field = screen.getByLabelText('아이디')

    await user.type(field, 'ab')
    await user.tab()

    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveClass('border-danger')
  })

  it('이미 벗어난 칸은 고치는 즉시 오류가 사라진다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    const field = screen.getByLabelText('아이디')
    await user.type(field, 'ab')
    await user.tab()
    expect(hasAlert(ID_ERROR)).toBe(true)

    await user.click(field)
    await user.type(field, 'cd')

    expect(hasAlert(ID_ERROR)).toBe(false)
    expect(field).not.toHaveAttribute('aria-invalid')
    expect(field).not.toHaveClass('border-danger')
  })

  it('이미 벗어난 칸은 다시 틀리게 고치면 즉시 오류가 나타난다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    const field = screen.getByLabelText('아이디')
    await user.type(field, 'abcd')
    await user.tab()
    expect(hasAlert(ID_ERROR)).toBe(false)

    await user.click(field)
    await user.type(field, '!')

    expect(hasAlert(ID_ERROR)).toBe(true)
  })

  it('비어 있는 칸은 벗어나도 오류를 보여주지 않는다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('아이디'))
    await user.tab()
    await user.click(screen.getByLabelText('비밀번호'))
    await user.tab()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('비밀번호 형식을 검사한다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('비밀번호'), 'short1')
    await user.tab()
    expect(hasAlert(PASSWORD_ERROR)).toBe(true)
    expect(screen.getByRole('tooltip')).toHaveTextContent(PASSWORD_ERROR)

    await user.click(screen.getByLabelText('비밀번호'))
    await user.type(screen.getByLabelText('비밀번호'), 'abcd')
    expect(hasAlert(PASSWORD_ERROR)).toBe(false)
  })

  it('비밀번호 확인이 다르면 보여주고, 비밀번호를 바꿔 맞추면 사라진다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password2')
    await user.tab()
    expect(hasAlert(MISMATCH)).toBe(true)

    const password = screen.getByLabelText('비밀번호')
    await user.clear(password)
    await user.type(password, 'password2')

    expect(hasAlert(MISMATCH)).toBe(false)
  })

  it('닉네임이 공백뿐이면 벗어날 때 오류를 보여준다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('닉네임'), '   ')
    await user.tab()

    expect(hasAlert('닉네임은 1~20자로 입력해 주세요.')).toBe(true)
  })

  it('이메일 형식이 틀리면 벗어날 때 오류를 보여주고, 고치면 사라진다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    const field = screen.getByLabelText('이메일')

    await user.type(field, 'not-an-email')
    await user.tab()
    expect(hasAlert('이메일 형식이 올바르지 않습니다.')).toBe(true)
    expect(field).toHaveClass('border-danger')

    await user.clear(field)
    await user.type(field, 'mom@example.com')

    expect(
      screen.queryByText('이메일 형식이 올바르지 않습니다.'),
    ).not.toBeInTheDocument()
  })

  it('인증 코드가 6자리가 아니면 벗어날 때 오류를 보여준다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')
    await user.click(button('인증 코드 발송'))

    await user.type(await screen.findByLabelText('인증 코드'), '12')
    await user.tab()

    expect(hasAlert('6자리 숫자 인증 코드를 입력해 주세요.')).toBe(true)

    await user.click(screen.getByLabelText('인증 코드'))
    await user.type(screen.getByLabelText('인증 코드'), '3456')
    expect(
      screen.queryByText('6자리 숫자 인증 코드를 입력해 주세요.'),
    ).not.toBeInTheDocument()
  })

  it('범위를 벗어난 출산 예정일은 벗어날 때 오류를 보여준다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('출산 예정일'), '2020-01-01')
    await user.tab()

    expect(
      screen.getByText('출산 예정일은 오늘부터 280일 이내여야 합니다.'),
    ).toBeInTheDocument()
  })

  it('제출 시 나온 안내가 있으면 그것을 먼저 보여주고, 고치면 실시간 검사로 이어진다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('비밀번호'), 'short1')
    await user.click(button('가입하기'))
    expect(hasAlert(PASSWORD_ERROR)).toBe(true)

    await user.type(screen.getByLabelText('비밀번호'), 'abcdef')

    expect(hasAlert(PASSWORD_ERROR)).toBe(false)
  })

  it('형식 오류가 있어도 비어 있는 칸의 제출 안내는 그대로 나온다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('아이디'), 'ab')
    await user.tab()

    await user.click(button('가입하기'))

    expect(hasAlert(ID_ERROR)).toBe(true)
    expect(screen.getByText('운동 경험을 선택해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('이메일 인증을 완료해 주세요.')).toBeInTheDocument()
  })
})

describe('회원가입 - 플로팅 라벨과 툴팁', () => {
  it('텍스트 입력칸은 모두 라벨이 칸 안에 있고, 예시 문구는 칸에 포커스가 있을 때만 보이도록 한다', () => {
    renderApp('/signup')

    for (const name of [
      '아이디',
      '비밀번호',
      '비밀번호 확인',
      '닉네임',
      '이메일',
    ]) {
      const input = screen.getByLabelText(name)
      expect(input.parentElement).toHaveClass('relative')
      expect(input).toHaveClass('placeholder:text-transparent')
      expect(input.getAttribute('placeholder')).not.toBe(' ')
    }
  })

  it('인증 코드 입력칸도 라벨이 칸 안에 있다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('이메일'), 'mom@example.com')

    await user.click(button('인증 코드 발송'))

    expect(
      (await screen.findByLabelText('인증 코드')).parentElement,
    ).toHaveClass('relative')
  })

  it('출산 예정일의 설명은 힌트 문장이 아니라 라벨 옆 물음표 툴팁에 있다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    const input = screen.getByLabelText('출산 예정일')
    expect(input).not.toHaveAccessibleDescription(
      /임신 주차는 출산 예정일로 계산합니다/,
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: '출산 예정일 도움말' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '임신 주차는 출산 예정일로 계산합니다.',
    )
  })

  it('물음표 툴팁을 눌러도 폼이 제출되지 않는다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '출산 예정일 도움말' }))

    expect(requestsTo(fetchMock, 'POST /api/auth/signup')).toHaveLength(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('형식 오류는 분홍 배경과 빨간 테두리, 느낌표 아이콘과 툴팁으로 보인다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    const field = screen.getByLabelText('아이디')

    await user.type(field, 'ab')
    await user.tab()

    expect(field).toHaveClass('border-danger', 'bg-danger/6', 'text-danger')
    expect(screen.getByText('아이디', { selector: 'label' })).toHaveClass(
      'text-danger',
    )
    const box = field.parentElement as HTMLElement
    expect(box.querySelector('svg[data-kind=error]')).not.toBeNull()
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '영문 소문자와 숫자 4~20자로 입력해 주세요.',
    )
  })

  it('이메일 인증 영역 위에 구분선이 있다', () => {
    renderApp('/signup')

    const divider = document.querySelector('form hr')
    expect(divider).not.toBeNull()
  })
})

describe('회원가입 - 아이디·비밀번호 규칙 안내', () => {
  it('입력칸 아래에 규칙 문구를 따로 두지 않고, 예시 문구가 규칙을 알려 준다', () => {
    renderApp('/signup')

    for (const name of ['아이디', '비밀번호']) {
      expect(screen.getByLabelText(name)).not.toHaveAccessibleDescription()
    }
    expect(screen.getByLabelText('아이디')).toHaveAttribute(
      'placeholder',
      expect.stringContaining('4~20자'),
    )
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute(
      'placeholder',
      expect.stringContaining('8자 이상'),
    )
  })

  it('규칙에 맞지 않으면 그때는 오류 안내로 규칙을 알려 준다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('아이디'), 'ab')
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent(
      '영문 소문자와 숫자 4~20자',
    )
  })
})

describe('회원가입 - 아이디 중복 확인 (칸 안 오른쪽)', () => {
  const idField = () => screen.getByLabelText('아이디')
  const checkButton = () => screen.queryByRole('button', { name: '중복 확인' })

  it('중복 확인 버튼은 입력칸 안에 있고, 칸 아래에는 별도 버튼 줄이 없다', async () => {
    renderApp('/signup')

    await userEvent.setup().type(idField(), 'momfit01')

    expect(idField().parentElement).toContainElement(checkButton())
    expect(checkButton()?.parentElement).toHaveClass('absolute')
  })

  it('형식이 맞기 전에는 버튼이 없고, 맞으면 나타난다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    expect(checkButton()).not.toBeInTheDocument()

    await user.type(idField(), 'ab')
    expect(checkButton()).not.toBeInTheDocument()

    await user.type(idField(), 'cd')
    expect(checkButton()).toBeInTheDocument()
  })

  it('사용 가능하면 버튼이 체크 아이콘으로 바뀌고, 눈에 보이는 문구는 없다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'momfit01')

    await user.click(button('중복 확인'))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('사용 가능한 아이디입니다.')
    expect(status).toHaveClass('sr-only')
    expect(
      idField().parentElement?.querySelector('svg[data-kind=success]'),
    ).not.toBeNull()
    expect(checkButton()).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('이미 사용 중이면 빨간 느낌표 아이콘과 오류 안내, 오류 스타일로 바뀐다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'GET /api/auth/check-login-id': () =>
          jsonResponse(200, { available: false }),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'taken01')

    await user.click(button('중복 확인'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미 사용 중인 아이디입니다.',
    )
    expect(
      idField().parentElement?.querySelector('svg[data-kind=error]'),
    ).not.toBeNull()
    expect(idField()).toHaveClass('border-danger', 'bg-danger/6')
    expect(checkButton()).not.toBeInTheDocument()
  })

  it('확인하는 동안에는 로딩 아이콘을 보여주고 버튼을 숨긴다', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi(
      fetchMock,
      defaultHandlers({
        'GET /api/auth/check-login-id': () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'momfit01')

    await user.click(button('중복 확인'))

    expect(await screen.findByRole('status')).toHaveTextContent('확인하는 중')
    expect(
      idField().parentElement?.querySelector('svg[data-kind=loading]'),
    ).not.toBeNull()
    expect(checkButton()).not.toBeInTheDocument()
    finish(jsonResponse(200, { available: true }))
    expect(
      await screen.findByText('사용 가능한 아이디입니다.'),
    ).toBeInTheDocument()
  })

  it('결과가 난 뒤 아이디를 고치면 다시 버튼으로 돌아온다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'momfit01')
    await user.click(button('중복 확인'))
    await screen.findByText('사용 가능한 아이디입니다.')

    await user.type(idField(), '2')

    expect(checkButton()).toBeInTheDocument()
    expect(
      idField().parentElement?.querySelector('svg[data-kind=success]'),
    ).toBeNull()
  })

  it('이미 사용 중이라고 나온 뒤 고치면 오류 표시가 사라지고 버튼으로 돌아온다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'GET /api/auth/check-login-id': () =>
          jsonResponse(200, { available: false }),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'taken01')
    await user.click(button('중복 확인'))
    await screen.findByRole('alert')

    await user.type(idField(), '2')

    expect(
      screen.queryByText('이미 사용 중인 아이디입니다.'),
    ).not.toBeInTheDocument()
    expect(checkButton()).toBeInTheDocument()
  })

  it('확인 요청이 실패하면 오류 안내를 보여주고 다시 시도할 수 있다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'GET /api/auth/check-login-id': () => errorResponse(500, 'INTERNAL'),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'momfit01')

    await user.click(button('중복 확인'))

    expect(await screen.findByText('INTERNAL 메시지')).toBeInTheDocument()
    expect(checkButton()).toBeInTheDocument()
  })

  it('확인하지 않고 가입하려 하면 기존처럼 안내한다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'momfit01')

    await user.click(button('가입하기'))

    expect(
      await screen.findByText('아이디 중복 확인을 해주세요.'),
    ).toBeInTheDocument()
    expect(requestsTo(fetchMock, 'POST /api/auth/signup')).toHaveLength(0)
  })

  it('입력한 아이디로 확인 요청을 보낸다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(idField(), 'momfit01')

    await user.click(button('중복 확인'))

    await screen.findByText('사용 가능한 아이디입니다.')
    expect(requestsTo(fetchMock, 'GET /api/auth/check-login-id')[0][0]).toBe(
      '/api/auth/check-login-id?login_id=momfit01',
    )
  })
})

describe('회원가입 - 사용 중인 아이디 툴팁', () => {
  const takenHandlers = () =>
    defaultHandlers({
      'GET /api/auth/check-login-id': () =>
        jsonResponse(200, { available: false }),
    })

  async function checkTakenId() {
    mockApi(fetchMock, takenHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('아이디'), 'taken01')
    await user.click(button('중복 확인'))
    await screen.findByRole('alert')
    return user
  }

  it('사용 중이라는 문구를 칸 아래에 보이지 않고, 스크린리더에는 알린다', async () => {
    await checkTakenId()

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('sr-only')
    expect(alert).toHaveTextContent('이미 사용 중인 아이디입니다.')
    expect(screen.getByLabelText('아이디')).toHaveClass(
      'border-danger',
      'bg-danger/6',
    )
  })

  it('빨간 느낌표 아이콘이 툴팁 버튼이고, 나타난 직후 사유가 열려 있다', async () => {
    await checkTakenId()

    const icon = screen.getByRole('button', {
      name: '아이디를 사용할 수 없는 이유',
    })
    expect(icon.querySelector('svg[data-kind=error]')).not.toBeNull()
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '이미 사용 중인 아이디입니다.',
    )
    expect(icon.parentElement?.parentElement).toHaveClass('absolute')
  })

  it('말풍선은 입력칸 오른쪽 끝에 맞춰 카드 밖으로 나가지 않는다', async () => {
    await checkTakenId()

    expect(screen.getByRole('tooltip')).toHaveClass(
      'left-full',
      'bg-white',
      'text-ink',
    )
  })

  it('아이디를 고치면 툴팁과 오류 표시가 사라지고 버튼이 돌아온다', async () => {
    const user = await checkTakenId()

    await user.type(screen.getByLabelText('아이디'), '2')

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '아이디를 사용할 수 없는 이유' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '중복 확인' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).not.toHaveClass('border-danger')
  })

  it('가입 요청에서 서버가 중복을 알려줘도 같은 툴팁으로 보여준다', async () => {
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/signup': () => errorResponse(409, 'LOGIN_ID_EXISTS'),
      }),
    )
    renderApp('/signup')
    const user = await fillSignup()

    await user.click(button('가입하기'))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'LOGIN_ID_EXISTS 메시지',
    )
    expect(screen.getByRole('alert')).toHaveClass('sr-only')
  })

  it('형식 오류가 아닌 아이디 안내는 이전처럼 칸 아래에 보인다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('아이디'), 'abcd')
    await user.click(button('가입하기'))

    expect(screen.getByText('아이디 중복 확인을 해주세요.')).not.toHaveClass(
      'sr-only',
    )
    expect(
      within(
        screen.getByLabelText('아이디').parentElement as HTMLElement,
      ).queryByRole('tooltip'),
    ).not.toBeInTheDocument()
  })
})

describe('회원가입 - 이메일 인증 (칸 안 오른쪽)', () => {
  const emailField = () => screen.getByLabelText('이메일')

  async function typeEmail(user: ReturnType<typeof userEvent.setup>) {
    await user.type(emailField(), 'mom@example.com')
  }

  it('이메일이 비었거나 형식이 틀리면 칸 안에 아무 버튼도 없다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    expect(
      screen.queryByRole('button', { name: '인증 코드 발송' }),
    ).not.toBeInTheDocument()

    await user.type(emailField(), 'mom@')

    expect(
      screen.queryByRole('button', { name: '인증 코드 발송' }),
    ).not.toBeInTheDocument()
  })

  it('올바른 이메일을 입력하면 입력칸 안 오른쪽에 인증 코드 발송 버튼이 나타난다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await typeEmail(user)

    const send = button('인증 코드 발송')
    expect(emailField().parentElement).toContainElement(send)
    expect(send.parentElement).toHaveClass('absolute')
  })

  it('발송하는 동안 로딩 아이콘을 보여주고 버튼을 숨긴다', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/email/send-code': () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()
    await typeEmail(user)

    await user.click(button('인증 코드 발송'))

    expect(await screen.findByRole('status')).toHaveTextContent(
      '인증 코드를 보내는 중',
    )
    expect(
      emailField().parentElement?.querySelector('svg[data-kind=loading]'),
    ).not.toBeNull()
    expect(
      screen.queryByRole('button', { name: '인증 코드 발송' }),
    ).not.toBeInTheDocument()
    finish(jsonResponse(204))
    expect(await screen.findByLabelText('인증 코드')).toBeInTheDocument()
  })

  it('발송 뒤에는 이메일 칸 안에 재발송이, 인증 코드 칸 안에 인증 확인이 있다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await typeEmail(user)

    await user.click(button('인증 코드 발송'))

    const code = await screen.findByLabelText('인증 코드')
    await user.type(code, '123456')
    expect(emailField().parentElement).toContainElement(button('재발송 (60초)'))
    expect(button('재발송 (60초)')).toBeDisabled()
    expect(code.parentElement).toContainElement(button('인증 확인'))
    expect(button('인증 확인').parentElement).toHaveClass('absolute')
  })

  it('이메일 변경은 인증 코드 칸 아래의 작은 글자 버튼이다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await typeEmail(user)
    await user.click(button('인증 코드 발송'))

    const change = await screen.findByRole('button', { name: '이메일 변경' })
    await user.click(change)

    expect(emailField()).toBeEnabled()
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
  })

  it('인증을 확인하는 동안 인증 코드 칸 안에 로딩 아이콘을 보여준다', async () => {
    let finish: (response: Response) => void = () => {}
    mockApi(
      fetchMock,
      defaultHandlers({
        'POST /api/auth/email/verify-code': () =>
          new Promise<Response>((resolve) => {
            finish = resolve
          }),
      }),
    )
    renderApp('/signup')
    const user = userEvent.setup()
    await typeEmail(user)
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), '123456')

    await user.click(button('인증 확인'))

    expect(
      await screen.findByText('인증 코드를 확인하는 중입니다.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '인증 확인' }),
    ).not.toBeInTheDocument()
    finish(
      jsonResponse(200, {
        email_verification_token: 'email-token',
        expires_in: 1800,
      }),
    )
    expect(
      await screen.findByText('이메일 인증이 완료되었습니다.'),
    ).toBeInTheDocument()
  })

  it('인증이 끝나면 이메일 칸 안에 초록 체크와 변경 버튼이 있고, 보이는 완료 문구는 없다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await typeEmail(user)
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), '123456')

    await user.click(button('인증 확인'))

    const status = await screen.findByText('이메일 인증이 완료되었습니다.')
    expect(status).toHaveClass('sr-only')
    expect(
      emailField().parentElement?.querySelector('svg[data-kind=success]'),
    ).not.toBeNull()
    expect(emailField()).toBeDisabled()
    expect(
      screen.getByRole('button', { name: '다른 이메일로 변경' }),
    ).toHaveTextContent('변경')
    expect(screen.queryByLabelText('인증 코드')).not.toBeInTheDocument()
  })

  it('변경을 누르면 인증을 처음부터 다시 시작한다', async () => {
    mockApi(fetchMock, defaultHandlers())
    renderApp('/signup')
    const user = userEvent.setup()
    await typeEmail(user)
    await user.click(button('인증 코드 발송'))
    await user.type(await screen.findByLabelText('인증 코드'), '123456')
    await user.click(button('인증 확인'))
    await user.click(
      await screen.findByRole('button', { name: '다른 이메일로 변경' }),
    )

    expect(emailField()).toBeEnabled()
    expect(button('인증 코드 발송')).toBeInTheDocument()
    expect(
      emailField().parentElement?.querySelector('svg[data-kind=success]'),
    ).toBeNull()
  })
})

describe('회원가입 - 비밀번호·닉네임 칸 안 상태 표시', () => {
  it('올바르게 입력하면 칸 안에 초록 체크가 나타난다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'password1')
    await user.type(screen.getByLabelText('닉네임'), '맘핏')

    for (const name of ['비밀번호', '비밀번호 확인', '닉네임']) {
      const box = screen.getByLabelText(name).parentElement as HTMLElement
      expect(box.querySelector('svg[data-kind=success]')).not.toBeNull()
    }
  })

  it('잘못 입력하면 칸 아래 문구 없이 느낌표 아이콘 오른쪽에 흰 툴팁으로 안내한다', async () => {
    renderApp('/signup')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('닉네임'), '   ')
    await user.tab()

    const box = screen.getByLabelText('닉네임').parentElement as HTMLElement
    expect(box.querySelector('svg[data-kind=error]')).not.toBeNull()
    expect(screen.getByRole('tooltip')).toHaveClass('left-full', 'bg-white')
    expect(screen.getByRole('alert')).toHaveClass('sr-only')
  })
})
