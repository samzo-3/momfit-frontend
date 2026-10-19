import { useEffect, useState } from 'react'

const ENTER_FALLBACK_MS = 50

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

interface TransitionState {
  // false가 되면 DOM에서 제거해도 된다. 나가는 애니메이션이 끝날 때까지 true로 남는다.
  mounted: boolean
  // 보이는 상태의 스타일을 입힐지 여부. 열리면 다음 프레임에 true, 닫히면 곧바로 false가 된다.
  visible: boolean
}

// 나타날 때와 사라질 때 CSS 전환(transition)이 일어나도록 마운트 시점을 조절한다.
// - 열기: 먼저 숨김 상태로 그린 뒤 다음 프레임에 visible을 켜서 전환이 시작되게 한다.
// - 닫기: visible을 끄고, exitMs 뒤에 마운트를 해제해 나가는 애니메이션을 끝까지 보여준다.
// "동작 줄이기" 설정이면 기다리지 않고 즉시 나타나고 사라진다.
export function useTransitionState(
  open: boolean,
  exitMs: number,
): TransitionState {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const instant = prefersReducedMotion()

  // 열릴 때 마운트를 먼저 켠다. (렌더 중에 파생 상태를 맞추는 권장 패턴)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (instant) return

    if (open) {
      const enter = () => setEntered(true)
      const frame = requestAnimationFrame(enter)
      // 프레임이 멈춘 환경(백그라운드, 화면 밖 등)에서도 투명한 채 남지 않도록 타이머로도 켠다.
      const fallback = setTimeout(enter, ENTER_FALLBACK_MS)
      return () => {
        cancelAnimationFrame(frame)
        clearTimeout(fallback)
      }
    }
    const timer = setTimeout(() => {
      setMounted(false)
      setEntered(false)
    }, exitMs)
    return () => clearTimeout(timer)
  }, [open, exitMs, instant])

  if (instant) return { mounted: open, visible: open }
  return { mounted, visible: open && entered }
}
