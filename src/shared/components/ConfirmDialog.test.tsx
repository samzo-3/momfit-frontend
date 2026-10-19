import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { mockReducedMotion } from '../../test/motion'
import ConfirmDialog from './ConfirmDialog'

type Props = Partial<React.ComponentProps<typeof ConfirmDialog>>

function setup(props: Props = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <>
      <button>열기 버튼</button>
      <ConfirmDialog
        open
        title="삭제할까요?"
        description="되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    </>,
  )
  return { onConfirm, onCancel, user: userEvent.setup() }
}

describe('ConfirmDialog', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    setup({ open: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('제목과 설명이 연결된 모달 대화상자를 보여준다', () => {
    setup()

    const dialog = screen.getByRole('dialog', { name: '삭제할까요?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('되돌릴 수 없어요.')
  })

  it('화면 최상위(body)에 그려 레이아웃의 영향을 받지 않는다', () => {
    setup()

    expect(screen.getByRole('dialog').closest('body')).toBe(document.body)
    expect(
      document.body.firstElementChild?.contains(screen.getByRole('dialog')),
    ).toBe(false)
  })

  it('열리면 실수를 막기 위해 취소 버튼에 포커스를 둔다', () => {
    setup()

    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus()
  })

  it('확인과 취소 버튼이 각각 콜백을 부른다', async () => {
    const { onConfirm, onCancel, user } = setup()

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('취소 문구를 바꿀 수 있다', () => {
    setup({ cancelLabel: '닫기' })

    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
  })

  it('Esc를 누르면 취소한다', async () => {
    const { onCancel, onConfirm, user } = setup()

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('어두운 배경을 누르면 취소하지만 패널 안을 눌러서는 취소하지 않는다', async () => {
    const { onCancel, user } = setup()

    await user.click(screen.getByRole('heading', { name: '삭제할까요?' }))
    expect(onCancel).not.toHaveBeenCalled()

    await user.click(screen.getByRole('dialog').parentElement!)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Tab은 모달 안에서만 순환한다', async () => {
    const { user } = setup()
    const cancel = screen.getByRole('button', { name: '취소' })
    const confirm = screen.getByRole('button', { name: '삭제' })

    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    expect(screen.getByRole('button', { name: '열기 버튼' })).not.toHaveFocus()
  })

  it('오류가 있으면 알림으로 보여준다', () => {
    setup({ error: '삭제하지 못했습니다.' })

    expect(screen.getByRole('alert')).toHaveTextContent('삭제하지 못했습니다.')
  })

  it('danger 톤이어도 같은 접근성 이름으로 확인 버튼을 찾을 수 있다', () => {
    setup({ tone: 'danger' })

    expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled()
  })

  describe('pending', () => {
    it('버튼을 잠그고 Esc와 배경 클릭으로 닫히지 않는다', async () => {
      const { onCancel, user } = setup({ pending: true })

      expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
      await user.keyboard('{Escape}')
      await user.click(screen.getByRole('dialog').parentElement!)

      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('열고 닫을 때', () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>열기 버튼</button>
          <ConfirmDialog
            open={open}
            title="삭제할까요?"
            confirmLabel="삭제"
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </>
      )
    }

    it('열려 있는 동안 배경 스크롤을 잠그고 닫으면 풀어 준다', async () => {
      render(<Harness />)
      const user = userEvent.setup()
      expect(document.body.style.overflow).toBe('')

      await user.click(screen.getByRole('button', { name: '열기 버튼' }))
      expect(document.body.style.overflow).toBe('hidden')

      await user.keyboard('{Escape}')
      expect(document.body.style.overflow).toBe('')
    })

    it('닫으면 모달을 연 버튼으로 포커스를 돌려준다', async () => {
      render(<Harness />)
      const user = userEvent.setup()
      const opener = screen.getByRole('button', { name: '열기 버튼' })

      await user.click(opener)
      expect(screen.getByRole('button', { name: '취소' })).toHaveFocus()
      await user.keyboard('{Escape}')

      expect(opener).toHaveFocus()
    })
  })
})

describe('ConfirmDialog 애니메이션', () => {
  // 가짜 타이머에서는 userEvent가 멈추므로 동기 이벤트(fireEvent)를 쓴다.
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>열기 버튼</button>
        <ConfirmDialog
          open={open}
          title="삭제할까요?"
          confirmLabel="삭제"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </>
    )
  }

  const overlay = () => screen.getByRole('dialog').parentElement!
  const advance = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  const openDialog = () => {
    fireEvent.click(screen.getByRole('button', { name: '열기 버튼' }))
    advance(20)
  }
  const pressEscape = () =>
    fireEvent.keyDown(screen.getByRole('button', { name: '취소' }), {
      key: 'Escape',
    })

  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('열릴 때는 숨김 상태로 시작해 다음 프레임에 나타난다', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: '열기 버튼' }))
    expect(overlay()).toHaveAttribute('data-state', 'closed')
    expect(overlay()).toHaveClass('opacity-0')
    expect(screen.getByRole('dialog')).toHaveClass('scale-95', 'opacity-0')

    advance(20)

    expect(overlay()).toHaveAttribute('data-state', 'open')
    expect(overlay()).toHaveClass('opacity-100')
    expect(screen.getByRole('dialog')).toHaveClass('scale-100', 'opacity-100')
  })

  it('닫을 때는 바로 사라지는 상태가 되지만 애니메이션이 끝날 때까지 남아 있다', () => {
    render(<Harness />)
    openDialog()

    pressEscape()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(overlay()).toHaveAttribute('data-state', 'closed')
    expect(overlay()).toHaveClass('opacity-0')
    expect(screen.getByRole('dialog')).toHaveClass('scale-95', 'opacity-0')

    advance(149)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    advance(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('나가는 동안에는 눌리거나 포커스를 받지 않도록 비활성화한다', () => {
    render(<Harness />)
    openDialog()
    expect(overlay()).not.toHaveAttribute('inert')

    pressEscape()

    expect(overlay()).toHaveAttribute('inert')
  })

  it('나가는 중에도 배경 스크롤 잠금은 닫는 즉시 풀린다', () => {
    render(<Harness />)
    openDialog()
    expect(document.body.style.overflow).toBe('hidden')

    pressEscape()

    expect(document.body.style.overflow).toBe('')
  })

  it('나가는 중에 다시 열면 같은 모달이 다시 보인다', () => {
    render(<Harness />)
    openDialog()
    pressEscape()
    advance(50)

    fireEvent.click(screen.getByRole('button', { name: '열기 버튼' }))
    advance(20)

    expect(overlay()).toHaveAttribute('data-state', 'open')
    advance(500)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('동작 줄이기가 켜져 있으면 기다리지 않고 바로 사라진다', () => {
    mockReducedMotion(true)
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '열기 버튼' }))
    expect(overlay()).toHaveAttribute('data-state', 'open')

    pressEscape()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
