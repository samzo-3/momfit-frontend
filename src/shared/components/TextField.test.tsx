import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextField from './TextField'

describe('TextField (기본)', () => {
  it('라벨이 입력칸 위에 있고 placeholder를 그대로 쓴다', () => {
    render(<TextField label="닉네임" placeholder="예시" />)

    const input = screen.getByLabelText('닉네임')
    expect(input).toHaveAttribute('placeholder', '예시')
    // 라벨 줄(label + 옆 요소)이 입력칸 바로 위에 있다.
    expect(input.previousElementSibling).toContainElement(
      screen.getByText('닉네임'),
    )
  })

  it('라벨 옆에 요소를 붙일 수 있고, 입력칸의 이름에는 포함되지 않는다', () => {
    render(
      <TextField
        label="출산 예정일"
        labelAddon={<button type="button">도움말</button>}
      />,
    )

    expect(
      screen.getByRole('textbox', { name: '출산 예정일' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '도움말' })).toBeInTheDocument()
  })

  it('힌트와 오류를 입력칸에 연결한다', () => {
    render(<TextField label="닉네임" hint="1~20자" error="필수입니다" />)

    const input = screen.getByLabelText('닉네임')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('1~20자 필수입니다')
    expect(screen.getByRole('alert')).toHaveTextContent('필수입니다')
  })

  it('오류가 없으면 진한 회색 테두리와 흰 배경이다', () => {
    render(<TextField label="닉네임" />)

    expect(screen.getByLabelText('닉네임')).toHaveClass(
      'border-field',
      'bg-white',
    )
    expect(screen.getByLabelText('닉네임')).not.toHaveAttribute('aria-invalid')
  })

  it('오류가 있으면 분홍 배경, 빨간 테두리·글자로 바뀐다', () => {
    render(<TextField label="닉네임" error="필수입니다" />)

    expect(screen.getByLabelText('닉네임')).toHaveClass(
      'border-danger',
      'bg-danger/6',
      'text-danger',
    )
    expect(screen.getByLabelText('닉네임')).not.toHaveClass('border-field')
  })

  it('오류 안내에는 느낌표 아이콘이 붙고 아이콘은 스크린리더에서 숨긴다', () => {
    render(<TextField label="닉네임" error="필수입니다" />)

    const alert = screen.getByRole('alert')
    const icon = alert.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(alert).toHaveTextContent('필수입니다')
    expect(alert).toHaveClass('text-danger', 'text-xs')
  })
})

