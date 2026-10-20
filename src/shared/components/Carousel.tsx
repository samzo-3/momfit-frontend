import {
  useEffect,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { prefersReducedMotion } from '../lib/useTransitionState'

export interface CarouselSlide {
  id: string
  content: ReactNode
}

interface CarouselProps {
  // 스크린리더가 읽는 캐러셀 이름 (예: "오늘의 추천")
  label: string
  slides: CarouselSlide[]
  // 이 시간(ms)마다 다음 슬라이드로 자동으로 넘긴다. 0이면 자동으로 넘기지 않는다.
  autoPlayMs?: number
  className?: string
}

const SWIPE_DISTANCE = 50

function ArrowIcon({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === 'prev' ? 'M10 3 5 8l5 5' : 'm6 3 5 5-5 5'} />
    </svg>
  )
}

const CONTROL =
  'grid size-8 place-items-center rounded-full text-cocoa-secondary transition-colors hover:bg-primary-strong/60 hover:text-cocoa'

// 슬라이드를 한 장씩 보여 주는 캐러셀. 이전·다음 버튼, 점, 키보드(←/→), 터치 스와이프로 넘기고
// 자동으로도 넘긴다. 마우스를 올리거나 포커스가 안에 있으면 자동 넘김이 멈추고,
// "동작 줄이기" 설정이면 처음부터 자동으로 넘기지 않고 전환 애니메이션도 없다.
function Carousel({ label, slides, autoPlayMs = 0, className }: CarouselProps) {
  const reduced = prefersReducedMotion()
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [swipeStart, setSwipeStart] = useState<number | null>(null)

  // 동작 줄이기 설정이면 처음부터 자동으로 넘기지 않는다.
  const autoAdvancing =
    autoPlayMs > 0 && !reduced && !hovered && !focused && count > 1

  const goTo = (target: number) => setIndex((target + count) % count)

  useEffect(() => {
    if (!autoAdvancing) return
    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % count),
      autoPlayMs,
    )
    // index가 바뀔 때마다 다시 시작해, 직접 넘긴 직후에는 곧바로 다시 넘어가지 않는다.
    return () => clearTimeout(timer)
  }, [autoAdvancing, autoPlayMs, count, index])

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') goTo(index - 1)
    else if (event.key === 'ArrowRight') goTo(index + 1)
  }

  function handleBlur(event: FocusEvent) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  // 마우스 끌기는 글자 선택과 겹치므로 터치·펜 입력만 스와이프로 본다.
  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse') setSwipeStart(event.clientX)
  }

  function handlePointerUp(event: PointerEvent) {
    if (swipeStart === null) return
    const distance = event.clientX - swipeStart
    setSwipeStart(null)
    if (Math.abs(distance) < SWIPE_DISTANCE) return
    goTo(distance < 0 ? index + 1 : index - 1)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={className}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <div
        className="overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setSwipeStart(null)}
        // 자동으로 넘어가는 동안에는 바뀔 때마다 읽지 않고, 멈춘 뒤에만 알린다.
        aria-live={autoAdvancing ? 'off' : 'polite'}
      >
        <div
          data-testid="carousel-track"
          className={`flex ${reduced ? '' : 'transition-transform duration-500 ease-out'}`}
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, position) => (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${position + 1} / ${count}`}
              // 보이지 않는 슬라이드의 버튼·링크는 Tab과 스크린리더에서 뺀다.
              inert={position !== index}
              aria-hidden={position !== index}
              className="w-full shrink-0"
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="이전 슬라이드"
            onClick={() => goTo(index - 1)}
            className={CONTROL}
          >
            <ArrowIcon direction="prev" />
          </button>
          <div className="flex items-center gap-1">
            {slides.map((slide, position) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`${position + 1}번째 슬라이드로 이동`}
                aria-current={position === index ? 'true' : undefined}
                onClick={() => goTo(position)}
                className="grid size-6 place-items-center rounded-full"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${position === index ? 'w-5 bg-brand' : 'w-2 bg-primary-strong'}`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="다음 슬라이드"
            onClick={() => goTo(index + 1)}
            className={CONTROL}
          >
            <ArrowIcon direction="next" />
          </button>
        </div>
      )}
    </section>
  )
}

export default Carousel
