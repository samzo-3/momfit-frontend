import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string
  error?: string | null
  hint?: string
  // true이면 라벨을 입력칸 안에 두고, 입력을 시작하거나 포커스를 받으면 위로 작게 올린다.
  // placeholder를 함께 주면 포커스를 받아 라벨이 올라간 뒤에만 보인다.
  floatingLabel?: boolean
  // 입력칸 안 오른쪽에 두는 요소(상태 아이콘, 작은 버튼 등). floatingLabel에서만 쓴다.
  // 값을 주면(null 포함) 글자와 겹치지 않도록 오른쪽 여백을 항상 확보해, 내용이 바뀌어도 글자가 움직이지 않는다.
  trailing?: ReactNode
  // true이면 오류 문구를 화면에는 보이지 않게 하고 스크린리더에만 알린다. (오류 사유를 툴팁 등 다른 곳에 보여줄 때)
  hideErrorMessage?: boolean
  // 라벨 옆에 붙이는 요소(예: 도움말 툴팁). 라벨이 칸 위에 있는 기본 모양에서만 쓴다.
  labelAddon?: ReactNode
}

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-px size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.5v4" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TextField({
  label,
  error,
  hint,
  floatingLabel,
  trailing,
  hideErrorMessage,
  labelAddon,
  placeholder,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  // 오류 상태: 연한 분홍 배경, 빨간 테두리와 글자. 평소에는 진한 회색 테두리.
  const tone = error
    ? 'border-danger bg-danger/6 text-danger'
    : 'border-field bg-white'

  const messages = (
    <>
      {hint && (
        <p id={hintId} className="text-xs text-ink-secondary">
          {hint}
        </p>
      )}
      {error &&
        (hideErrorMessage ? (
          <p id={errorId} role="alert" className="sr-only">
            {error}
          </p>
        ) : (
          <p
            id={errorId}
            role="alert"
            className="flex items-start gap-1.5 text-xs text-danger"
          >
            <ErrorIcon />
            <span>{error}</span>
          </p>
        ))}
    </>
  )

  if (floatingLabel) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          {/* placeholder가 없어도 공백을 둔다: 값이 비었는지를 CSS(:placeholder-shown)로 알기 위한 장치다.
              직접 준 placeholder는 평소엔 투명하게 두고 포커스를 받았을 때만 보인다. */}
          <input
            {...inputProps}
            id={id}
            placeholder={placeholder ?? ' '}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`peer w-full rounded-xl border px-4 pt-6 pb-2 text-[17px] placeholder:text-transparent focus:placeholder:text-ink-secondary/60 disabled:bg-surface disabled:text-ink-secondary ${trailing !== undefined ? 'pr-32' : ''} ${tone} ${className ?? ''}`}
          />
          {trailing !== undefined && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              {trailing}
            </div>
          )}
          {/* 기본은 위로 올라간 작은 라벨. 비어 있고 포커스가 없을 때만 칸 안에 크게 놓고,
              이때는 칸 높이가 달라져도 세로 중앙에 오도록 top 50% + translate -50%로 맞춘다. */}
          <label
            htmlFor={id}
            className={`pointer-events-none absolute top-2 left-4 translate-y-0 text-xs transition-all duration-150 ease-out peer-placeholder-shown:not-peer-focus:top-1/2 peer-placeholder-shown:not-peer-focus:-translate-y-1/2 peer-placeholder-shown:not-peer-focus:text-[17px] peer-[:-webkit-autofill]:top-2! peer-[:-webkit-autofill]:translate-y-0! peer-[:-webkit-autofill]:text-xs! motion-reduce:transition-none ${error ? 'text-danger' : 'text-ink-secondary'}`}
          >
            {label}
          </label>
        </div>
        {messages}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {labelAddon}
      </div>
      <input
        {...inputProps}
        id={id}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`rounded-xl border px-4 py-3 text-[17px] placeholder:text-ink-secondary/60 disabled:bg-surface disabled:text-ink-secondary ${tone} ${className ?? ''}`}
      />
      {messages}
    </div>
  )
}

export default TextField
