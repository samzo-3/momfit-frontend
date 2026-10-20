interface StatusIconProps {
  kind: 'success' | 'error' | 'loading'
}

// 입력칸 안에 두는 20px 상태 아이콘. 의미는 옆의 텍스트나 오류 안내가 전달하므로 스크린리더에서는 숨긴다.
function StatusIcon({ kind }: StatusIconProps) {
  const color =
    kind === 'success'
      ? 'text-success'
      : kind === 'error'
        ? 'text-danger'
        : 'text-ink-secondary'

  return (
    <svg
      aria-hidden="true"
      data-kind={kind}
      viewBox="0 0 20 20"
      className={`size-5 shrink-0 ${color} ${kind === 'loading' ? 'animate-spin motion-reduce:animate-none' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'loading' ? (
        <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5" />
      ) : (
        <>
          <circle cx="10" cy="10" r="8" />
          {kind === 'success' ? (
            <path d="m6.5 10.2 2.4 2.4 4.6-5" />
          ) : (
            <>
              <path d="M10 6v5" />
              <circle cx="10" cy="13.7" r="0.4" fill="currentColor" />
            </>
          )}
        </>
      )}
    </svg>
  )
}

export default StatusIcon
