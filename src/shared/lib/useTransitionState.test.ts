import { act, renderHook } from '@testing-library/react'
import { mockReducedMotion } from '../../test/motion'
import { useTransitionState } from './useTransitionState'

const EXIT_MS = 150

function setup(initialOpen: boolean) {
  return renderHook(({ open }) => useTransitionState(open, EXIT_MS), {
    initialProps: { open: initialOpen },
  })
}

// requestAnimationFrame과 타이머를 가짜 시간으로 진행시킨다.
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mockReducedMotion(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTransitionState', () => {
  it('닫혀 있으면 마운트하지 않는다', () => {
    const { result } = setup(false)

    expect(result.current).toEqual({ mounted: false, visible: false })
  })

  it('열리면 먼저 숨김 상태로 마운트하고, 다음 프레임에 보이게 한다', () => {
    const { result, rerender } = setup(false)

    rerender({ open: true })
    expect(result.current).toEqual({ mounted: true, visible: false })

    advance(20)
    expect(result.current).toEqual({ mounted: true, visible: true })
  })

  it('처음부터 열려 있어도 숨김 상태에서 시작해 전환이 일어난다', () => {
    const { result } = setup(true)

    expect(result.current).toEqual({ mounted: true, visible: false })
    advance(20)
    expect(result.current.visible).toBe(true)
  })

  it('닫으면 곧바로 숨기고, 나가는 애니메이션이 끝난 뒤 마운트를 해제한다', () => {
    const { result, rerender } = setup(true)
    advance(20)

    rerender({ open: false })
    expect(result.current).toEqual({ mounted: true, visible: false })

    advance(EXIT_MS - 1)
    expect(result.current.mounted).toBe(true)
    advance(1)
    expect(result.current).toEqual({ mounted: false, visible: false })
  })

  it('나가는 중에 다시 열면 마운트를 유지한 채 바로 다시 보인다', () => {
    const { result, rerender } = setup(true)
    advance(20)
    rerender({ open: false })
    advance(EXIT_MS / 2)

    rerender({ open: true })
    advance(20)
    advance(EXIT_MS * 2)

    expect(result.current).toEqual({ mounted: true, visible: true })
  })

  it('다시 열었다 닫는 것을 반복해도 매번 같은 순서로 동작한다', () => {
    const { result, rerender } = setup(false)

    for (let i = 0; i < 3; i += 1) {
      rerender({ open: true })
      expect(result.current).toEqual({ mounted: true, visible: false })
      advance(20)
      expect(result.current.visible).toBe(true)
      rerender({ open: false })
      advance(EXIT_MS)
      expect(result.current.mounted).toBe(false)
    }
  })

  describe('동작 줄이기', () => {
    beforeEach(() => mockReducedMotion(true))

    it('기다리지 않고 즉시 나타나고 사라진다', () => {
      const { result, rerender } = setup(false)

      rerender({ open: true })
      expect(result.current).toEqual({ mounted: true, visible: true })

      rerender({ open: false })
      expect(result.current).toEqual({ mounted: false, visible: false })
    })
  })

  it('프레임이 멈춘 환경에서도 타이머로 보이게 한다', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    const { result, rerender } = setup(false)

    rerender({ open: true })
    expect(result.current.visible).toBe(false)

    advance(50)
    expect(result.current).toEqual({ mounted: true, visible: true })
    vi.restoreAllMocks()
  })

  it('matchMedia가 없는 환경에서는 애니메이션을 쓴다', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    })
    const { result, rerender } = setup(false)

    rerender({ open: true })

    expect(result.current).toEqual({ mounted: true, visible: false })
  })
})
