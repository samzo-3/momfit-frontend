import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../shared/components/Button'
import ConfirmDialog from '../../../shared/components/ConfirmDialog'
import { clearSession } from '../auth-session'
import { errorMessage } from '../form-errors'
import { WITHDRAWAL_GRACE_DAYS } from '../withdrawal'
import { useDeleteAccount } from '../hooks/useAuthMutations'

// 되돌릴 수 없는 동작이므로, 모달로 한 번 더 확인을 받은 뒤에만 요청을 보낸다.
function DeleteAccountSection() {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const deleteAccount = useDeleteAccount()

  function handleCancel() {
    setConfirming(false)
    deleteAccount.reset()
  }

  function handleDelete() {
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        // 공개 화면(/)으로 이동이 화면에 반영된 뒤에 인증 상태를 지운다.
        // 먼저 지우거나 flushSync 없이 이동하면, 아직 떠 있는 보호 경로(/me)의 가드가
        // 로그인 화면으로 보내 버린다.
        await navigate('/', { replace: true, flushSync: true })
        clearSession()
      },
    })
  }

  return (
    <section
      aria-labelledby="delete-account-title"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
    >
      <div className="flex flex-col gap-3 lg:gap-1">
        <h2
          id="delete-account-title"
          className="text-lg font-semibold text-cocoa"
        >
          회원 탈퇴
        </h2>
        <p className="text-[15px] text-cocoa-secondary">
          탈퇴하면 {WITHDRAWAL_GRACE_DAYS}일 동안은 다시 로그인해 복구할 수
          있고, 그 이후에는 계정과 건강정보(출산 예정일, 운동 경험 등)가 완전히
          삭제돼요.
        </p>
      </div>
      <Button
        variant="danger-outline"
        onClick={() => setConfirming(true)}
        className="self-start lg:shrink-0 lg:self-center"
      >
        회원 탈퇴
      </Button>

      <ConfirmDialog
        open={confirming}
        title="정말 탈퇴하시겠어요?"
        description={`${WITHDRAWAL_GRACE_DAYS}일 안에 다시 로그인하면 복구할 수 있어요. 그 이후에는 계정과 건강정보가 삭제되며 되돌릴 수 없어요.`}
        confirmLabel={deleteAccount.isPending ? '탈퇴 중...' : '탈퇴하기'}
        tone="danger"
        pending={deleteAccount.isPending}
        error={deleteAccount.isError ? errorMessage(deleteAccount.error) : null}
        onConfirm={handleDelete}
        onCancel={handleCancel}
      />
    </section>
  )
}

export default DeleteAccountSection
