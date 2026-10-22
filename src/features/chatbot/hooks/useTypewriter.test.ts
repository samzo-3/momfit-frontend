import { act, renderHook } from '@testing-library/react'
import { useTypewriter } from './useTypewriter'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTypewriter', () => {
  it('효과를 끄면 처음부터 전체 글을 돌려주고 끝났다고 알리지 않는다', () => {
    const onDone = vi.fn()

    const { result } = renderHook(() =>
      useTypewriter('안녕하세요', false, onDone),
    )

    expect(result.current).toBe('안녕하세요')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onDone).not.toHaveBeenCalled()
  })

  it('짧은 글은 25ms마다 한 글자씩 나타나고 끝나면 한 번만 알린다', () => {
    const onDone = vi.fn()
    const { result } = renderHook(() =>
      useTypewriter('안녕하세요', true, onDone),
    )

    expect(result.current).toBe('')
    act(() => {
      vi.advanceTimersByTime(25)
    })
    expect(result.current).toBe('안')
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('안녕하')
    expect(onDone).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('안녕하세요')
    expect(onDone).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('긴 글도 약 3초 안에 끝난다', () => {
    const onDone = vi.fn()
    const text = '가'.repeat(900)
    const { result } = renderHook(() => useTypewriter(text, true, onDone))

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(result.current.length).toBeLessThan(text.length)

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe(text)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('빈 글은 바로 끝났다고 알린다', () => {
    const onDone = vi.fn()

    renderHook(() => useTypewriter('', true, onDone))

    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
