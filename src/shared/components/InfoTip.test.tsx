import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InfoTip from './InfoTip'

const TEXT = '임신 주차는 출산 예정일로 계산합니다.'

function setup() {
  render(<InfoTip text={TEXT} label="출산 예정일 도움말" />)
  return {
    button: screen.getByRole('button', { name: '출산 예정일 도움말' }),
    user: userEvent.setup(),
  }
}

describe('InfoTip', () => {
  it('처음에는 설명을 숨기고, 버튼에는 설명이 연결되어 있다', () => {
    const { button } = setup()

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(button).toHaveAccessibleDescription(TEXT)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('물음표 버튼이다 (폼 제출을 일으키지 않는다)', () => {
    const { button } = setup()

    expect(button).toHaveTextContent('?')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('마우스를 올리면 설명을 보여주고, 내리면 숨긴다', async () => {
    const { button, user } = setup()

    await user.hover(button)
    expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.unhover(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('키보드로 포커스를 받으면 보여주고, 벗어나면 숨긴다', async () => {
    const { user } = setup()

    await user.tab()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.tab()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('눌러서 열고 다시 눌러서 닫는다', () => {
    const { button } = setup()

    // userEvent.click은 마우스를 올리는 동작도 포함하므로, 순수한 클릭 토글은 fireEvent로 본다.
    fireEvent.click(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('마우스로 눌러서 생긴 포커스는 열림으로 치지 않아, 마우스를 치우고 다시 누르면 닫힌다', async () => {
    const { button, user } = setup()

    await user.click(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.unhover(button)
    // 포커스는 남아 있지만 클릭으로 고정된 상태만 유지된다.
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.click(button)
    await user.unhover(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('Esc를 누르면 닫는다', async () => {
    const { button, user } = setup()
    await user.hover(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await user.unhover(button)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('이름을 주지 않으면 도움말이라는 이름을 쓴다', () => {
    render(<InfoTip text="설명" />)

    expect(screen.getByRole('button', { name: '도움말' })).toBeInTheDocument()
  })
})

describe('InfoTip (오류 변형)', () => {
  it('빨간 느낌표 아이콘 버튼이고, 설명은 아이콘 오른쪽의 흰 말풍선이다', async () => {
    render(
      <InfoTip
        variant="error"
        text="이미 사용 중입니다."
        label="사용할 수 없는 이유"
      />,
    )
    const button = screen.getByRole('button', { name: '사용할 수 없는 이유' })

    expect(button.querySelector('svg[data-kind=error]')).not.toBeNull()
    expect(button).toHaveAccessibleDescription('이미 사용 중입니다.')

    await userEvent.setup().hover(button)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveClass('bg-white', 'text-ink', 'left-full')
    expect(tooltip).not.toHaveClass('bg-danger')
  })

  it('이름을 주지 않으면 오류 안내라는 이름을 쓴다', () => {
    render(<InfoTip variant="error" text="설명" />)

    expect(
      screen.getByRole('button', { name: '오류 안내' }),
    ).toBeInTheDocument()
  })

  it('기본은 왼쪽 끝에 맞춘다', async () => {
    render(<InfoTip text="설명" />)

    await userEvent.setup().hover(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toHaveClass('left-0')
  })
})

describe('InfoTip (자동으로 열어 두기)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('나타난 직후 지정한 시간 동안 열려 있다가 닫힌다', () => {
    render(<InfoTip variant="error" text="설명" autoOpenFor={3000} />)

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('열려 있는 동안 Esc로 바로 닫을 수 있다', () => {
    render(<InfoTip text="설명" autoOpenFor={3000} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' })

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('자동으로 열린 시간이 끝나도 마우스를 올리고 있으면 계속 보인다', () => {
    render(<InfoTip text="설명" autoOpenFor={1000} />)
    fireEvent.mouseEnter(screen.getByRole('button').parentElement!)

    act(() => {
      vi.advanceTimersByTime(1500)
    })

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('자동 열기를 요청하지 않으면 처음부터 닫혀 있다', () => {
    render(<InfoTip text="설명" />)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
