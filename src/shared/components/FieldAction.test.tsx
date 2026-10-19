import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FieldAction from './FieldAction'

describe('FieldAction', () => {
  it('폼 안에서 눌러도 제출하지 않는 버튼이다', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <FieldAction>확인</FieldAction>
      </form>,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: '확인' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '확인' })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('비활성이면 클릭을 막고 흐린 글자가 된다', async () => {
    const onClick = vi.fn()
    render(
      <FieldAction disabled onClick={onClick}>
        재발송
      </FieldAction>,
    )

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: '재발송' }))

    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '재발송' })).toHaveClass(
      'disabled:text-ink-secondary/60',
    )
  })

  it('줄바꿈 없이 한 줄로 보인다', () => {
    render(<FieldAction>인증 코드 발송</FieldAction>)

    expect(screen.getByRole('button')).toHaveClass('whitespace-nowrap')
  })
})
