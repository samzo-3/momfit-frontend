import { render, screen, within } from '@testing-library/react'
import { makeUser } from '../../../test/auth-test-utils'
import ProfileSummary from './ProfileSummary'

function summary() {
  return within(screen.getByRole('complementary', { name: '프로필 요약' }))
}

describe('ProfileSummary', () => {
  it('닉네임, 임신 주차, 이메일을 보여준다', () => {
    render(
      <ProfileSummary
        user={makeUser({ nickname: '테스트맘', pregnancyWeek: 28 })}
      />,
    )

    expect(summary().getByText('테스트맘')).toBeInTheDocument()
    expect(summary().getByText('임신 28주차')).toBeInTheDocument()
    expect(summary().getByText('mom@example.com')).toBeInTheDocument()
  })

  it('닉네임의 첫 글자를 원형 이니셜로 보여주고 스크린리더에서는 숨긴다', () => {
    render(<ProfileSummary user={makeUser({ nickname: '테스트맘' })} />)

    const initial = summary().getByText('테')
    expect(initial).toHaveAttribute('aria-hidden', 'true')
  })

  it('이모지처럼 두 칸을 차지하는 글자도 깨지지 않는다', () => {
    render(<ProfileSummary user={makeUser({ nickname: '🌸꽃맘' })} />)

    expect(summary().getByText('🌸')).toBeInTheDocument()
  })

  it('임신 주차가 없으면 주차를 보여주지 않는다', () => {
    render(<ProfileSummary user={makeUser({ pregnancyWeek: null })} />)

    expect(summary().queryByText(/임신 .*주차/)).not.toBeInTheDocument()
  })

  it('카카오 계정은 이메일 대신 카카오 계정이라고 보여준다', () => {
    render(
      <ProfileSummary user={makeUser({ provider: 'kakao', email: null })} />,
    )

    expect(summary().getByText('카카오 계정')).toBeInTheDocument()
  })
})
