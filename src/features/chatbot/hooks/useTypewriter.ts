import { useEffect, useRef, useState } from 'react'

const TICK_MS = 25
// 긴 답변도 약 3초 안에 끝나도록 한 번에 보여주는 글자 수를 늘린다. (25ms x 120번)
const MAX_TICKS = 120

// 글자가 한 글자씩 나타나는 효과. 보여줄 만큼의 앞부분 글자를 돌려준다.
// active가 false이면 처음부터 전체 글을 돌려주고, 끝까지 나타나면 onDone을 한 번 부른다.
export function useTypewriter(
  text: string,
  active: boolean,
  onDone: () => void,
): string {
  const [count, setCount] = useState(0)
  // 최신 콜백을 쓰되 타이머를 다시 만들지 않도록 ref에 둔다.
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!active) return
    const step = Math.max(1, Math.ceil(text.length / MAX_TICKS))
    const timer = setInterval(() => {
      setCount((previous) => Math.min(text.length, previous + step))
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [active, text])

  const finished = count >= text.length
  useEffect(() => {
    if (active && finished) onDoneRef.current()
  }, [active, finished])

  return active ? text.slice(0, count) : text
}
