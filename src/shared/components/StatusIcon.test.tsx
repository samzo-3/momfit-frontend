import { render } from '@testing-library/react'
import StatusIcon from './StatusIcon'

function icon(kind: 'success' | 'error' | 'loading') {
  const { container } = render(<StatusIcon kind={kind} />)
  return container.querySelector('svg')!
}

describe('StatusIcon', () => {
  it('스크린리더에서는 숨긴다', () => {
    expect(icon('success')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each([
    ['success', 'text-success'],
    ['error', 'text-danger'],
    ['loading', 'text-ink-secondary'],
  ] as const)('%s는 알맞은 색을 쓴다', (kind, color) => {
    expect(icon(kind)).toHaveClass(color, 'size-5')
  })

  it('로딩만 회전하고, 동작 줄이기에서는 멈춘다', () => {
    expect(icon('loading')).toHaveClass(
      'animate-spin',
      'motion-reduce:animate-none',
    )
    expect(icon('success')).not.toHaveClass('animate-spin')
    expect(icon('error')).not.toHaveClass('animate-spin')
  })
})