describe('TextField (floatingLabel)', () => {
  it('라벨이 입력칸과 연결되어 있어 이름으로 찾을 수 있다', () => {
    render(<TextField label="아이디" floatingLabel />)

    expect(screen.getByLabelText('아이디')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '아이디' })).toBeInTheDocument()
  })

  it('라벨이 입력칸과 같은 영역 안에 겹쳐 놓인다', () => {
    render(<TextField label="아이디" floatingLabel />)

    const input = screen.getByLabelText('아이디')
    const label = screen.getByText('아이디')
    expect(label.parentElement).toBe(input.parentElement)
    expect(label.parentElement).toHaveClass('relative')
    expect(label).toHaveClass('absolute', 'pointer-events-none')
  })

  it('placeholder를 주지 않으면 입력 상태를 CSS로 알 수 있도록 공백을 둔다', () => {
    render(<TextField label="아이디" floatingLabel />)

    expect(screen.getByLabelText('아이디')).toHaveAttribute('placeholder', ' ')
  })

  it('placeholder를 주면 유지하되, 라벨이 올라간 포커스 상태에서만 보이게 한다', () => {
    render(
      <TextField label="아이디" floatingLabel placeholder="예) momfit01" />,
    )

    const input = screen.getByLabelText('아이디')
    expect(input).toHaveAttribute('placeholder', '예) momfit01')
    expect(input).toHaveClass(
      'placeholder:text-transparent',
      'focus:placeholder:text-ink-secondary/60',
    )
  })

  it('오류가 있으면 입력칸과 라벨이 모두 빨갛게 바뀐다', () => {
    render(<TextField label="아이디" floatingLabel error="올바르지 않습니다" />)

    expect(screen.getByLabelText('아이디')).toHaveClass(
      'bg-danger/6',
      'border-danger',
    )
    expect(screen.getByText('아이디')).toHaveClass('text-danger')
    expect(screen.getByRole('alert').querySelector('svg')).not.toBeNull()
  })

  it('칸 안에 놓일 때는 칸 높이와 상관없이 세로 중앙에 맞춘다', () => {
    render(<TextField label="아이디" floatingLabel />)

    const label = screen.getByText('아이디')
    // 고정 top 값이 아니라 50% 지점에서 자기 높이의 절반만큼 되돌려 중앙에 둔다.
    expect(label).toHaveClass(
      'peer-placeholder-shown:not-peer-focus:top-1/2',
      'peer-placeholder-shown:not-peer-focus:-translate-y-1/2',
    )
    expect(label.className).not.toContain('top-3.5')
  })

  it('위로 올라간 상태는 위쪽에 고정하고 자동완성 때도 그 상태를 유지한다', () => {
    render(<TextField label="아이디" floatingLabel />)

    expect(screen.getByText('아이디')).toHaveClass(
      'top-2',
      'translate-y-0',
      'text-xs',
      'peer-[:-webkit-autofill]:top-2!',
      'peer-[:-webkit-autofill]:translate-y-0!',
      'peer-[:-webkit-autofill]:text-xs!',
    )
  })

  it('입력칸이 라벨 공간만큼 위쪽 여백을 가진다', () => {
    render(<TextField label="아이디" floatingLabel />)

    expect(screen.getByLabelText('아이디')).toHaveClass('peer', 'pt-6', 'pb-2')
  })

  it('입력한 값은 그대로 입력된다', async () => {
    render(<TextField label="아이디" floatingLabel />)

    await userEvent.setup().type(screen.getByLabelText('아이디'), 'momfit01')

    expect(screen.getByLabelText('아이디')).toHaveValue('momfit01')
  })

  it('오류가 있으면 테두리를 빨갛게 하고 안내를 입력칸에 연결한다', () => {
    render(<TextField label="아이디" floatingLabel error="올바르지 않습니다" />)

    const input = screen.getByLabelText('아이디')
    expect(input).toHaveClass('border-danger')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('올바르지 않습니다')
  })

  it('힌트도 입력칸 아래에 보여준다', () => {
    render(<TextField label="아이디" floatingLabel hint="영문 소문자" />)

    expect(screen.getByLabelText('아이디')).toHaveAccessibleDescription(
      '영문 소문자',
    )
  })

  it('동작 줄이기에서는 라벨 이동 전환을 끈다', () => {
    render(<TextField label="아이디" floatingLabel />)

    expect(screen.getByText('아이디')).toHaveClass(
      'motion-reduce:transition-none',
    )
  })

  it('input 속성(type, autoComplete 등)을 그대로 전달한다', () => {
    render(
      <TextField
        label="비밀번호"
        floatingLabel
        type="password"
        autoComplete="current-password"
      />,
    )

    const input = screen.getByLabelText('비밀번호')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
  })
})

describe('TextField (trailing)', () => {
  it('입력칸 안 오른쪽에 요소를 둔다', () => {
    render(
      <TextField
        label="아이디"
        floatingLabel
        trailing={<button type="button">확인</button>}
      />,
    )

    const input = screen.getByLabelText('아이디')
    const trailing = screen.getByRole('button', { name: '확인' })
    expect(input.parentElement).toContainElement(trailing)
    expect(trailing.parentElement).toHaveClass('absolute', 'right-3')
  })

  it('내용이 없어도(null) 글자와 겹치지 않도록 오른쪽 여백을 항상 확보한다', () => {
    render(<TextField label="아이디" floatingLabel trailing={null} />)

    expect(screen.getByLabelText('아이디')).toHaveClass('pr-32')
  })

  it('trailing을 쓰지 않으면 오른쪽 여백을 늘리지 않는다', () => {
    render(<TextField label="아이디" floatingLabel />)

    expect(screen.getByLabelText('아이디')).not.toHaveClass('pr-32')
  })
})

describe('TextField (hideErrorMessage)', () => {
  it('오류 문구를 화면에서는 숨기고 스크린리더에만 알린다', () => {
    render(
      <TextField
        label="아이디"
        floatingLabel
        error="이미 사용 중입니다"
        hideErrorMessage
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('이미 사용 중입니다')
    expect(alert).toHaveClass('sr-only')
    expect(alert.querySelector('svg')).toBeNull()
  })

  it('오류 스타일과 접근성 오류 상태는 그대로 유지한다', () => {
    render(
      <TextField
        label="아이디"
        floatingLabel
        error="이미 사용 중입니다"
        hideErrorMessage
      />,
    )

    const input = screen.getByLabelText('아이디')
    expect(input).toHaveClass('border-danger', 'bg-danger/6')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('이미 사용 중입니다')
  })

  it('옵션이 없으면 문구를 아이콘과 함께 보여준다', () => {
    render(
      <TextField label="아이디" floatingLabel error="이미 사용 중입니다" />,
    )

    expect(screen.getByRole('alert')).not.toHaveClass('sr-only')
    expect(screen.getByRole('alert').querySelector('svg')).not.toBeNull()
  })
})
