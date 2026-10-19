import { screen } from '@testing-library/react'
import { resetAuthStore, signIn } from '../test/auth-test-utils'
import { renderApp } from '../test/render-app'

beforeEach(() => {
  resetAuthStore()
})

describe('HomePage', () => {
  it('닉네임과 임신 주차를 보여준다', () => {
    signIn({ nickname: '테스트맘', pregnancyWeek: 28 })
    renderApp('/')

    expect(screen.getByText('테스트맘님, 임신 28주차')).toBeInTheDocument()
  })

  it('임신 주차가 없으면 닉네임만 보여준다', () => {
    signIn({ nickname: '테스트맘', pregnancyWeek: null })
    renderApp('/')

    expect(screen.getByText('테스트맘님')).toBeInTheDocument()
    expect(screen.queryByText(/주차/)).not.toBeInTheDocument()
  })
})
