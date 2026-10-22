import { screen } from '@testing-library/react'
import { resetAuthStore, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

beforeEach(() => {
  resetAuthStore()
  signOut()
})

describe('SiteFooter', () => {
  it('헤더와 본문 바탕과 같은 연한 살구색이고 위에 구분선이 있다', () => {
    renderApp('/login')

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveClass('bg-primary-soft', 'border-t')
    expect(
      screen.getByRole('navigation', { name: '주요' }).closest('header'),
    ).toHaveClass('bg-primary-soft/85')
    expect(screen.getByRole('main')).toHaveClass('bg-primary-soft')
  })

  it('화면을 많이 차지하지 않도록 세로 여백과 문구 간격이 작다', () => {
    renderApp('/login')

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveClass('py-4')
    expect(footer).not.toHaveClass('py-8')
    expect(footer.firstElementChild).toHaveClass('gap-1.5')
  })

  it('의학적 면책 문구를 서비스명 momfit과 함께 보여준다', () => {
    renderApp('/login')

    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'momfit은 의학적 진단이나 치료를 대신하지 않습니다. 운동을 시작하기 전에 담당 전문의와 상담하세요.',
    )
  })

  it('왼쪽에 서비스 소개 한 줄이 있고 면책 문구는 따로 있다', () => {
    renderApp('/login')

    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(
      /momfit.*안전하고 따뜻한 임산부 맞춤 운동 솔루션/,
    )
    // 구분 점은 장식이라 스크린리더가 읽지 않는다.
    expect(footer.querySelector('[aria-hidden=true]')).toHaveTextContent('•')
    expect(screen.getByText(/momfit은 의학적 진단이나/)).toHaveClass(
      'lg:text-right',
    )
  })

  it('면책 문구는 강제 줄바꿈 없이 넓은 화면에서 한 줄로 보인다', () => {
    renderApp('/login')

    const disclaimer = screen.getByText(/momfit은 의학적 진단이나/)
    expect(disclaimer.querySelectorAll('br')).toHaveLength(0)
    expect(disclaimer).toHaveClass('lg:whitespace-nowrap')
  })
})
