import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetAuthStore, signIn, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

const wrapper = () =>
  document.querySelector<HTMLElement>('[data-page-transition]')!

beforeEach(() => {
  resetAuthStore()
})

describe('화면 전환 애니메이션', () => {
  it('화면 내용을 진입 애니메이션 래퍼 안에 그린다', () => {
    signOut()
    renderApp('/login')

    expect(wrapper()).toHaveClass('animate-page-in')
    expect(wrapper().querySelector('h1')?.textContent).toBe('로그인')
  })

  it('동작 줄이기 설정에서는 애니메이션을 끄는 클래스를 가진다', () => {
    signOut()
    renderApp('/login')

    expect(wrapper()).toHaveClass('motion-reduce:animate-none')
  })

  it('경로가 바뀌면 래퍼를 새로 만들어 애니메이션을 다시 재생한다', async () => {
    signOut()
    renderApp('/login')
    const before = wrapper()

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: '회원가입' }))

    expect(wrapper().querySelector('h1')?.textContent).toBe('회원가입')
    expect(wrapper()).not.toBe(before)
    expect(before.isConnected).toBe(false)
  })

  it('같은 경로 안에서 입력하거나 상태가 바뀌어도 다시 재생하지 않는다', async () => {
    signOut()
    renderApp('/login')
    const before = wrapper()

    await userEvent.setup().type(screen.getByLabelText('아이디'), 'momfit01')

    expect(wrapper()).toBe(before)
  })

  it('세션 복구가 끝나며 내용이 바뀌어도 같은 경로면 다시 재생하지 않는다', async () => {
    // 복구 중에는 로딩 화면, 끝나면 홈이 같은 /home 경로에서 교체된다.
    const router = renderApp('/home')
    const before = wrapper()
    expect(screen.getByRole('status')).toHaveTextContent('불러오는 중')

    signIn()
    await screen.findByRole('heading', { name: '맘핏' })

    expect(router.state.location.pathname).toBe('/home')
    expect(wrapper()).toBe(before)
  })

  it('헤더와 푸터는 애니메이션 래퍼 밖에 있어 화면이 바뀌어도 그대로다', () => {
    signOut()
    renderApp('/login')

    expect(
      wrapper().contains(screen.getByRole('navigation', { name: '주요' })),
    ).toBe(false)
    expect(wrapper().contains(screen.getByRole('contentinfo'))).toBe(false)
  })
})
