import { render } from '@testing-library/react'
import ChatbotMascot from './ChatbotMascot'

describe('ChatbotMascot', () => {
  it('장식이라 스크린리더에서 숨기고 포커스를 받지 않는다', () => {
    const { container } = render(<ChatbotMascot />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  })

  it('size로 크기를 정한다', () => {
    const { container } = render(<ChatbotMascot size={64} />)

    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '64')
    expect(svg).toHaveAttribute('height', '64')
  })

  it('id를 쓰지 않아 여러 개를 함께 그려도 서로 충돌하지 않는다', () => {
    const { container } = render(
      <>
        <ChatbotMascot />
        <ChatbotMascot />
        <ChatbotMascot />
      </>,
    )

    expect(container.querySelectorAll('svg')).toHaveLength(3)
    expect(container.querySelectorAll('[id]')).toHaveLength(0)
    expect(
      container.querySelectorAll('linearGradient, radialGradient'),
    ).toHaveLength(0)
  })

  it('className을 svg에 전달한다', () => {
    const { container } = render(<ChatbotMascot className="shrink-0" />)

    expect(container.querySelector('svg')).toHaveClass('shrink-0')
  })
})
