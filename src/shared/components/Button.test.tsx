import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Button from './Button'
import ButtonLink from './ButtonLink'

describe('Button', () => {
  it('type 기본값은 button이라 폼 안에서 제출되지 않는다', () => {
    render(<Button>확인</Button>)

    expect(screen.getByRole('button', { name: '확인' })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('brand 변형은 테라코타 배경에 흰 글자다', () => {
    render(<Button variant="brand">시작</Button>)

    expect(screen.getByRole('button', { name: '시작' })).toHaveClass(
      'bg-brand',
      'text-white',
      'hover:bg-brand-hover',
    )
  })
})

describe('Button brand-outline', () => {
  it('테두리와 글자는 brand-text 색이고 배경은 투명하다', () => {
    render(<Button variant="brand-outline">로그인</Button>)

    expect(screen.getByRole('button', { name: '로그인' })).toHaveClass(
      'border-brand-text',
      'text-brand-text',
      'bg-transparent',
    )
  })
})

describe('ButtonLink', () => {
  it('brand 변형도 같은 알약 모양을 쓴다', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/workouts" variant="brand">
          운동 시작하기
        </ButtonLink>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: '운동 시작하기' })
    expect(link).toHaveAttribute('href', '/workouts')
    expect(link).toHaveClass('bg-brand', 'rounded-full')
  })
})
