import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTransitionState } from '../lib/useTransitionState'
import Button from './Button'
import Notice from './Notice'

// 나가는 애니메이션(duration-150)이 끝난 뒤에 제거한다.
const EXIT_MS = 150

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  // 되돌릴 수 없는 동작은 danger로 표시한다.
  tone?: 'default' | 'danger'
  // 요청 중에는 닫기와 중복 확인을 막는다.
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

// 확인이 필요한 동작(로그아웃, 탈퇴)에 쓰는 모달.
// 열리면 취소 버튼에 포커스를 두고, Tab은 모달 안에서만 돌며, 닫히면 열기 전 위치로 포커스를 돌려준다.
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = '취소',
  tone = 'default',
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // 닫힐 때도 나가는 애니메이션이 끝날 때까지 화면에 남긴다.
  const { mounted, visible } = useTransitionState(open, EXIT_MS)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // 실수로 바로 확인하지 않도록 안전한 쪽(취소)에 포커스를 둔다.
    cancelRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [open])

  if (!mounted) return null

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!pending) onCancel()
      return
    }
    if (event.key !== 'Tab') return

    // 모달 밖으로 포커스가 나가지 않게 첫·마지막 버튼에서 순환시킨다.
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled)',
    )
    if (!focusable || focusable.length === 0) {
      event.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      data-state={visible ? 'open' : 'closed'}
      // 사라지는 동안에는 눌리거나 포커스를 받지 않게 한다.
      inert={!open}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        // 어두운 배경을 직접 눌렀을 때만 닫는다. (패널 안 클릭은 무시)
        if (event.target === event.currentTarget && !pending) onCancel()
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity motion-reduce:transition-none ${visible ? 'opacity-100 duration-200 ease-out' : 'opacity-0 duration-150 ease-in'}`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl transition-[opacity,scale,translate] motion-reduce:transition-none ${visible ? 'translate-y-0 scale-100 opacity-100 duration-200 ease-out' : 'translate-y-2 scale-95 opacity-0 duration-150 ease-in'}`}
      >
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-[15px] text-ink-secondary">
            {description}
          </p>
        )}
        {error && (
          <div className="mt-3">
            <Notice kind="error">{error}</Notice>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            ref={cancelRef}
            variant="brand-outline"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'brand'}
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
