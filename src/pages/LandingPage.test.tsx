import { screen, within } from '@testing-library/react'
import { resetAuthStore, signIn, signOut } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

beforeEach(() => {
  resetAuthStore()
})

function main() {
  return within(screen.getByRole('main'))
}

describe('랜딩 페이지', () => {
  it('서비스를 소개하는 제목과 섹션을 보여준다', () => {
    signOut()
    renderApp('/')

    expect(
      main().getByRole('heading', { level: 1, name: /임신 중에도/ }),
    ).toBeInTheDocument()
    for (const name of [
      '맘핏이 함께해요',
      '이렇게 시작해요',
      '지금 시작해 보세요',
    ]) {
      expect(
        main().getByRole('heading', { level: 2, name }),
      ).toBeInTheDocument()
    }
  })

  it('주요 기능 4가지를 소개한다', () => {
    signOut()
    renderApp('/')

    const features = within(
      main().getByRole('region', { name: '맘핏이 함께해요' }),
    ).getAllByRole('listitem')
    expect(
      features.map((item) => within(item).getByRole('heading').textContent),
    ).toEqual([
      '실시간 자세 분석',
      '스텝별 음성 코칭',
      '나에게 맞춘 정보',
      '기록과 리포트',
    ])
  })

  it('시작 방법을 순서대로 안내한다', () => {
    signOut()
    renderApp('/')

    const steps = within(
      main().getByRole('region', { name: '이렇게 시작해요' }),
    ).getAllByRole('listitem')
    expect(steps).toHaveLength(3)
  })

  describe('비로그인 방문자', () => {
    it('처음과 끝에서 가입과 로그인으로 안내한다', () => {
      signOut()
      renderApp('/')

      const starts = main().getAllByRole('link', { name: '시작하기' })
      expect(starts).toHaveLength(2)
      for (const link of starts) expect(link).toHaveAttribute('href', '/signup')
      expect(main().getByRole('link', { name: '로그인' })).toHaveAttribute(
        'href',
        '/login',
      )
    })
  })

  describe('로그인한 사용자', () => {
    it('홈으로 가는 버튼만 보여주고 가입 유도 구간은 숨긴다', () => {
      signIn()
      renderApp('/')

      expect(
        main().getByRole('link', { name: '내 홈으로 가기' }),
      ).toHaveAttribute('href', '/home')
      expect(
        main().queryByRole('link', { name: '시작하기' }),
      ).not.toBeInTheDocument()
      expect(
        main().queryByRole('heading', { name: '지금 시작해 보세요' }),
      ).not.toBeInTheDocument()
    })

    it('온보딩을 마치지 않았다면 가입 마무리로 안내한다', () => {
      signIn({ onboardingCompleted: false })
      renderApp('/')

      expect(
        main().getByRole('link', { name: '가입 마무리하기' }),
      ).toHaveAttribute('href', '/onboarding')
    })
  })

  it('세션을 복구하는 동안에는 시작 버튼을 보여주지 않는다', () => {
    renderApp('/')

    expect(main().queryByRole('link')).not.toBeInTheDocument()
    expect(
      main().getByRole('heading', { level: 1, name: /임신 중에도/ }),
    ).toBeInTheDocument()
  })
})

describe('공통 푸터', () => {
  it.each(['/', '/login', '/no-such-page'])(
    '%s에서도 의학적 면책 문구를 보여준다',
    (path) => {
      signOut()
      renderApp(path)

      expect(screen.getByRole('contentinfo')).toHaveTextContent(
        '의학적 진단이나 치료를 대신하지 않습니다',
      )
      expect(screen.getByRole('contentinfo')).toHaveTextContent('전문의와 상담')
    },
  )
})
