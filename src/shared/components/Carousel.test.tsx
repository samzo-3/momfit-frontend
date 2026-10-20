import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockReducedMotion } from '../../test/motion'
import Carousel from './Carousel'

const SLIDES = [
  { id: 'a', content: <button>첫째 버튼</button> },
  { id: 'b', content: <button>둘째 버튼</button> },
  { id: 'c', content: <button>셋째 버튼</button> },
]

function renderCarousel(autoPlayMs = 0) {
  return render(
    <Carousel label="오늘의 추천" slides={SLIDES} autoPlayMs={autoPlayMs} />,
  )
}

// 지금 보이는(접근 가능한) 슬라이드의 이름
function currentSlide() {
  return screen
    .getByRole('group', { name: /\d \/ 3/ })
    .getAttribute('aria-label')
}

describe('Carousel', () => {
  it('이름이 있는 캐러셀 영역이고 첫 슬라이드만 접근 가능하다', () => {
    renderCarousel()

    expect(screen.getByRole('region', { name: '오늘의 추천' })).toHaveAttribute(
      'aria-roledescription',
      'carousel',
    )
    expect(currentSlide()).toBe('1 / 3')
    expect(
      screen.getByRole('button', { name: '첫째 버튼' }),
    ).toBeInTheDocument()
    // 보이지 않는 슬라이드의 버튼은 접근성 트리에서 빠진다.
    expect(
      screen.queryByRole('button', { name: '둘째 버튼' }),
    ).not.toBeInTheDocument()
  })

  it('다음·이전 버튼으로 넘기고 처음과 끝은 이어진다', async () => {
    renderCarousel()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    expect(currentSlide()).toBe('2 / 3')

    await user.click(screen.getByRole('button', { name: '이전 슬라이드' }))
    await user.click(screen.getByRole('button', { name: '이전 슬라이드' }))
    expect(currentSlide()).toBe('3 / 3')

    await user.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    expect(currentSlide()).toBe('1 / 3')
  })

  it('점을 누르면 그 슬라이드로 가고 현재 점이 표시된다', async () => {
    renderCarousel()
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: '3번째 슬라이드로 이동' }),
    )

    expect(currentSlide()).toBe('3 / 3')
    expect(
      screen.getByRole('button', { name: '3번째 슬라이드로 이동' }),
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('button', { name: '1번째 슬라이드로 이동' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('방향키로 넘긴다', async () => {
    renderCarousel()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '첫째 버튼' }))

    await user.keyboard('{ArrowRight}')
    expect(currentSlide()).toBe('2 / 3')

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(currentSlide()).toBe('3 / 3')
  })

  it('터치로 충분히 끌면 넘기고, 조금만 움직이면 넘기지 않는다', () => {
    renderCarousel()
    const track = screen.getByTestId('carousel-track')
      .parentElement as HTMLElement

    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 200 })
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 190 })
    expect(currentSlide()).toBe('1 / 3')

    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 200 })
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 100 })
    expect(currentSlide()).toBe('2 / 3')

    fireEvent.pointerDown(track, { pointerType: 'touch', clientX: 100 })
    fireEvent.pointerUp(track, { pointerType: 'touch', clientX: 200 })
    expect(currentSlide()).toBe('1 / 3')
  })

  it('마우스로 끄는 동작은 넘기지 않는다', () => {
    renderCarousel()
    const track = screen.getByTestId('carousel-track')
      .parentElement as HTMLElement

    fireEvent.pointerDown(track, { pointerType: 'mouse', clientX: 200 })
    fireEvent.pointerUp(track, { pointerType: 'mouse', clientX: 50 })

    expect(currentSlide()).toBe('1 / 3')
  })

  it('슬라이드가 하나면 조작 버튼을 보여주지 않는다', () => {
    render(<Carousel label="하나" slides={SLIDES.slice(0, 1)} />)

    expect(
      screen.queryByRole('button', { name: '다음 슬라이드' }),
    ).not.toBeInTheDocument()
  })
})

describe('Carousel (자동 넘김)', () => {
  beforeEach(() => {
    mockReducedMotion(false)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

  it('정해진 시간마다 다음 슬라이드로 넘어간다', () => {
    renderCarousel(5000)

    advance(4999)
    expect(currentSlide()).toBe('1 / 3')
    advance(1)
    expect(currentSlide()).toBe('2 / 3')
    advance(5000)
    expect(currentSlide()).toBe('3 / 3')
  })

  it('직접 넘기면 그 시점부터 다시 센다', () => {
    renderCarousel(5000)
    advance(4000)

    fireEvent.click(screen.getByRole('button', { name: '다음 슬라이드' }))
    advance(4000)

    expect(currentSlide()).toBe('2 / 3')
    advance(1000)
    expect(currentSlide()).toBe('3 / 3')
  })

  it('마우스를 올려 두면 멈추고 내리면 다시 넘어간다', () => {
    renderCarousel(5000)
    const region = screen.getByRole('region', { name: '오늘의 추천' })

    fireEvent.mouseEnter(region)
    advance(20000)
    expect(currentSlide()).toBe('1 / 3')

    fireEvent.mouseLeave(region)
    advance(5000)
    expect(currentSlide()).toBe('2 / 3')
  })

  it('안에 포커스가 있으면 멈추고 벗어나면 다시 넘어간다', () => {
    renderCarousel(5000)
    const button = screen.getByRole('button', { name: '첫째 버튼' })

    fireEvent.focus(button)
    advance(20000)
    expect(currentSlide()).toBe('1 / 3')

    fireEvent.blur(button, { relatedTarget: document.body })
    advance(5000)
    expect(currentSlide()).toBe('2 / 3')
  })

  it('자동으로 넘어가는 동안은 읽어 주지 않고, 멈추면(마우스를 올리면) 바뀔 때 알린다', () => {
    renderCarousel(5000)
    const live = () =>
      screen
        .getByTestId('carousel-track')
        .parentElement?.getAttribute('aria-live')

    expect(live()).toBe('off')
    fireEvent.mouseEnter(screen.getByRole('region', { name: '오늘의 추천' }))
    expect(live()).toBe('polite')
  })

  it('동작 줄이기 설정이면 자동으로 넘기지 않고 전환 효과도 없다', () => {
    mockReducedMotion(true)
    renderCarousel(5000)

    advance(20000)

    expect(currentSlide()).toBe('1 / 3')
    expect(screen.getByTestId('carousel-track')).not.toHaveClass(
      'transition-transform',
    )
  })

  it('자동으로 넘길 때도 멈춤·시작 버튼은 두지 않는다', () => {
    renderCarousel(5000)

    expect(
      screen.queryByRole('button', { name: /자동 넘김/ }),
    ).not.toBeInTheDocument()
  })
})
