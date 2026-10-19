import { screen } from '@testing-library/react'
import { resetAuthStore, signIn, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

function heading(name: string) {
  return screen.getByRole('heading', { name })
}

beforeEach(() => {
  resetAuthStore()
})

describe('routes', () => {
  it('존재하지 않는 경로에서 404 화면을 보여준다', () => {
    renderApp('/no-such-page')
    expect(heading('페이지를 찾을 수 없습니다')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '홈으로 돌아가기' }),
    ).toHaveAttribute('href', '/')
  })
})

describe('보호 라우트 (/home)', () => {
  it('로그인한 사용자는 /home에서 홈 화면을 본다', () => {
    signIn()
    renderApp('/home')
    expect(heading('맘핏')).toBeInTheDocument()
  })

  it('세션을 복구하는 동안에는 로딩 화면을 보여준다', () => {
    const router = renderApp('/home')
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중')
    expect(router.state.location.pathname).toBe('/home')
  })

  it('로그인하지 않았으면 /login으로 보내고 원래 경로를 기억한다', () => {
    signOut()
    const router = renderApp('/home')
    expect(heading('로그인')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state.from.pathname).toBe('/home')
  })

  it('온보딩을 마치지 않았으면 보호 경로 대신 /onboarding으로 보낸다', () => {
    signIn({ onboardingCompleted: false })
    const router = renderApp('/home')
    expect(heading('온보딩')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
  })
})

describe('랜딩 (/)', () => {
  it.each([
    ['세션을 복구하는 동안', () => {}],
    ['비로그인 사용자', signOut],
    ['로그인 사용자', () => signIn()],
  ])('%s에게도 로그인으로 보내지 않고 랜딩을 보여준다', (_, prepare) => {
    prepare()
    const router = renderApp('/')
    expect(router.state.location.pathname).toBe('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /임신 중에도/ }),
    ).toBeInTheDocument()
  })
})

describe('로그인 상태에 따른 공개 경로', () => {
  it('로딩 중에는 /login을 바로 보여주지 않는다', () => {
    renderApp('/login')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it.each(['/login', '/signup'])(
    '비로그인 사용자는 %s를 볼 수 있다',
    (path) => {
      signOut()
      renderApp(path)
      expect(
        screen.getByRole('heading', { name: /로그인|회원가입/ }),
      ).toBeInTheDocument()
    },
  )

  it.each(['/login', '/signup'])(
    '로그인한 사용자가 %s에 접근하면 /home으로 보낸다',
    (path) => {
      signIn()
      const router = renderApp(path)
      expect(router.state.location.pathname).toBe('/home')
      expect(heading('맘핏')).toBeInTheDocument()
    },
  )

  it('온보딩 전 사용자가 /login에 접근하면 /onboarding으로 보낸다', () => {
    signIn({ onboardingCompleted: false })
    const router = renderApp('/login')
    expect(router.state.location.pathname).toBe('/onboarding')
  })
})

describe('/onboarding', () => {
  it('온보딩 전 사용자는 볼 수 있다', () => {
    signIn({ onboardingCompleted: false })
    renderApp('/onboarding')
    expect(heading('온보딩')).toBeInTheDocument()
  })

  it('비로그인 사용자는 /login으로 보낸다', () => {
    signOut()
    const router = renderApp('/onboarding')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('온보딩을 마친 사용자는 /home으로 보낸다', () => {
    signIn()
    const router = renderApp('/onboarding')
    expect(router.state.location.pathname).toBe('/home')
  })
})
