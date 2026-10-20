import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TextLink from './TextLink'

function renderLink(tone?: 'default' | 'brand') {
  render(
    <MemoryRouter>
      <TextLink to="/me" tone={tone}>
        내 정보
      </TextLink>
    </MemoryRouter>,
  )
  return screen.getByRole('link', { name: '내 정보' })
}

describe('TextLink', () => {
  it('기본은 파란 링크 색이다', () => {
    expect(renderLink()).toHaveClass('text-link')
  })

  it('brand는 살구색 화면용 글자색이다', () => {
    const link = renderLink('brand')

    expect(link).toHaveClass('text-brand-text')
    expect(link).not.toHaveClass('text-link')
  })
})
