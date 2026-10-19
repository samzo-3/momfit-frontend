import { screen } from '@testing-library/react'
import { resetAuthStore, signOut } from '../../../test/auth-test-utils'
import { renderApp } from '../../../test/render-app'

beforeEach(() => {
  resetAuthStore()
  signOut()
})

describe('카카오 로그인 버튼', () => {
  it.each(['/login', '/signup'])(
    '%s 화면에 카카오 로그인 링크가 있다',
    (path) => {
      renderApp(path)

      const link = screen.getByRole('link', { name: '카카오로 시작하기' })
      expect(link).toHaveAttribute('href', '/api/auth/kakao/login')
    },
  )

  it('라우터 이동이 아니라 서버가 처리하는 일반 링크다', () => {
    renderApp('/login')

    // 카카오로 보내는 것은 백엔드의 리다이렉트라 SPA 이동(Link)을 쓰지 않는다.
    expect(
      screen.getByRole('link', { name: '카카오로 시작하기' }),
    ).not.toHaveAttribute('data-discover')
  })

  it('아이디 입력 폼과 구분선으로 나뉜다', () => {
    renderApp('/login')

    expect(screen.getByText('또는')).toBeInTheDocument()
    expect(screen.getByLabelText('아이디')).toBeInTheDocument()
  })
})

describe('카카오 로그인 실패 안내', () => {
  it.each([
    ['access_denied', '카카오 로그인을 취소하셨어요.'],
    ['state_mismatch', '로그인 요청이 올바르지 않아요. 다시 시도해 주세요.'],
    [
      'provider_error',
      '카카오 로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
    ],
  ])('/login?error=%s이면 안내를 보여준다', (code, message) => {
    renderApp(`/login?error=${code}`)

    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })

  it('알 수 없는 오류 코드도 일반 안내를 보여준다', () => {
    renderApp('/login?error=whatever')

    expect(screen.getByRole('alert')).toHaveTextContent(
      '로그인하지 못했어요. 다시 시도해 주세요.',
    )
  })

  it('오류 코드가 없으면 안내가 없다', () => {
    renderApp('/login')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
