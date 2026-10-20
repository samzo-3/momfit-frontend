import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import StatusIcon from './StatusIcon'

interface InfoTipProps {
  // 툴팁에 보여줄 설명
  text: string
  // 아이콘 버튼의 이름. 스크린리더는 이 이름 뒤에 설명(text)을 함께 읽는다.
  label?: string
  // help: 회색 물음표(도움말, 아래쪽 어두운 말풍선), error: 빨간 느낌표(오류 사유, 아이콘 오른쪽의 흰 말풍선)
  variant?: 'help' | 'error'
  // 나타난 직후 이 시간(ms) 동안은 자동으로 열어 둔다. (오류 사유를 바로 알아챌 수 있게)
  autoOpenFor?: number
}

// 아이콘 도움말. 마우스를 올리거나 포커스를 받거나 눌러서(터치) 열고, Esc로 닫는다.
function InfoTip({
  text,
  label,
  variant = 'help',
  autoOpenFor = 0,
}: InfoTipProps) {
  const tooltipId = useId()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [auto, setAuto] = useState(autoOpenFor > 0)
  // 마우스·터치로 눌러서 생긴 포커스인지. 그런 포커스는 "열림" 상태로 치지 않는다.
  // (그렇지 않으면 눌러서 열고 다시 눌러도 포커스 때문에 닫히지 않는다)
  const pointerFocus = useRef(false)
  const open = hovered || focused || pinned || auto

  useEffect(() => {
    if (autoOpenFor <= 0) return
    const timer = setTimeout(() => setAuto(false), autoOpenFor)
    return () => clearTimeout(timer)
  }, [autoOpenFor])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      setHovered(false)
      setPinned(false)
      setAuto(false)
    }
  }

  const isError = variant === 'error'

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label ?? (isError ? '오류 안내' : '도움말')}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onPointerDown={() => {
          pointerFocus.current = true
        }}
        onClick={() => setPinned((value) => !value)}
        onFocus={() => {
          if (!pointerFocus.current) setFocused(true)
        }}
        onBlur={() => {
          pointerFocus.current = false
          setFocused(false)
          setPinned(false)
        }}
        onKeyDown={handleKeyDown}
        className={
          isError
            ? 'grid place-items-center rounded-full'
            : 'grid size-5 place-items-center rounded-full bg-cocoa-secondary text-xs leading-none font-semibold text-white'
        }
      >
        {isError ? <StatusIcon kind="error" /> : '?'}
      </button>
      {/* 항상 DOM에 두어 설명이 버튼에 연결되게 하고, 닫혀 있을 때는 hidden으로 숨긴다. */}
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!open}
        className={`absolute z-20 w-max max-w-64 rounded-lg px-3 py-2 text-xs font-normal shadow-lg ${isError ? 'top-1/2 left-full ml-2 -translate-y-1/2 border border-primary-strong bg-white text-cocoa' : 'top-full left-0 mt-2 bg-cocoa text-white'}`}
      >
        {text}
      </span>
    </span>
  )
}

export default InfoTip
