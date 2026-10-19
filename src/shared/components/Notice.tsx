import type { ReactNode } from 'react'

interface NoticeProps {
  kind: 'error' | 'success'
  children: ReactNode
}

// 폼 전체에 대한 메시지. 오류는 role=alert, 성공 안내는 role=status로 스크린리더에 알린다.
function Notice({ kind, children }: NoticeProps) {
  return kind === 'error' ? (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  ) : (
    <p role="status" className="text-sm text-success">
      {children}
    </p>
  )
}

export default Notice
