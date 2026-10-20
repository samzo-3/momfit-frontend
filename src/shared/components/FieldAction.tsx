import type { ComponentProps } from 'react'

// 입력칸 안 오른쪽(TextField의 trailing)에 두는 작은 텍스트 버튼. 폼 제출을 일으키지 않는다.
function FieldAction({
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      type={type}
      {...props}
      className={`rounded-md px-1.5 py-1 text-sm font-medium whitespace-nowrap text-brand-text hover:bg-brand/10 disabled:cursor-not-allowed disabled:text-cocoa-secondary/60 disabled:hover:bg-transparent ${className ?? ''}`}
    />
  )
}

export default FieldAction
